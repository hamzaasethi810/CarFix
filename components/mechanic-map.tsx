"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreGlMap,
  Marker as MapLibreMarker,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, Marker } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  FALLBACK_ATTRIBUTION,
  fallbackStyleUrl,
  isQuotaFailure,
  mapStyleUrl,
} from "@/lib/map/style";

/*
  MapLibre locates its own worker script from `import.meta.url` at run time,
  and falls back to an empty URL — silently pointing the worker at the page
  itself, which fails to parse as a module and dies instantly — whenever a
  bundler's runtime module URL isn't a plain http(s) one (Turbopack's dev
  server URLs aren't). Pointing it at a static copy sidesteps that resolution
  entirely rather than depending on it. Without this, sources never finish
  loading: querySourceFeatures always returns empty and nothing ever renders.
*/
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

export type MapMechanic = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  experienceCount: number;
  verifiedCount: number;
  avgRating: number | null;
  fromPrice: number | null;
};

const SOURCE_ID = "mechanics";
const LAYER_ID = "mechanics-unrendered"; // See setupSource — kept invisible on purpose.

// A flat conversion, not a great-circle one — this is a soft leash, not a
// navigation calculation, and the error it introduces at the radii this site
// searches (tens of miles) is negligible next to the slack already built
// into REST_SLACK below.
const MILES_PER_DEGREE_LAT = 69;

/*
  How far past the searched radius the camera may rest before it eases back
  — a little wider than the radius itself so a drag that only grazes the
  edge doesn't spring immediately, without loosening the lock enough that
  "bounded to the search" stops meaning anything.

  This is deliberately NOT implemented with MapLibre's own `maxBounds`.
  `maxBounds` doesn't just clamp panning — its constrain function also
  forces the camera to zoom IN whenever the bound box is narrower on screen
  than the viewport (see `defaultConstrain` in maplibre-gl's mercator
  transform: "shouldZoomIn" bumps zoom until the box fills the width). A
  20-mile-radius box is routinely narrower than a desktop viewport at the
  zoom `setupSource`'s own `fitBounds` already chose to show the actual
  results — so `maxBounds` fought that zoom outright, and measuring it
  (mouse-drag a screen width, watch a marker barely move) showed panning
  reduced to a few hundred pixels of the tens of thousands requested. That
  is "stopping dead" wearing a different disguise, not a fix for it.

  The lock here is enforced on "moveend" instead — after a drag (including
  its momentum) has actually settled, not while it's in flight — which is
  what turns a spring into a wall vs. leaves it a spring: nothing clamps
  mid-gesture, so the drag itself is exactly as free as an unlocked map, and
  only the resting position is corrected. The gap this accepts is a single
  continuous drag that never releases before crossing the whole boundary —
  a shape no real finger or mouse stroke covering a phone- or desktop-sized
  viewport produces, but a scripted one could. That is an acceptable trade
  against a UI-level control: the actual ceiling against a scripted client
  is server-side (mechanicSearchSchema's limit cap — see
  tests/map-limit.test.ts), same as any other API in this app.
*/
const REST_SLACK = 1.15;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** A roughly-square box `radiusMiles` out from `center` in every direction. */
function boundsForRadius(center: { lat: number; lng: number }, radiusMiles: number): LngLatBounds {
  const latDelta = radiusMiles / MILES_PER_DEGREE_LAT;
  const milesPerDegreeLng = MILES_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180);
  // Guards the pole-adjacent limit where a degree of longitude is nearly
  // zero miles wide, which would otherwise blow the box out to the whole
  // planet's width for a search nobody asked to be that wide.
  const lngDelta = radiusMiles / Math.max(milesPerDegreeLng, 1);
  return new LngLatBounds(
    [center.lng - lngDelta, center.lat - latDelta],
    [center.lng + lngDelta, center.lat + latDelta],
  );
}

// A quota switch only needs to survive the tab, not the visit — the quota
// resets monthly, and localStorage would strand a returning visitor on the
// fallback for weeks after MapTiler is serving again.
const FALLBACK_SESSION_KEY = "gaari:map-tile-fallback";

function startedOnFallback(): boolean {
  try {
    return sessionStorage.getItem(FALLBACK_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/*
  MapLibre GL with a dark vector style (MapTiler when a key is configured,
  OpenFreeMap otherwise — see lib/map/style.ts). The glass panels need a dark
  ground to read against, which is why both style options are dark rather than
  the desaturated-light-raster trick the Leaflet version used.

  Clustering is native: a GeoJSON source with `cluster: true` groups pins in
  the browser, and the rendered bubbles are plain HTML markers built from
  whatever the source reports for the current viewport — there is no
  marker-cluster plugin to port.

  MapLibre touches `window` at import time same as Leaflet did, but unlike
  Leaflet it is safe to import at module scope here because this file already
  carries "use client" and only ever runs after mount, never during SSR (the
  page imports it via next/dynamic with ssr: false).
*/
export function MechanicMap({
  mechanics,
  selectedId,
  onSelect,
  center = null,
  radiusMiles = 0,
  className = "",
}: {
  mechanics: MapMechanic[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** The anchor of the current search. Bounds the map to it — see the lock effect below. */
  center?: { lat: number; lng: number } | null;
  /** The searched radius, in miles. Ignored while `center` is null. */
  radiusMiles?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const fallbackAppliedRef = useRef(false);

  // Markers are (re)drawn from source data on every viewport change, so they
  // capture whichever onSelect/mechanics/selectedId existed at that moment.
  // Keeping these in refs, updated in an effect, lets the map's event
  // handlers always see current values without being re-registered.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const mechanicsRef = useRef(mechanics);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    mechanicsRef.current = mechanics;
    selectedIdRef.current = selectedId;
  }, [mechanics, selectedId]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    fallbackAppliedRef.current = startedOnFallback();

    const map = new MapLibreGlMap({
      container: containerRef.current,
      style: fallbackAppliedRef.current
        ? fallbackStyleUrl()
        : mapStyleUrl(process.env.NEXT_PUBLIC_MAPTILER_KEY),
      center: [-77.15, 38.9],
      zoom: 10,
      /*
        customAttribution because the keyless fallback style declares none of
        its own, so the control would render empty on that path — credit that
        looks given but is not. MapTiler declares its own and is unaffected.
      */
      attributionControl: {
        compact: false,
        customAttribution: fallbackAppliedRef.current ? FALLBACK_ATTRIBUTION : undefined,
      },
      // No rotation/pitch in this migration — the Leaflet map never had
      // either, and adding them here is redesign scope, not migration scope.
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
    });

    // Background clicks reach here; pin/cluster markers are separate DOM
    // elements layered over the canvas, not part of it, so their own click
    // handlers fire instead of this one.
    map.on("click", () => onSelectRef.current(null));

    /*
      Quota fallback (Step 5). 402/429 mean the paid source is spent for the
      rest of this billing period; anything else (404, a dropped request) is
      a one-off and must not throw away a working paid source. The fallback
      source is keyless, so this only ever fires for MapTiler requests.
    */
    map.on("error", (e) => {
      const status = (e.error as { status?: number } | undefined)?.status;
      if (status === undefined || !isQuotaFailure(status)) return;
      if (fallbackAppliedRef.current) return; // switch once
      fallbackAppliedRef.current = true;
      try {
        sessionStorage.setItem(FALLBACK_SESSION_KEY, "1");
      } catch {
        // Private-browsing contexts can throw on storage access; the in-memory
        // guard above still prevents repeat switches for the rest of this page life.
      }
      map.setStyle(fallbackStyleUrl());
    });

    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Rebuild the clustered source whenever the result set changes, and redraw
  // the HTML markers whenever the visible viewport, or the source data, does.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const toFeatureCollection = (): FeatureCollection => ({
      type: "FeatureCollection",
      features: mechanics.map((m) => ({
        type: "Feature",
        properties: { id: m.id },
        geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      })),
    });

    function renderMarkers() {
      const map = mapRef.current;
      if (!map) return;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;

      const features = map.querySourceFeatures(SOURCE_ID) as MapGeoJSONFeature[];
      const seen = new Set<string>();

      for (const feature of features) {
        const coords = (feature.geometry as Point).coordinates as [number, number];
        const props = feature.properties as Record<string, unknown>;

        if (props.cluster) {
          const clusterId = props.cluster_id as number;
          const key = `c:${clusterId}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const count = props.point_count as number;
          const size = count < 10 ? "cluster-sm" : count < 50 ? "cluster-md" : "cluster-lg";

          let marker = markersRef.current.get(key);
          if (!marker) {
            const el = document.createElement("div");
            el.className = `cluster ${size}`;
            el.textContent = String(count);
            el.tabIndex = 0;
            el.setAttribute("role", "button");
            el.setAttribute("aria-label", `${count} mechanics in this area, zoom in to see them`);
            const expand = () => {
              void source.getClusterExpansionZoom(clusterId).then((zoom) => {
                map.easeTo({ center: coords, zoom });
              });
            };
            // Markers are DOM siblings of the canvas, not children of it, but
            // MapLibre's own "click" listener is bound above both in the DOM
            // tree — so a marker click still bubbles into it unless stopped
            // here, immediately undoing the selection this click just made.
            el.addEventListener("click", (ev) => {
              ev.stopPropagation();
              expand();
            });
            el.addEventListener("keydown", (ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                expand();
              }
            });
            marker = new MapLibreMarker({ element: el }).setLngLat(coords).addTo(map);
            markersRef.current.set(key, marker);
          } else {
            marker.setLngLat(coords);
            const el = marker.getElement();
            el.className = `cluster ${size}`;
            el.textContent = String(count);
          }
          continue;
        }

        const id = props.id as string;
        const key = `p:${id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const m = mechanicsRef.current.find((x) => x.id === id);
        if (!m) continue;
        const selected = m.id === selectedIdRef.current;

        let marker = markersRef.current.get(key);
        if (!marker) {
          const el = document.createElement("div");
          el.tabIndex = 0;
          el.setAttribute("role", "button");
          el.title = `${m.name} — ${m.city}, ${m.state}`;
          el.setAttribute("aria-label", `${m.name}, ${m.city}, ${m.state}`);
          // The pin shape reads without relying on its colour.
          el.innerHTML = `<div class="pin"><span>🔧</span></div>`;
          const select = () => onSelectRef.current(id);
          // See the cluster branch above — without stopPropagation this click
          // also reaches the map's own background-click handler, which clears
          // the selection this same click just set.
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            select();
          });
          el.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              select();
            }
          });
          marker = new MapLibreMarker({ element: el, anchor: "center" })
            .setLngLat(coords)
            .addTo(map);
          markersRef.current.set(key, marker);
        } else {
          marker.setLngLat(coords);
        }

        marker.getElement().querySelector(".pin")?.classList.toggle("pin-selected", selected);
      }

      for (const [key, marker] of markersRef.current) {
        if (!seen.has(key)) {
          marker.remove();
          markersRef.current.delete(key);
        }
      }
    }

    function setupSource() {
      const map = mapRef.current;
      if (!map) return;
      const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(toFeatureCollection());
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: toFeatureCollection(),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 55,
        });
      }
      /*
        querySourceFeatures only returns results for tiles MapLibre has
        actually built, and a source with no layer referencing it is never
        considered "in use" — its tiles never get built, so it silently
        stays empty. This layer is never seen (radius/opacity 0); it exists
        only to make the source used so the clustered tiles load, since every
        visible pin/cluster is a separate HTML Marker drawn by renderMarkers.
      */
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: { "circle-radius": 0, "circle-opacity": 0 },
        });
      }
      renderMarkers();

      if (mechanics.length > 0) {
        const first: [number, number] = [mechanics[0].lng, mechanics[0].lat];
        const bounds = mechanics.reduce(
          (b, m) => b.extend([m.lng, m.lat]),
          new LngLatBounds(first, first),
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, animate: false });
      }
    }

    function onSourceData(e: { sourceId?: string; isSourceLoaded?: boolean }) {
      if (e.sourceId === SOURCE_ID && e.isSourceLoaded) renderMarkers();
    }

    // "style.load" covers both the map's first style and any style swapped
    // in later by the quota fallback — either way, a fresh style has no
    // sources of its own, so this is where they get (re-)added.
    if (map.isStyleLoaded()) setupSource();
    map.on("style.load", setupSource);
    map.on("sourcedata", onSourceData);
    map.on("move", renderMarkers);
    map.on("moveend", renderMarkers);

    return () => {
      map.off("style.load", setupSource);
      map.off("sourcedata", onSourceData);
      map.off("move", renderMarkers);
      map.off("moveend", renderMarkers);
    };
  }, [mechanics, selectedId]);

  // Pan to whichever result the reader picked in the list.
  useEffect(() => {
    if (!selectedId) return;
    const target = mechanics.find((m) => m.id === selectedId);
    const map = mapRef.current;
    if (!target || !map) return;
    map.panTo([target.lng, target.lat], { animate: true });
  }, [selectedId, mechanics]);

  /*
    Lock the map to the searched radius.

    This is a cost control as much as an interaction: an unbounded map lets
    one curious visitor drag across the country, and every degree of that
    drag is tiles nobody searched for. A drag (including its momentum) is
    left completely free — nothing clamps mid-gesture — and only once it
    settles ("moveend") is a resting position outside `bounds` corrected
    with an eased pan back inside. That is what makes the edge read as
    elastic rather than as a wall: the boundary is something the camera
    springs back from, not something that stops the drag itself. See
    REST_SLACK's comment above for why this isn't MapLibre's own
    `maxBounds` — it does more than clamp panning and fought the zoom
    `fitBounds` had already chosen for a search this size.

    Moving to a new area (Nearby, the area picker) changes `center` or
    `radiusMiles`, which re-runs this effect and re-locks around the new
    anchor — the old boundary never lingers.
  */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    const bounds = boundsForRadius(center, radiusMiles * REST_SLACK);

    // Only a real drag should trigger the snap-back — a programmatic move
    // (the initial fitBounds to results, or panTo on selecting one) also
    // fires "moveend" and must not be yanked back to the search anchor.
    let dragged = false;
    const onDragStart = () => {
      dragged = true;
    };
    const onMoveEnd = () => {
      if (!dragged) return;
      dragged = false;
      const c = map.getCenter();
      const lng = clampNumber(c.lng, bounds.getWest(), bounds.getEast());
      const lat = clampNumber(c.lat, bounds.getSouth(), bounds.getNorth());
      if (lng === c.lng && lat === c.lat) return;
      map.easeTo({ center: [lng, lat], duration: 320 });
    };

    map.on("dragstart", onDragStart);
    map.on("moveend", onMoveEnd);

    return () => {
      map.off("dragstart", onDragStart);
      map.off("moveend", onMoveEnd);
    };
  }, [center, radiusMiles]);

  return (
    <div
      ref={containerRef}
      className={`map-muted ${className}`}
      role="application"
      aria-label={`Map of ${mechanics.length} mechanics. A list of the same results follows.`}
    />
  );
}

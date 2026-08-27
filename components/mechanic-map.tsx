"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreGlMap,
  Marker as MapLibreMarker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, Marker } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { fallbackStyleUrl, isQuotaFailure, mapStyleUrl } from "@/lib/map/style";

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
  className = "",
}: {
  mechanics: MapMechanic[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
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
      attributionControl: { compact: false },
      // No rotation/pitch in this migration — the Leaflet map never had
      // either, and adding them here is redesign scope, not migration scope.
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-left");

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

  return (
    <div
      ref={containerRef}
      className={`map-muted ${className}`}
      role="application"
      aria-label={`Map of ${mechanics.length} mechanics. A list of the same results follows.`}
    />
  );
}

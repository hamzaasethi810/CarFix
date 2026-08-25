"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, MarkerClusterGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

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

/*
  Leaflet with OpenStreetMap raster tiles: no API key, no account, no billing.
  Tiles are desaturated in CSS (.map-muted) to get HIG's "muted" emphasis
  style, which keeps the glass panels legible on top.

  Leaflet touches `window` at import time, so it is imported dynamically inside
  the effect rather than at module scope.
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
  const mapRef = useRef<LeafletMap | null>(null);
  const clusterRef = useRef<MarkerClusterGroup | null>(null);

  // Markers are created once per result set, so they capture whichever
  // onSelect existed at that moment. Keeping it in a ref that is updated in an
  // effect lets handlers always call the current one without rebuilding them.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [38.9, -77.15],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        // Leaflet's default attribution prefix adds noise next to the required
        // OSM credit.
        attributionControl: true,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      map.attributionControl.setPrefix("");
      map.on("click", () => onSelectRef.current(null));

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // Rebuild markers whenever the result set changes.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      const map = mapRef.current;
      if (cancelled || !map) return;

      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 55,
        iconCreateFunction: (c) => {
          const n = c.getChildCount();
          const size = n < 10 ? "cluster-sm" : n < 50 ? "cluster-md" : "cluster-lg";
          return L.divIcon({
            html: `<div class="cluster ${size}">${n}</div>`,
            className: "",
            iconSize: L.point(40, 40),
          });
        },
      });

      for (const m of mechanics) {
        const selected = m.id === selectedId;
        const marker = L.marker([m.lat, m.lng], {
          keyboard: true,
          title: `${m.name} — ${m.city}, ${m.state}`,
          alt: `${m.name}, ${m.city}, ${m.state}`,
          icon: L.divIcon({
            // The pin shape reads without relying on its colour.
            html: `<div class="pin${selected ? " pin-selected" : ""}"><span>🔧</span></div>`,
            className: "",
            iconSize: L.point(selected ? 42 : 34, selected ? 42 : 34),
            iconAnchor: L.point(selected ? 21 : 17, selected ? 21 : 17),
          }),
        });

        marker.on("click", () => onSelectRef.current(m.id));
        cluster.addLayer(marker);
      }

      cluster.addTo(map);
      clusterRef.current = cluster;

      if (mechanics.length > 0) {
        const bounds = L.latLngBounds(mechanics.map((m) => [m.lat, m.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mechanics, selectedId]);

  // Pan to whichever result the reader picked in the list.
  useEffect(() => {
    if (!selectedId) return;
    const target = mechanics.find((m) => m.id === selectedId);
    const map = mapRef.current;
    if (!target || !map) return;
    map.panTo([target.lat, target.lng], { animate: true });
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

/*
  The camera plan for Nearby: fly from wherever the globe is resting down to
  a chosen city, without ever streaming through the zoom levels a real
  basemap would bill tiles for.

  This is deliberately NOT a single `flyTo(from, to)` call. MapLibre requests
  tiles for whatever zoom the camera is passing through at each rendered
  frame, so a naive flight from orbit (z2) to a city (z12) requests tiles at
  every level in between — 200-400 of them, against a MapTiler free tier that
  pauses the whole site until the 1st once it's spent. Two keyframes instead
  of one: cross the world laterally while still comfortably under the floor
  (zero tile cost — the globe is drawn from a static texture, not tiles), then
  drop through the street levels in a single short final leg. The caller
  (components/globe.tsx) is the one that actually attaches the street tile
  source, and it does so only when that final leg begins — this module never
  touches MapLibre at all, so the cost argument can be checked by a plain
  unit test rather than a browser.
*/

export type LatLngZoom = { lat: number; lng: number; zoom: number };
export type DescentStep = LatLngZoom & { durationMs: number };

/*
  The zoom below which the dark vector basemap (lib/map/style.ts) starts
  requesting street-level tiles for its own pyramid. Everything before the
  final keyframe must stay under this, or the "single final leg" promise is
  broken and the flight is streaming tiles again. Chosen close to the typical
  arrival zoom (see CITY_ZOOM in components/globe.tsx) so the final leg is a
  short hop — a couple of zoom levels, not ten — which is what keeps the
  measured request count in the tens rather than the hundreds.
*/
export const STREET_ZOOM_FLOOR = 9;

/*
  Where the globe is sitting when nobody has touched it. Mirrors
  components/globe.tsx's `center: [-20, 15]` / `zoom: 2.05` (lng, lat is
  MapLibre's order; this module uses lat/lng like the rest of the plan). Kept
  as a plain constant rather than an import — this file must stay importable
  by vitest with no DOM, and globe.tsx pulls in maplibre-gl at module scope.
  If that resting position ever moves, update both.
*/
const DEFAULT_ORBIT: LatLngZoom = { lat: 15, lng: -20, zoom: 2.05 };

/*
  Zoom used while crossing the globe toward the target. Low enough to leave a
  wide margin under STREET_ZOOM_FLOOR (so it survives the floor moving a
  little without becoming a second streaming leg) and high enough to read as
  "arriving above" rather than "still in orbit."
*/
const APPROACH_ZOOM = 4;

const CROSS_DURATION_MS = 1800;
const FINAL_LEG_DURATION_MS = 1400;

/**
 * The camera keyframes for a descent onto `to`, starting from `from`
 * (defaults to the globe's resting orbit position). Pure and synchronous —
 * no MapLibre, no timers — so the tile-cost property can be asserted without
 * rendering anything. The caller is responsible for actually animating the
 * map through these keyframes in order, and for adding the street tile
 * source only when the last one begins.
 */
export function descentPlan(to: LatLngZoom, from: LatLngZoom = DEFAULT_ORBIT): DescentStep[] {
  // Clamped on both sides: under the floor (so it never trips the "stays
  // above the floor" property) and under the target's own zoom (so the plan
  // stays monotonic even if a caller asks for a very shallow arrival zoom),
  // then floored at the starting zoom so it never asks the camera to zoom
  // out on its way to zooming in.
  const approachZoom = Math.max(
    from.zoom,
    Math.min(APPROACH_ZOOM, STREET_ZOOM_FLOOR - 0.5, to.zoom - 0.5),
  );

  return [
    // Leg 1: cross the world at orbital zoom, arriving above the target.
    // Still drawn entirely from the static texture — zero tile requests.
    { lat: to.lat, lng: to.lng, zoom: approachZoom, durationMs: CROSS_DURATION_MS },
    // Leg 2: the one and only descent through street zoom levels. The
    // street source goes on the map exactly when this leg starts.
    { lat: to.lat, lng: to.lng, zoom: to.zoom, durationMs: FINAL_LEG_DURATION_MS },
  ];
}

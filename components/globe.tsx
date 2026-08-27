"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreGlMap, setWorkerUrl } from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buttonStyles } from "@/components/ui";

/*
  Same vendored-worker fix as components/mechanic-map.tsx: MapLibre resolves
  its own worker from `import.meta.url` and silently dies under Turbopack's
  dev-server module URLs unless pointed at a static copy instead. See that
  file's comment for the full story.
*/
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

/*
  Texture: NASA's "Earth's City Lights" composite (Craig Mayhew & Robert
  Simmon, NASA GSFC, from DMSP Operational Linescan System data supplied by
  NOAA's National Geophysical Data Center) — the dark/night-lights member of
  the Blue Marble family the brief asked for.

  Source: https://eoimages.gsfc.nasa.gov/images/imagerecords/55000/55167/earth_lights_lrg.jpg
  (NASA Earth Observatory / Visible Earth catalogue id 55167, "Earth's City
  Lights"). NASA imagery is not copyrighted within the United States — see
  NASA's media usage guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/)
  — so it is public domain. Credit is recorded here because public domain
  still deserves attribution, per the brief.

  The original ships at 2400×1024; public/earth-dark.jpg is that file resized
  to 2048×1024 (a downstream sizing only — the source above is already a
  web-sized derivative, not the multi-thousand-pixel original release) so a
  sphere occupying at most half the viewport never waits on a multi-megabyte
  download.
*/
const EARTH_TEXTURE_URL = "/earth-dark.jpg";

const EARTH_SOURCE_ID = "earth";
const EARTH_LAYER_ID = "earth-surface";

/*
  A style built entirely from a local file and drawn with no tile requests at
  all — this is what makes the globe cost zero. `type: "image"` drapes one
  static raster across a set of lng/lat corners rather than fetching a tile
  pyramid; corners at the full ±180/±90 extent is exactly what an
  equirectangular texture needs to wrap a sphere, so the poles converge for
  free as part of the projection rather than needing separate handling. There
  is deliberately no MapTiler or OpenFreeMap URL anywhere in this file — see
  lib/map/style.ts for where those belong instead (the descent, not this
  view).
*/
/*
  An image source is internally handled in Web Mercator space even when the
  map is drawn as a globe, and Mercator's y coordinate goes to infinity at
  the true poles (±90°) — corners placed exactly there threw
  "y=Infinity outside of bounds" and broke the source entirely. 85.0511° is
  the standard Web Mercator latitude limit (used by every Mercator basemap
  for the same reason); clipping the corners there leaves an unrendered cap
  at each pole a couple of percent of the sphere's surface, which is at the
  back or the top of a globe nobody is meant to be inspecting pole-on.
*/
const MERCATOR_LAT_LIMIT = 85.0511;

const GLOBE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    [EARTH_SOURCE_ID]: {
      type: "image",
      url: EARTH_TEXTURE_URL,
      coordinates: [
        [-180, MERCATOR_LAT_LIMIT],
        [180, MERCATOR_LAT_LIMIT],
        [180, -MERCATOR_LAT_LIMIT],
        [-180, -MERCATOR_LAT_LIMIT],
      ],
    },
  },
  layers: [
    // Transparent, not a colour: what shows outside the sphere's silhouette
    // is the page itself (the forest-ground vignette + grain), not a canvas
    // fill. A flat background here is exactly what would make this read as
    // a sticker rather than an object sitting in the scene.
    { id: "space", type: "background", paint: { "background-color": "rgba(0,0,0,0)" } },
    { id: EARTH_LAYER_ID, type: "raster", source: EARTH_SOURCE_ID },
  ],
  projection: { type: "globe" },
};

export function Globe({ onNearby }: { onNearby: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreGlMap({
      container: containerRef.current,
      style: GLOBE_STYLE,
      center: [-20, 15],
      /*
        Load-bearing, not an arbitrary starting position. At this zoom the
        rendered sphere exactly fills .globe-stage's circle, which is what the
        contact shadow and the rim light in globals.css are positioned against.
        It was arrived at by measuring rendered pixels, not derived from the
        projection, so a MapLibre change to how zoom maps to globe radius would
        silently reopen a gap or leave a ring between sphere and stage. If the
        globe ever looks detached from its shadow again, check this first.
      */
      zoom: 2.05,
      minZoom: 0.3,
      maxZoom: 2.5,
      bearing: 0,
      pitch: 0,
      attributionControl: false,
      renderWorldCopies: false,
      /*
        Drag-to-spin with momentum is dragPan's default behaviour — panning a
        globe-projected map rotates it, and MapLibre's own inertia carries
        the spin past pointer-up without anything extra wired here. Every
        other handler is off: this is a decorative landing view, not a map
        to be explored, and the brief is explicit that nothing beyond
        drag-to-spin belongs here.
      */
      scrollZoom: false,
      boxZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      keyboard: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    /*
      Everything here is absolutely positioned within this one box rather than
      stacked in a flex column. A flex column of (wordmark, stage, Nearby)
      broke exactly the way the 844×390 landscape phone always breaks this
      site: three items each with their own minimum height add up to more
      than 390px minus the header, and a fixed-size aspect-ratio stage cannot
      shrink to make room, so it overflowed its flex row and painted over the
      other two. Layering instead of stacking means the stage's own vmin
      sizing (which already accounts for the short dimension) is the only
      thing that determines how big the globe gets, and the wordmark/Nearby
      never compete with it for vertical space.
    */
    <div className="map-root fixed inset-0 top-16 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="globe-stage">
          {/* Belongs to the page, not the map canvas — see .globe-ground in globals.css. */}
          <div className="globe-ground" aria-hidden="true" />
          <div className="globe-sphere">
            {/*
              Decorative: dragging spins it for anyone who pokes at it, but
              nothing depends on that, and there is no operable instruction
              worth announcing to a screen reader. Nearby below is the real,
              accessible way forward.
            */}
            <div
              ref={containerRef}
              className="globe-canvas absolute inset-0"
              aria-hidden="true"
              tabIndex={-1}
            />
            {/*
              A sibling painted after the canvas, not a box-shadow on
              .globe-sphere itself: box-shadow is part of a box's own
              background/border layer, which paints *behind* its children —
              the opaque MapLibre canvas filling the whole circle completely
              hid it. This overlay is the fix: same inset shadow, now on top.
            */}
            <div className="globe-shading" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="absolute top-0 inset-x-0 pt-6 sm:pt-10 text-center pointer-events-none">
        <h1
          className="text-large-title font-bold text-label"
          style={{ textShadow: "0 2px 20px rgba(0, 0, 0, 0.55)" }}
        >
          Gaari
        </h1>
      </div>

      {/*
        pointer-events-none on the strip, auto back on the button: the empty
        space either side of Nearby sits over the globe's drag-to-spin area,
        and it should let that drag through rather than swallowing it.
      */}
      <div className="absolute bottom-0 inset-x-0 pb-6 sm:pb-10 flex justify-center pointer-events-none">
        <button
          type="button"
          onClick={onNearby}
          className={`${buttonStyles.primary} pointer-events-auto`}
        >
          Nearby
        </button>
      </div>
    </div>
  );
}

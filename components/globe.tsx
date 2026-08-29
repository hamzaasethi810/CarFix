"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AttributionControl, Map as MapLibreGlMap, setWorkerUrl } from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { buttonStyles } from "@/components/ui";
import { AreaPicker, type Area } from "@/components/area-picker";
import { CITY_ZOOM, descentPlan, type DescentStep } from "@/lib/map/descent";
import { FALLBACK_ATTRIBUTION, fallbackStyleUrl, isQuotaFailure } from "@/lib/map/style";

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
/*
  The Mercator-warped copy, not the raw equirectangular original.

  MapLibre's image source interpolates between its corners in Mercator space,
  while an equirectangular image is linear in latitude. The two agree at the
  equator and diverge toward the poles, so the raw texture came out with the
  mid-latitudes squeezed together — continents visibly squashed through the
  middle of the sphere. scripts/reproject-earth.mjs pre-warps the rows so the
  linear interpolation lands true; regenerate it if the source is ever
  replaced.
*/
const EARTH_TEXTURE_URL = "/earth-dark-mercator.jpg";

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

// Same lifetime reasoning as mechanic-map.tsx's identical constant/helper:
// the quota resets monthly, so remembering the switch for longer than this
// tab's session would strand a returning visitor on the fallback for weeks
// after MapTiler is serving again. Not imported from that file because it
// isn't exported there and duplicating one string constant is cheaper than
// coupling two independent map components together.
const FALLBACK_SESSION_KEY = "gaari:map-tile-fallback";

function startedOnFallback(): boolean {
  try {
    return sessionStorage.getItem(FALLBACK_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Animate one leg and resolve when the camera stops.
 *
 * `moveend` rather than a timer: an interrupted or shortened animation still
 * fires it, so a descent can never be left half-run waiting on a duration that
 * no longer applies.
 */
/**
 * Swap the basemap and wait until it is actually ready to draw.
 *
 * `setStyle` is asynchronous, and a camera animation started in the same tick
 * is discarded while the new style loads — which is exactly what happened the
 * first time this was wired: the descent swapped in street tiles, the final
 * `easeTo` was dropped on the floor, and the camera stopped half a continent
 * up. It looked like a working flight that simply never arrived, and the low
 * tile count made it look economical rather than broken.
 */
function swapStyle(map: MapLibreMap, style: string): Promise<void> {
  return new Promise((resolve) => {
    // A holder rather than a bare `let`: `done` has to be defined before the
    // timer that calls it, and the timer has to be created after setStyle.
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    const done = () => {
      if (timer.id !== undefined) clearTimeout(timer.id);
      map.off("idle", done);
      resolve();
    };
    map.once("idle", done);
    map.setStyle(style);
    /*
      A safety net, not the normal path: a style already in cache can settle
      without ever going busy, and a descent must not hang on an event that has
      already been and gone.

      Eight seconds rather than two. If this timer wins the race on a slow
      connection, the next leg starts against a still-loading style and the
      camera move is dropped — reproducing the exact bug the awaited swap
      exists to prevent. The margin has to be wide enough that only a genuinely
      stuck load reaches it.
    */
    timer.id = setTimeout(done, 8_000);
  });
}

function flyLeg(map: MapLibreMap, step: DescentStep): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      map.off("moveend", done);
      map.off("remove", done);
      resolve();
    };
    map.once("moveend", done);
    /*
      `remove()` never fires moveend, so without this a descent interrupted by
      the component unmounting would leave this promise — and its listener —
      pending forever.
    */
    map.once("remove", done);
    map.easeTo({
      center: [step.lng, step.lat],
      zoom: step.zoom,
      duration: step.durationMs,
      essential: true,
    });
  });
}

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
    {
      id: EARTH_LAYER_ID,
      type: "raster",
      source: EARTH_SOURCE_ID,
      paint: {
        /*
          No cross-fade. The default fades between resamplings as the camera
          moves, and on a single static image being re-projected onto a
          rotating sphere that reads as the whole planet smearing — the
          "blurry mess" when you spin it. With the fade off each frame is
          drawn once, sharply.
        */
        "raster-fade-duration": 0,
        "raster-resampling": "linear",
      },
    },
  ],
  projection: { type: "globe" },
};

export function Globe({
  mapStyle,
  onNearby,
}: {
  /** Resolved on the server so the key needs no NEXT_PUBLIC_ prefix. */
  mapStyle: string;
  onNearby: (area: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // Whether the area picker is open. Only ever true after geolocation is
  // refused (or unavailable) — see handleNearby — so declining location
  // never dead-ends: naming a town is always the very next thing offered.
  const [picking, setPicking] = useState(false);
  // True for the span between a target being chosen and the camera actually
  // arriving, so a second tap on Nearby (or the area picker) can't start a
  // second descent on top of the first one.
  const [descending, setDescending] = useState(false);

  const fallbackAppliedRef = useRef(false);
  const attributionAddedRef = useRef(false);
  /*
    Two refs rather than relying on the `descending` state alone.

    `aliveRef` is the unmount guard: a descent is a multi-second async
    sequence, and somebody can navigate away mid-flight. Without this, the
    steps after an await would run against a torn-down map and set state on an
    unmounted component.

    `descendingRef` is the race guard. `descending` is state, so both handlers
    close over its render-time value — two quick presses of Nearby before the
    first geolocation callback returns would each read `false` and start a
    flight, two sets of listeners driving one camera. The button's `disabled`
    attribute lags a render behind and cannot prevent it. The state is kept
    only for that disabled attribute; the ref is what actually decides.
  */
  const aliveRef = useRef(true);
  const descendingRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
      /*
        Just under the resting zoom, not near zero.

        Nothing on this view can zoom by hand — every handler is off — but the
        descent drives the camera, and a stray move toward the old 0.3 floor
        left a degenerate sphere a few pixels across with the shading and
        shadow still sized for a full one. Fencing the bottom in means the
        globe cannot reach a state it does not have artwork for.
      */
      minZoom: 1.9,
      /*
        High enough for the descent to actually arrive.

        This was 2.5, bounding the decorative globe — and it silently clamped
        the descent's final leg: easeTo({ zoom: 11 }) became easeTo({ zoom:
        2.5 }), so the camera crossed the world and then stopped in orbit. It
        looked like a flight that worked and a tile count that was
        impressively low, when in fact the map had never reached street level
        at all.

        Nothing is lost by raising it: every zoom interaction on this map is
        disabled (see the handler block below), so a visitor cannot zoom at
        all. The only thing that moves the camera is the descent.
      */
      maxZoom: 18,
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

    /*
      Attribution, added only once a street style is in play.

      The globe itself draws a local public-domain NASA texture credited in the
      comment at the top of this file, so there is nothing for MapLibre to
      attribute while it is on screen — and an empty attribution box floating
      under the sphere is noise. The moment the descent swaps in MapTiler or
      OpenFreeMap, though, their attribution is a licence obligation rather
      than a courtesy, so it goes on with the style that requires it.
    */
    map.on("styledata", () => {
      if (attributionAddedRef.current) return;
      // The globe style carries the local texture and nothing to credit.
      if (map.getSource(EARTH_SOURCE_ID)) return;
      attributionAddedRef.current = true;
      /*
        customAttribution because the keyless fallback style carries none of
        its own — without it the control renders empty on that path, which
        looks like credit is being given when it is not. Harmless alongside
        MapTiler, which declares its own and is shown in addition.
      */
      map.addControl(
        new AttributionControl({
          compact: false,
          customAttribution: fallbackAppliedRef.current ? FALLBACK_ATTRIBUTION : undefined,
        }),
      );
    });

    /*
      Same quota fallback as mechanic-map.tsx, for the same reason: MapTiler
      pauses service when the month's requests are spent, and a blank map is
      the worst way for a visitor to discover that. Only 402 and 429 count —
      a 404 or a network blip must not discard a working paid source. The
      keyless fallback is never the thing that fails here, so this only ever
      fires for MapTiler.
    */
    map.on("error", (e) => {
      const status = (e.error as { status?: number } | undefined)?.status;
      if (status === undefined || !isQuotaFailure(status)) return;
      if (fallbackAppliedRef.current) return; // switch once, not once per tile
      fallbackAppliedRef.current = true;
      try {
        sessionStorage.setItem(FALLBACK_SESSION_KEY, "1");
      } catch {
        // Private browsing can throw on storage access; the ref above still
        // prevents repeat switches for the rest of this page's life.
      }
      map.setStyle(fallbackStyleUrl());
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /*
    Fly the camera down through the plan's keyframes.

    The street source is swapped in exactly when the final leg begins, and not
    a moment earlier. That single fact is what keeps a descent in the tens of
    tile requests rather than the hundreds: a naive flight from orbit to a city
    interpolates through every zoom level in between with tiles attached, and
    MapTiler's free tier pauses service for the rest of the month when it is
    spent. Everything before the last leg is drawn from the local texture.
  */
  const descend = useCallback(
    async (to: { lat: number; lng: number }) => {
      const map = mapRef.current;
      if (!map || descendingRef.current) return;
      descendingRef.current = true;
      setDescending(true);
      setPicking(false);

      /*
        Drag-to-spin is switched off for the duration.

        A gesture calls MapLibre's `camera.stop()`, which fires `moveend` at
        wherever the drag left the camera — and `flyLeg` resolves on
        `moveend`. So spinning the globe mid-flight would resolve the current
        leg early and advance the plan from a position that no longer matches
        the keyframe, or finish the descent somewhere other than the target.
        The globe is not draggable while it is flying you somewhere.
      */
      map.dragPan.disable();
      const finish = () => {
        descendingRef.current = false;
        if (!aliveRef.current) return;
        map.dragPan.enable();
        setDescending(false);
      };

      const plan = descentPlan({ ...to, zoom: CITY_ZOOM });
      const streetStyle = startedOnFallback() ? fallbackStyleUrl() : mapStyle;

      /*
        Reduced motion means no flight at all — not a faster one. The camera
        is placed at the destination and the tiles load there. Nothing becomes
        unreachable; it simply arrives.
      */
      const still =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      const last = plan[plan.length - 1];

      if (still) {
        await swapStyle(map, streetStyle);
        if (!aliveRef.current) return void (descendingRef.current = false);
        map.jumpTo({ center: [last.lng, last.lat], zoom: last.zoom });
        finish();
        onNearby(to);
        return;
      }

      for (const [i, step] of plan.entries()) {
        // The final leg is the only one that costs anything, so the basemap
        // arrives with it rather than before it — and the swap is awaited,
        // because a camera move started while a style is loading is dropped.
        if (i === plan.length - 1) {
          await swapStyle(map, streetStyle);
          if (!aliveRef.current) return void (descendingRef.current = false);
        }
        await flyLeg(map, step);
        // Checked after every await: the map may have been torn down while
        // this leg was in the air.
        if (!aliveRef.current) return void (descendingRef.current = false);
      }

      finish();
      onNearby(to);
    },
    // mapStyle is stable for the page's life (resolved server-side), but
    // listed rather than omitted so the dependency stays honest.
    [mapStyle, onNearby],
  );

  /*
    Geolocation, with refusal treated as a normal answer rather than an error.

    Declining location must not dead-end: the globe stays where it is and the
    area picker opens instead, so naming a town is always the very next thing
    offered. No warning, no retry prompt — a person who said no does not need
    to be argued with.
  */
  const handleNearby = useCallback(() => {
    if (descendingRef.current) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPicking(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => void descend({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPicking(true),
      { timeout: 8_000, maximumAge: 300_000 },
    );
  }, [descend]);

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
    <div className="absolute inset-0 overflow-hidden">
      {/*
        Biased upward, not centred.

        The stage box runs the full height under the header, but the bottom
        third of that is the filter bar. Centring in the box puts the globe
        low, half of it behind the panel; the padding lifts the optical centre
        into the space that is actually visible. Kept as padding rather than a
        translate so it still shrinks correctly at short viewports.

        `globe-chrome` (styling in globals.css) carries one more override on
        top of the pb-32/sm:pb-40 here: a fixed 8rem/10rem bias is fine on
        anything tall enough to absorb it, but on a short window it doesn't
        shrink at all, unlike the stage's own vmin sizing. At 844x390 it eats
        160px of a 326px-tall box, pinning the flex centre within 7px of the
        button row above no matter how small the stage gets — no vmin figure
        can clear both the buttons and the filter bar at once there (checked:
        even a ~60px stage still touched both). See the comment on that
        override for why it has to live in a plain media query rather than
        another vmin term next to .globe-stage's own.
      */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pb-32 sm:pb-40 globe-chrome">
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

      {/*
        The two things there is to do from here, where the wordmark used to be.

        The name is already on the plate in the header, so repeating it over
        the globe was a title with nothing to say — and it occupied the one
        piece of space a visitor's eye lands on before the sphere. Two actions
        earn that place instead.

        pointer-events-none on the strip, auto back on the controls: the empty
        space either side sits over the globe's drag-to-spin area and should
        let a drag through rather than swallowing it.
      */}
      <div className="absolute top-0 inset-x-0 pt-6 sm:pt-10 flex justify-center gap-6 sm:gap-10 pointer-events-none">
        <button
          type="button"
          onClick={handleNearby}
          disabled={descending}
          className={`${buttonStyles.primary} pointer-events-auto`}
        >
          Nearby
        </button>
        <Link href="/experiences/new" className={`${buttonStyles.secondary} pointer-events-auto`}>
          Log a service
        </Link>
      </div>

      {/*
        Only mounted once geolocation has been refused or is unavailable, and
        keyed on that so it mounts open every time rather than needing its own
        trigger pressed. Refusing location should cost one tap, not two.
      */}
      {picking && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center px-4">
          <div className="pointer-events-auto">
            <AreaPicker
              current={null}
              initialOpen
              onChoose={(area: Area) => void descend({ lat: area.lat, lng: area.lng })}
              onOpenChange={(open) => {
                if (!open) setPicking(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

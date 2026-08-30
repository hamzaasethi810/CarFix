"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Car } from "./car";

/*
  One scroll, one car, five beats.

  The car is parked, a mechanic opens it up, it changes colour, the camera
  tracks to the rear and the exhaust lights. The point of the sequence is that
  the same record serves someone who wants to know why the bill was £700 and
  someone specifying a titanium system, so the car has to do both jobs on
  screen.

  Beats, not frames. Scroll position picks WHICH beat is current; every visual
  change between beats is a CSS transition. A per-frame React re-render of an
  SVG would run the whole thing through the reconciler on the main thread,
  which is exactly where it would drop frames. This way scroll does integer
  work and the compositor does the animation.

  The car's own travel is the exception, because it has to track scroll
  continuously to feel attached to it. That is written straight onto the
  element's `transform`, never into a CSS custom property: a variable set on a
  parent invalidates style for every child under it, and this runs every
  frame.
*/

export type Beat = {
  panel: ReactNode;
  /** 0 shut, 1 raised. */
  hood?: number;
  paint?: string;
  /** 0 off, 1 lit. */
  exhaust?: number;
  /** Camera: how far to track along the car, and how close. */
  camera?: { x: number; scale: number };
};

const DEFAULT_CAMERA = { x: 0, scale: 1 };

export function ScrollStory({ beats }: { beats: Beat[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    const car = carRef.current;
    if (!track || !car) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      /*
        Reduced motion gets the destination, not the journey: the panels stack
        as ordinary sections and the car sits still. Same information, nothing
        travelling.

        No state is set here. The stylesheet already collapses .story-track to
        `height: auto` under the same media query, so mirroring that into React
        would be a second source of truth for one fact the CSS already owns —
        and setting state synchronously in an effect is what triggers the
        cascading render the lint rule warns about.
      */
      car.style.transform = "none";
      for (const el of panelRefs.current) el?.setAttribute("data-shown", "true");
      return;
    }

    let frame = 0;
    let shown = -1;
    const update = () => {
      frame = 0;
      const r = track.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) return;
      const p = Math.min(1, Math.max(0, -r.top / span));

      // A gentle drift, not a journey: the car stays the subject while the
      // camera and the car itself do the storytelling.
      car.style.transform = `translate3d(${(p * 90 - 45).toFixed(1)}px,0,0)`;

      const next = Math.min(beats.length - 1, Math.floor(p * beats.length));
      if (next !== shown) {
        shown = next;
        setActive(next);
        panelRefs.current.forEach((el, i) =>
          el?.setAttribute("data-shown", i === next ? "true" : "false"),
        );
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [beats.length]);

  const beat = beats[active] ?? beats[0];
  const camera = beat.camera ?? DEFAULT_CAMERA;

  return (
    <section
      ref={trackRef}
      /* The reduced-motion rule overrides this with `height: auto !important`. */
      style={{ height: `${(beats.length + 1) * 100}vh` }}
      className="story-track relative"
      aria-label="What Gaari is"
    >
      <div className="story-sticky sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        <div className="story-panels relative mx-auto w-full max-w-3xl px-6">
          {beats.map((b, i) => (
            <div
              key={i}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              data-shown={i === 0 ? "true" : "false"}
              className="story-panel"
            >
              {b.panel}
            </div>
          ))}
        </div>

        <div className="relative mt-10 overflow-hidden">
          {/*
            The camera. Tracking along the car and pushing in is a transform on
            this wrapper, so the drawing never has to know where it is being
            looked at from.
          */}
          <div
            className="story-camera mx-auto w-full max-w-4xl"
            style={{ transform: `translate3d(${camera.x}%,0,0) scale(${camera.scale})` }}
          >
            <div ref={carRef} className="will-change-transform">
              <Car
                className="w-full h-auto"
                hood={beat.hood ?? 0}
                paint={beat.paint ?? "#27703F"}
                exhaust={beat.exhaust ?? 0}
              />
            </div>
          </div>
          <div className="h-px w-full bg-separator" />
        </div>
      </div>
    </section>
  );
}

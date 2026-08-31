"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CarSequence } from "./car-sequence";

/*
  One scroll, one car, five beats.

  The footage is a real car that transforms as it turns: silver in a studio at
  the top, green in a workshop by the end. Scroll picks the frame. The point of
  the sequence is that the same record serves someone who wants to know why the
  bill was high and someone pricing a wrap or an exhaust.

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

/*
  A beat is now just what is said.

  hood, paint, exhaust and camera used to live here, because the car was an
  SVG this file animated. The footage performs all four itself, so the beats
  went back to being copy: scroll position picks the frame, and the frame is
  already opened, resprayed and turned.
*/
export type Beat = { panel: ReactNode };

export function ScrollStory({ beats }: { beats: Beat[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  /*
    Continuous scroll progress, in a ref rather than state.

    The frame sequence needs this every frame; putting it in state would
    re-render the whole story on every scroll event to move one canvas.
  */
  const progressRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

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
      progressRef.current = 0;
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
      progressRef.current = p;


      /*
        Which panel is current is written straight to a data attribute rather
        than held in React state. Nothing else needs to re-render when the
        beat changes: the copy is already in the DOM and the stylesheet does
        the cross-fade, so state here would re-render the whole story to flip
        one attribute.
      */
      const next = Math.min(beats.length - 1, Math.floor(p * beats.length));
      if (next !== shown) {
        shown = next;
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


  return (
    <section
      ref={trackRef}
      /* The reduced-motion rule overrides this with `height: auto !important`. */
      style={{ height: `${(beats.length + 1) * 100}vh` }}
      className="story-track relative"
      aria-label="What Gaari is"
    >
      <div className="story-sticky sticky top-0 h-screen overflow-hidden">
        {/*
          The car fills the frame and the copy sits over it. A scrim keeps the
          text readable wherever the footage happens to be bright — the studio
          floor behind the car is a mid grey, and light type on mid grey is
          the one combination that fails.
        */}
        <CarSequence progress={progressRef} />
        <div className="story-scrim absolute inset-0 pointer-events-none" />

        <div className="story-panels absolute inset-x-0 top-0 mx-auto w-full max-w-2xl px-6">
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
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Car } from "./car";

/*
  The car arrives, then keeps moving as you scroll.

  Two separate motions with different jobs. The drive-in happens once, on
  load, and its job is to make the page feel like it started rather than
  appeared. The scroll motion is continuous and slow, and its job is depth:
  the car drifts against the page so the hero does not feel like a flat panel
  you are sliding past.

  Scroll position is written straight onto the element's `transform` inside a
  requestAnimationFrame callback, never into a CSS custom property. A variable
  set on a parent invalidates style for every child underneath it; a transform
  touches one element. On a handler that runs every frame that is the whole
  budget. The listener is passive so it can never block scrolling.
*/
export function CarHero() {
  const carRef = useRef<HTMLDivElement>(null);
  const arrivedRef = useRef(false);

  useEffect(() => {
    const car = carRef.current;
    if (!car) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // The destination, not the journey. Nothing moves, nothing is missed.
      car.style.transform = "none";
      car.style.opacity = "1";
      return;
    }

    /*
      Drive in from the left on the next frame, so the browser has painted the
      starting position first. Setting both in the same frame gives no
      transition at all: there is no previous value to animate from.
    */
    const enter = requestAnimationFrame(() => {
      car.style.transition =
        "transform 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms ease-out";
      car.style.transform = "translate3d(0,0,0)";
      car.style.opacity = "1";
      arrivedRef.current = true;
    });

    let frame = 0;
    const update = () => {
      frame = 0;
      if (!arrivedRef.current) return;
      const y = window.scrollY;
      // Slow drift. Faster than this and it reads as the car escaping rather
      // than the page having depth.
      car.style.transition = "none";
      car.style.transform = `translate3d(${(y * 0.28).toFixed(1)}px,0,0)`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(enter);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div
        ref={carRef}
        style={{ transform: "translate3d(-120%,0,0)", opacity: 0 }}
        className="w-full max-w-3xl mx-auto will-change-transform"
      >
        <Car className="w-full h-auto" />
      </div>
      {/* the road it sits on */}
      <div className="h-px w-full bg-separator" />
    </div>
  );
}

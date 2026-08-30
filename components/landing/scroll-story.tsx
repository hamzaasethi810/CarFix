"use client";

import { useEffect, useRef } from "react";
import { Car } from "./car";

/*
  The car drives across the screen as you scroll, and the story arrives with
  it.

  Scroll position is written straight onto the car's `transform` in a rAF
  callback rather than into a CSS custom property. A variable set on a parent
  invalidates style for every child under it; a transform on one element
  touches one element. On a scroll handler, running on every frame, that
  difference is the whole budget.

  The listener is passive so it can never block scrolling, and the work is
  coalesced into one animation frame — a scroll event can fire several times
  per frame and doing layout maths on each one is how a page starts to feel
  heavy.
*/

type Step = { title: string; body: string };

const STEPS: Step[] = [
  {
    title: "Report what you paid",
    body: "Add the job, the shop and the price. Scan the receipt if you have one — it is checked for proof and then deleted, never stored.",
  },
  {
    title: "See what others paid",
    body: "Real prices from real owners, for your exact make, model and generation. Not a quote, not an estimate.",
  },
  {
    title: "Find a fair shop",
    body: "Compare a shop against the going rate in your area before you book, so you know the number before you are standing at the counter.",
  },
];

export function ScrollStory() {
  const trackRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    const car = carRef.current;
    if (!track || !car) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      /*
        Reduced motion gets the destination, not the journey: the car sits
        centred and every step is simply visible. Nothing moves, and nothing
        is unreachable.
      */
      car.style.transform = "translate3d(0,0,0)";
      for (const s of stepRefs.current) s?.setAttribute("data-shown", "true");
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const r = track.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) return;
      // 0 at the moment the track's top reaches the viewport top, 1 at the end.
      const p = Math.min(1, Math.max(0, -r.top / span));

      /*
        The car crosses the viewport plus its own width, so it enters from off
        the left and leaves off the right rather than appearing and vanishing
        in place.
      */
      const travel = window.innerWidth + car.offsetWidth;
      const x = -car.offsetWidth + travel * p;
      car.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;

      /*
        Exactly one step at a time.

        The windows used to overlap by a few percent, meaning to give the
        steps a crossfade. They are stacked in the same absolute box, so what
        it actually produced was two headings drawn on top of each other —
        unreadable. The fade between them is the transition's job, not the
        window's.
      */
      const active = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      stepRefs.current.forEach((el, i) => {
        el?.setAttribute("data-shown", i === active ? "true" : "false");
      });
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
  }, []);

  return (
    <section ref={trackRef} className="relative h-[320vh]" aria-label="How Gaari works">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        {/* The steps sit above the road; only one is shown at a time. */}
        <div className="relative mx-auto w-full max-w-2xl px-6 h-52">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              data-shown={i === 0 ? "true" : "false"}
              className="story-step absolute inset-x-6 top-0 text-center"
            >
              <div className="font-condensed text-caption font-bold uppercase tracking-[0.16em] text-secondary">
                Step {i + 1}
              </div>
              <h2 className="text-title1 mt-2">{s.title}</h2>
              <p className="text-body text-secondary mt-3 max-w-xl mx-auto">{s.body}</p>
            </div>
          ))}
        </div>

        {/* The road: one line, because the car needs something to be on. */}
        <div className="relative mt-4">
          <div ref={carRef} className="w-64 sm:w-80 md:w-[26rem] will-change-transform">
            <Car className="w-full h-auto" />
          </div>
          <div className="mt-1 h-px w-full bg-separator" />
        </div>
      </div>
    </section>
  );
}

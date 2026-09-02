"use client";

import { useEffect, useRef, useState } from "react";

/*
  Counts up once, the first time it scrolls into view.

  Driven by requestAnimationFrame against a clock rather than a fixed number
  of steps, so the duration holds on a slow device instead of stretching out.
  Eased out, because the number should arrive and settle rather than drift
  into place.

  It runs once and then stops observing. A figure that re-counts every time it
  scrolls back into view reads as a page that cannot sit still, and this one
  sits above the fold on the busiest route in the app.

  Under reduced motion it renders the final value immediately: a spinning
  number is exactly the kind of movement that setting exists to be spared.
*/
export function CountUp({
  value,
  duration = 1100,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  /*
    Seeded with the real value, not zero.

    That means the server renders the true number, so it is correct without
    JavaScript and correct for anything reading the markup. The count only
    drops to zero at the instant it starts animating, inside the observer
    callback, which is also what keeps this out of the synchronous-setState
    trap that cascades a second render out of the effect.
  */
  const [shown, setShown] = useState(value);
  const raf = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion: the seeded value is already correct, so leave it alone.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        setShown(0);
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutCubic: fast off the mark, settles onto the value.
          setShown(Math.round(value * (1 - (1 - t) ** 3)));
          if (t < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {shown.toLocaleString("en-US")}
    </span>
  );
}

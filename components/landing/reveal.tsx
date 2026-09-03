"use client";

import { useEffect, useRef, useState } from "react";

/*
  Reveals its children once, the first time they scroll into view.

  Once, not every time. A section that re-animates each time it scrolls back
  past reads as a page that cannot settle, and on a page where every chapter
  fills the screen you cross those boundaries constantly.

  The element renders in its final position for anyone whose browser never
  runs the effect, so nothing is ever permanently invisible. Under reduced
  motion it is shown immediately with no transform at all.

  `delay` staggers children inside one chapter, which is what keeps this from
  being the same block fade on every section: the eye follows a sequence
  rather than watching a rectangle appear.
*/
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }

    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };

    /*
      The observer handles ordinary scrolling. It cannot handle a jump.

      An IntersectionObserver only calls back when a threshold is crossed, so
      an element that goes from below the fold to above it between two frames
      never reports anything and would stay invisible for good. That is not
      exotic: it is what a refresh restoring scroll position does, and what
      End or an anchor link does.

      So a passive scroll listener covers the gap, and removes itself the
      moment its element is shown.
    */
    const onScroll = () => {
      const box = el.getBoundingClientRect();
      if (box.top < window.innerHeight) show();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) show();
      },
      /*
        Fires a little before the edge so the motion is finishing as the
        chapter arrives, rather than starting once it is already being read.
        The threshold is low because a full-height section can never show
        much of itself before its top passes the fold.
      */
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Covers a load that restores scroll position partway down the page.
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown || undefined}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${className}`}
    >
      {children}
    </div>
  );
}

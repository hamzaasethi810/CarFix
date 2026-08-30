"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  Fades a section in the first time it is scrolled to, and never again.

  `once: true` in spirit: the observer disconnects after the first
  intersection. A section that re-animates every time it scrolls back into
  view turns a page into a slideshow, and the second showing explains nothing
  the first did not.

  Opacity and transform only, so revealing a section costs no layout.
*/
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-shown", "true");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-shown", "true");
        io.disconnect();
      },
      // Fires a little before the section is fully on screen, so it has
      // finished arriving by the time it is being read.
      { rootMargin: "-12% 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-shown="false" className={`reveal ${className}`}>
      {children}
    </div>
  );
}

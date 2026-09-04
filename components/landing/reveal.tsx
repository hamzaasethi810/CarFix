"use client";

import { useEffect, useRef } from "react";

/*
  Reveal on arrival, and visible without JavaScript.

  The previous implementation started every element at opacity 0 and waited
  for an observer to add data-shown. With scripting unavailable, an
  unsupported observer, or a hydration failure, all seventeen elements on the
  landing page stayed invisible — the top finding of the last critique, and a
  page that renders nothing is a far worse failure than a page that does not
  animate.

  The revealed state is now the CSS default. This component adds
  data-pending on mount (which only ever runs with JS available) and removes
  it on intersection, so the animation is purely additive.
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

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    node.setAttribute("data-pending", "");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.removeAttribute("data-pending");
        io.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? ({ ["--reveal-delay" as string]: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

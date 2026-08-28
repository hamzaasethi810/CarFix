"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/*
  A dropdown that escapes whatever is trying to clip it.

  The filter bar is a scrolling glass panel — it has to be, or an open panel
  pushes the Search button off a landscape phone with nothing to scroll it back.
  But a menu positioned inside a scrolling box is clipped by that box, which is
  what made the service and area pickers look broken: you typed, matches
  appeared, and the list was cut off a line and a half down, so the thing you
  wanted was unreachable and the text just sat there.

  `position: fixed` alone does not fix it. The panel uses `backdrop-filter`,
  and a filtered ancestor becomes the containing block for fixed descendants —
  so the menu would still be trapped. It has to leave the subtree entirely,
  which means a portal.

  Positioned from the anchor's own rect, and repositioned on scroll and resize,
  because a portalled element no longer moves with the thing it belongs to.
*/
export function AnchoredMenu({
  anchorRef,
  open,
  children,
  className = "",
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /*
    No separate `mounted` flag: nothing is portalled until `rect` has been
    measured, and measuring only happens in an effect, which never runs on the
    server. So the server render and the first client render both produce null,
    and hydration matches without a state write in an effect.
  */
  useEffect(() => {
    if (!open) return;

    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      /*
        Flip above the anchor when there is not room below. A menu that opens
        downward off the bottom of a short window is the same failure as being
        clipped — the options exist and cannot be reached.
      */
      const below = window.innerHeight - r.bottom;
      const wantsAbove = below < 220 && r.top > below;
      setRect({
        top: wantsAbove ? Math.max(8, r.top - Math.min(288, r.top - 8) - 4) : r.bottom + 4,
        left: r.left,
        width: r.width,
      });
    };

    place();
    // `true` so this also catches scrolls inside the filter panel, not just
    // the window's own — the anchor moves with either.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef]);

  if (!open || !rect) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
      className={className}
    >
      {children}
    </div>,
    document.body,
  );
}

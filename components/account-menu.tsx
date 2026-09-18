"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, User } from "lucide-react";
import { popoverSurface } from "@/components/ui";

/*
  The account actions, folded into one control.

  Signed in, the header had five text links racing the wordmark for room —
  fine on a desktop, 113px past the edge on a phone. Find shops and Garage stay
  inline because they are where people are going; the account things (settings,
  signing out) collapse here, which is both the standard place to look for them
  and the room the phone needed. On a phone it is an icon; from the small
  breakpoint up it carries its label too.

  A plain menu: click to open, click-away or Escape to close, and it closes
  itself when a link inside it is followed.
*/
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex items-center w-full min-h-11 px-3 rounded-control text-subhead text-label text-left " +
    "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-fill transition-[background-color] duration-150";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={
          "inline-flex items-center gap-1.5 min-h-11 px-2 sm:px-3 -mx-1 rounded-control " +
          "text-subhead text-secondary transition-[color,background-color] duration-150 " +
          "[@media(hover:hover)_and_(pointer:fine)]:hover:text-label " +
          "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-fill"
        }
      >
        <User aria-hidden="true" strokeWidth={2} className="size-5" />
        <span className="max-sm:sr-only">Account</span>
        <ChevronDown aria-hidden="true" strokeWidth={2} className="size-4 max-sm:hidden" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 mt-1.5 min-w-44 rounded-control p-1 z-50 ${popoverSurface}`}
        >
          <Link role="menuitem" href="/garage" className={item} onClick={() => setOpen(false)}>
            Garage
          </Link>
          <Link role="menuitem" href="/experiences/new" className={item} onClick={() => setOpen(false)}>
            Log a service
          </Link>
          <Link role="menuitem" href="/settings/account" className={item} onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              void signOut({ redirectTo: "/" });
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

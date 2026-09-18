"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, User } from "lucide-react";
import { popoverSurface } from "@/components/ui";

/*
  The account control: the person's name, and behind it their settings and a
  way out.

  The nav proper (find shops, garage, log a service) lives inline in the
  header; this holds only the account things. The button greets by name rather
  than saying "Account" — the name truncates so a long one cannot push the menu
  off the edge, and a person icon stands in until the name is known.

  A plain menu: click to open, click-away or Escape to close, and it closes
  itself when a link inside it is followed.
*/
export function AccountMenu({ displayName }: { displayName?: string | null }) {
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
        aria-label={displayName ? `Account: ${displayName}` : "Account menu"}
        className={
          "inline-flex items-center gap-1.5 min-h-11 px-2 sm:px-3 -mx-1 rounded-control " +
          "text-subhead font-medium text-secondary transition-[color,background-color] duration-150 " +
          "[@media(hover:hover)_and_(pointer:fine)]:hover:text-label " +
          "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-fill"
        }
      >
        <User aria-hidden="true" strokeWidth={2} className="size-5 shrink-0" />
        {/*
          The name takes the place "Account" held — shown from the small
          breakpoint up, where the label always was, and truncated so a long
          one cannot push the menu off the edge. A phone stays icon-only, which
          is what keeps the signed-in bar (wordmark, find shops, this) inside
          360px.
        */}
        <span className="max-sm:sr-only truncate max-w-[16ch]">{displayName || "Account"}</span>
        <ChevronDown aria-hidden="true" strokeWidth={2} className="size-4 shrink-0 max-sm:hidden" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 mt-1.5 min-w-44 rounded-control p-1 z-50 ${popoverSurface}`}
        >
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

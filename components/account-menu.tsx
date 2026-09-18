"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, User } from "lucide-react";
import { buttonStyles, popoverSurface } from "@/components/ui";

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
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  // Escape closes the confirm dialog too.
  useEffect(() => {
    if (!confirmingSignOut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmingSignOut(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmingSignOut]);

  /*
    No text colour in the base. Two colour utilities on one element let the
    cascade decide the winner, not the class order — which is how "Sign out"
    stayed ink-coloured with text-destructive appended. The colour is set per
    item instead so the destructive red actually lands.
  */
  const item =
    "flex items-center w-full min-h-11 px-3 rounded-control text-subhead text-left " +
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
          <Link role="menuitem" href="/settings/account" className={`${item} text-label`} onClick={() => setOpen(false)}>
            Settings
          </Link>
          {/*
            Red, and asks first. Signing out is the one action here that undoes
            itself only by signing back in, so it reads in the destructive
            colour and opens a confirmation rather than firing on the tap.
          */}
          <button
            type="button"
            role="menuitem"
            className={`${item} text-destructive font-medium`}
            onClick={() => {
              setOpen(false);
              setConfirmingSignOut(true);
            }}
          >
            Sign out
          </button>
        </div>
      )}

      {confirmingSignOut && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
          className="fixed inset-0 z-[100] grid place-items-center p-4"
        >
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setConfirmingSignOut(false)}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--label)_45%,transparent)]"
          />
          <div className={`relative w-full max-w-sm rounded-control p-6 ${popoverSurface}`}>
            <h2 id="signout-title" className="text-headline font-semibold">
              Sign out?
            </h2>
            <p className="mt-2 text-subhead text-secondary text-pretty">
              You&rsquo;ll need to sign in again to get back to your garage.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingSignOut(false)}
                className={`${buttonStyles.secondary} px-4`}
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                disabled={signingOut}
                onClick={() => {
                  setSigningOut(true);
                  void signOut({ redirectTo: "/" });
                }}
                className={`${buttonStyles.destructive} px-4`}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

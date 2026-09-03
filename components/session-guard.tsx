"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

/*
  Idle timeout, with the choice made explicit.

  The session cookie expires after twenty minutes on its own; this only
  decides what someone sees on the way there. Being dropped mid-form with no
  warning is the failure worth avoiding, so at eighteen minutes it asks, and
  the last two are theirs to answer in.

  Activity resets the clock. One polled interval rather than a timer per
  event: the listeners fire constantly on a page being used, and re-arming a
  timeout on every scroll tick would cost more than the feature is worth.
*/
const IDLE_MS = 20 * 60 * 1000;
const WARN_AT_MS = 18 * 60 * 1000;
const POLL_MS = 15_000;

export function SessionGuard() {
  const [warning, setWarning] = useState(false);
  // Seeded in the effect, not here: Date.now() during render is impure and
  // gives the server and the client different values.
  const last = useRef(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    last.current = Date.now();

    const bump = () => {
      last.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "focus"] as const;
    for (const e of events) window.addEventListener(e, bump, { passive: true });

    const id = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) signOut({ redirectTo: "/login?expired=1" });
      else setWarning(idle >= WARN_AT_MS);
    }, POLL_MS);

    return () => {
      for (const e of events) window.removeEventListener(e, bump);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (warning) panel.current?.querySelector<HTMLElement>("button")?.focus();
  }, [warning]);

  if (!warning) return null;

  const stay = () => {
    last.current = Date.now();
    setWarning(false);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      aria-describedby="idle-body"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4"
    >
      <div
        ref={panel}
        className="w-full max-w-sm rounded-card border border-separator bg-elevated p-6 animate-[sheet-in_200ms_cubic-bezier(0.23,1,0.32,1)]"
      >
        <h2 id="idle-title" className="text-headline font-semibold">
          Still there?
        </h2>
        <p id="idle-body" className="text-subhead text-secondary mt-2">
          You will be signed out shortly to keep your account safe.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={stay}
            className="flex-1 min-h-11 rounded-control bg-accent-fill text-on-accent text-subhead font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Stay signed in
          </button>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex-1 min-h-11 rounded-control border border-separator text-subhead transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

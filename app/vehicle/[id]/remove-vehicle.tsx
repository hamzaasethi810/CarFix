"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonStyles, popoverSurface } from "@/components/ui";

/*
  Removing a car from the garage.

  Owner-only (the page renders this only when the car is the viewer's own),
  and behind a confirmation because it takes a car and its whole logged
  history out of the garage in one tap. It is a soft delete on the server —
  the record and its services are kept, just hidden — but to the person doing
  it the car is gone, so it is worded and gated as a real removal.

  The trigger is quiet, not a primary button: this is a rare, destructive
  action that should be findable without competing with the page. The confirm
  dialog matches the sign-out dialog so the two destructive moments on the
  site feel like the same gesture.
*/
export function RemoveVehicle({ vehicleId, vehicleName }: { vehicleId: string; vehicleName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Escape closes the dialog, and focus lands on the confirm button when it
  // opens — the same affordances any modal owes a keyboard.
  useEffect(() => {
    if (!confirming) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !removing) setConfirming(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, removing]);

  async function remove() {
    setError(null);
    setRemoving(true);
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "That did not work. Please try again.");
        setRemoving(false);
        return;
      }
      // The garage is the place it was removed from, so that is where the
      // person returns — with fresh data so the car is already gone.
      router.push("/garage");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setRemoving(false);
    }
  }

  return (
    <div className="mt-16 border-t border-separator pt-6">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="text-footnote text-destructive font-medium underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:underline"
      >
        Remove this car from your garage
      </button>

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-vehicle-title"
          className="fixed inset-0 z-[100] grid place-items-center p-4"
        >
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => !removing && setConfirming(false)}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--label)_45%,transparent)]"
          />
          <div className={`relative w-full max-w-sm rounded-control p-6 ${popoverSurface}`}>
            <h2 id="remove-vehicle-title" className="text-headline font-semibold">
              Remove this car?
            </h2>
            <p className="mt-2 text-subhead text-secondary text-pretty">
              {vehicleName} and everything logged against it will be taken out of
              your garage. This can&rsquo;t be undone from here.
            </p>
            {error && <p className="mt-3 text-footnote text-destructive">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={removing}
                onClick={() => setConfirming(false)}
                className={`${buttonStyles.secondary} px-4`}
              >
                Cancel
              </button>
              <button
                ref={confirmRef}
                type="button"
                disabled={removing}
                onClick={remove}
                className={`${buttonStyles.destructive} px-4`}
              >
                {removing ? "Removing…" : "Remove car"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

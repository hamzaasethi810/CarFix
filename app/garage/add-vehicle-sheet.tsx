"use client";

import { useEffect, useRef, useState } from "react";
import { buttonStyles, popoverSurface } from "@/components/ui";
import { AddVehicleForm } from "./add-vehicle-form";

type Option = { id: string; name: string };

/*
  The add-car form, hidden until it is wanted.

  It used to occupy a permanent 340px column beside the cars. A form you see
  on every visit is an admin panel; the garage should be the cars, and the
  tool for adding one should stay out of the way until asked for.

  A dialog rather than an inline expander because the form is long enough to
  push the list off screen, and because focus can be held inside it.
*/
export function AddVehicleSheet({ makes }: { makes: Option[] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab") return;
      // Hold focus inside the dialog: tabbing out of a modal and landing on
      // the page behind it is disorienting and leaves the overlay stranded.
      const focusable = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Captured now: by cleanup time the ref may point somewhere else.
    const opener = trigger.current;
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("select, input")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      // Back to the button that opened it, not to the top of the document.
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        onClick={() => setOpen(true)}
        className={buttonStyles.primary}
        aria-haspopup="dialog"
      >
        Add a car
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-car-title"
            /*
              Enters from 0.97, never from 0: nothing in the real world
              appears out of nothing. Centred origin, because a modal is not
              anchored to its trigger.

              Square, like every other ruled region, but this one genuinely
              floats above the page — the same surface a menu opens on.
            */
            className={`w-full max-w-lg p-6 my-8 animate-[sheet-in_200ms_cubic-bezier(0.23,1,0.32,1)] ${popoverSurface}`}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 id="add-car-title" className="text-headline font-semibold">
                Add a car
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-m-2 inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-secondary transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                &times;
              </button>
            </div>
            <AddVehicleForm makes={makes} />
          </div>
        </div>
      )}
    </>
  );
}

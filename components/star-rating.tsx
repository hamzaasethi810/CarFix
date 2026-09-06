"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";

/*
  Five stars you click, not a dropdown pre-set to five.

  The old control was a <select> defaulting to "5 — Excellent" on every one of
  six categories, which is worse than it sounds. A pre-filled top score is not a
  neutral default: it is a rating the form supplies on the reviewer's behalf,
  and most people submit it untouched. That quietly poisons the only data this
  product has. Nothing is selected here until somebody selects it, and the form
  will not submit until they do.

  Built as a real radio group rather than a row of buttons. Radios give
  arrow-key selection, a single tab stop for the whole group, and a name that
  screen readers announce as "3 of 5, radio, 3 selected of 5" without any ARIA
  of my own. The visible stars are the labels; the inputs are the control.
*/
export function StarRating({
  name,
  label,
  value,
  onChange,
  required = true,
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  required?: boolean;
}) {
  const groupId = useId();
  /*
    Hover preview fills up to the star under the pointer, so the control shows
    what a click is about to do. Pointer only: on touch there is no hover, and
    a "preview" that only appears after you have already committed is noise.
  */
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value ?? 0;

  return (
    <fieldset className="min-w-0">
      <legend id={groupId} className="text-subhead font-medium text-label">
        {label}
      </legend>

      <div
        className="mt-1.5 flex items-center gap-1"
        onPointerLeave={() => setPreview(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= shown;
          return (
            <label
              key={n}
              /*
                44px of target on a 24px star. The padding does the work rather
                than the glyph, so the row stays visually light while every
                star is still a comfortable tap.
              */
              className="relative grid size-11 place-items-center cursor-pointer"
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setPreview(n);
              }}
            >
              <input
                type="radio"
                name={name}
                value={n}
                required={required}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {n} out of 5
              </span>
              <Star
                aria-hidden="true"
                strokeWidth={1.5}
                className={
                  "size-6 transition-[color,fill,transform] duration-[140ms] ease-[var(--ease-out)] " +
                  "peer-focus-visible:outline peer-focus-visible:outline-2 " +
                  "peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--accent)] " +
                  "active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 " +
                  (filled ? "fill-[var(--gold-fill)] text-[var(--gold-fill)]" : "fill-none text-separator")
                }
              />
            </label>
          );
        })}

        {/*
          The chosen value in words, beside the stars.

          A star row alone is ambiguous at a glance — four filled and one empty
          reads as "4" only if you count. Saying it removes the counting, and
          it is the only thing a screen reader needs from the group's state.
        */}
        <span aria-live="polite" className="ml-2 text-footnote text-secondary tabular-nums">
          {value ? `${value} of 5` : "Not rated"}
        </span>
      </div>
    </fieldset>
  );
}

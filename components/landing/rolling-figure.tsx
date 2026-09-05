"use client";

import { useEffect, useState } from "react";

/*
  An odometer.

  A car product has exactly one native numeric motion and this is it: digits
  rolling over, the way a trip meter does. It is used here for money because
  money is what this product counts, and because a figure that rolls into place
  reads as a mechanism producing a number rather than a page swapping text.

  Two details carry it, both taken from the technique rather than the code:

  1. ONLY THE DIGITS THAT ACTUALLY CHANGE MOVE. Rolling the whole number is
     noise. $1,690 becoming $1,740 should move two digits, not five, and the
     eye reads the difference immediately when the rest holds still.
  2. DIRECTION FOLLOWS THE VALUE. A digit that grew rolls up from below, one
     that shrank rolls down from above. Getting this backwards is the single
     thing that makes an odometer feel fake, because everyone has watched a
     real one.

  Implemented natively with a CSS animation rather than a spring library. The
  changes are user-driven and infrequent, so keyframes are never interrupted
  mid-flight in practice, and a CSS animation runs off the main thread, which
  matters on the one page where a font load and a data fetch already compete
  for it.
*/

export type Frame = {
  chars: string[];
  /** Per character: +1 rolled up, -1 rolled down, null did not change. */
  dirs: (number | null)[];
  /** Bumped per transition so a digit landing on its own character remounts. */
  id: number;
};

export function nextFrame(prev: Frame, value: string, animate: boolean): Frame {
  const chars = value.split("");
  if (!animate) return { chars, dirs: chars.map(() => null), id: prev.id + 1 };

  const before = prev.chars;
  const dirs = chars.map((c, i) => {
    /*
      Compared from the right. Money grows leftwards, so aligning the two
      strings by their last character is what makes "$990" to "$1,040" compare
      like for like instead of shifting every column by one.
    */
    const j = before.length - (chars.length - i);
    const was = j >= 0 ? before[j] : undefined;
    if (!/\d/.test(c) || was === undefined || was === c) return null;
    return Number(c) > Number(was) ? 1 : -1;
  });
  return { chars, dirs, id: prev.id + 1 };
}

export function RollingFigure({
  value,
  className = "",
  label,
}: {
  /** A formatted string. Non-digits (currency marks, separators) stay put. */
  value: string;
  className?: string;
  /** Announced instead of the digits, so a screen reader hears one figure. */
  label?: string;
}) {
  /*
    The frame is STATE, not something derived during render.

    An earlier version compared the incoming value against a ref updated in an
    effect. That looked right and was not: the parent re-renders more than once
    per change (a fetch resolving sets two pieces of state), and every later
    render recomputed the comparison as "nothing changed" and stripped the
    animation class off mid-flight. The value updated and the roll never played.
    Holding the frame in state means a transition survives its own duration
    regardless of what else re-renders.
  */
  const [frame, setFrame] = useState<Frame>(() => ({
    chars: value.split(""),
    dirs: value.split("").map(() => null),
    id: 0,
  }));

  useEffect(() => {
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFrame((prev) => (prev.chars.join("") === value ? prev : nextFrame(prev, value, animate)));
  }, [value]);

  return (
    <span className={`rolling-wrap ${className}`}>
      {/*
        The accessible name is a real text node rather than an aria-label on a
        generic span: role="text" is a Safari-ism, and an aria-label on a span
        with no role is ignored by several screen readers, which would leave
        the figure announced as a string of loose characters.
      */}
      <span className="sr-only">{label ?? value}</span>

      <span aria-hidden="true" className="rolling">
        {frame.chars.map((char, i) => {
          const dir = frame.dirs[i];

          if (!/\d/.test(char)) {
            return (
              <span key={`s${i}`} className="rolling-sep">
                {char}
              </span>
            );
          }

          return (
            <span key={`d${i}`} className="rolling-cell">
              <span
                key={dir === null ? `hold-${char}` : `roll-${frame.id}`}
                className={dir === null ? undefined : "rolling-digit"}
                style={dir === null ? undefined : ({ "--dir": String(dir) } as React.CSSProperties)}
              >
                {char}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

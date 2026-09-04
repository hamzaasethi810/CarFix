"use client";

import { useEffect, useRef, useState } from "react";
import { Stamp } from "@/components/ui";

/*
  The signature interaction, and the only one on the site.

  One component in two places, which is the whole argument. On the landing page
  it runs once on scroll-in and demonstrates the mechanism. On the filing form
  it runs live as the owner types, and there it is a real validation: the stamp
  lands only when parts plus labour plus tax equals the total they entered.

  A marketing animation that is also the product's validation cannot be a lie.
  That is the only reason this one is worth animating at all.
*/

/*
  Cents, but only when there are cents.

  The shared money() helper rounds to whole dollars, which is right for a price
  range and wrong here. This component's entire job is showing that a column of
  figures adds up, and rounding each line independently breaks that on screen
  even when the arithmetic is correct: 100.40 plus 50.40 renders as "$100 +
  $50 = $151", which reads as a bug in the one place the product is asking to
  be trusted with numbers. So the whole block switches to cents together the
  moment any single value needs them.
*/
function formatter(values: number[]) {
  const needsCents = values.some((v) => Math.round(v * 100) % 100 !== 0);
  return (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: needsCents ? 2 : 0,
      maximumFractionDigits: needsCents ? 2 : 0,
    });
}

export function Reconciliation({
  lines,
  total,
  live = false,
  className = "",
}: {
  lines: { label: string; amount: number }[];
  total: number;
  /** true = validate live as the owner types. false = animate once on scroll-in. */
  live?: boolean;
  className?: string;
}) {
  const sum = lines.reduce((n, l) => n + l.amount, 0);

  /*
    Compared in integer cents rather than floats.

    0.1 + 0.2 !== 0.3 in binary floating point, and a receipt of 19.99 plus
    5.01 against a total of 25.00 is exactly the shape that trips it. Rounding
    each side to cents first makes the comparison exact for every value a
    currency field can hold, which an epsilon tolerance only approximates.
  */
  const cents = (n: number) => Math.round(n * 100);
  const reconciles = lines.length > 0 && cents(sum) === cents(total);

  const money = formatter([...lines.map((l) => l.amount), total]);

  const ref = useRef<HTMLDivElement>(null);
  /*
    Live mode starts settled. There is no entrance animation on a form the
    owner is typing into: that motion would replay on the way to every
    keystroke's result, and animating something touched this often is how an
    interface starts feeling slow. Only the stamp moves there, and only when
    the boolean it represents actually changes.
  */
  const [arrived, setArrived] = useState(live);

  useEffect(() => {
    if (live) return;

    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setArrived(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setArrived(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [live]);

  const settled = arrived && reconciles;

  return (
    <div ref={ref} className={className}>
      <dl>
        {lines.map((l, i) => (
          <div
            key={l.label}
            data-pending={arrived ? undefined : ""}
            style={
              live ? undefined : ({ "--line-delay": `${i * 60}ms` } as React.CSSProperties)
            }
            className="recon-line flex items-baseline justify-between border-b border-separator py-2.5"
          >
            <dt className="text-subhead text-secondary">{l.label}</dt>
            <dd className="tabular text-body">{money(l.amount)}</dd>
          </div>
        ))}
      </dl>

      {/*
        The total sits under a heavier rule than the lines above it.

        On a real repair order the sum is ruled off twice; here one weight
        change does the same job without the second line becoming decoration.
      */}
      <div className="flex items-baseline justify-between border-b-2 border-label pt-3 pb-2.5">
        <span className="text-headline font-semibold">Total</span>
        <span className="tabular text-title2 font-semibold">{money(total)}</span>
      </div>

      <div className="mt-5 flex min-h-9 justify-end">
        {/*
          The stamp makes contact.

          scale(0.97) rather than scale(0), because nothing in the real world
          appears out of nothing and a stamp emerging from a point reads as a
          UI trick rather than an object touching paper. The 2px blur clearing
          over the same 140ms is what sells the contact; blur is doing the work
          a crossfade cannot, bridging two states into one movement.

          aria-hidden on the wrapper, with the live region below carrying the
          words: an assistive technology should hear the outcome, not watch a
          decoration arrive.
        */}
        {/*
          State lives in globals.css as an attribute selector, matching the
          .reveal convention already in this project rather than introducing a
          second way of expressing the same thing.
        */}
        <div aria-hidden="true" className="recon-stamp" data-settled={settled ? "" : undefined}>
          <Stamp>Reconciled</Stamp>
        </div>
      </div>

      {/*
        The outcome in words.

        Live only: on the landing page this is a demonstration and there is no
        state for anyone to act on, so announcing it would be noise. On the
        filing form it is the whole feedback loop, and it must not depend on
        having seen a stamp appear.
      */}
      {live && (
        <p role="status" className="mt-2 text-right text-footnote text-secondary">
          {reconciles
            ? "Parts, labour and tax match the total."
            : "Parts, labour and tax do not add up to the total yet."}
        </p>
      )}
    </div>
  );
}

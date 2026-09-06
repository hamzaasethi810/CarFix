import { Check } from "lucide-react";

/*
  A worked receipt, in the one section that is about receipts.

  An earlier version of this page opened with a mock repair order as its hero,
  which was wrong: it demanded that a stranger read an invented document before
  being told what the site was for. This is the same idea in the place it
  belongs — beside the paragraph explaining that a price is only worth
  something with a receipt behind it. Here it is the illustration for a claim
  already made rather than the claim itself.

  Labelled an example, in the markup and on screen, because no price has been
  filed yet and every figure below is therefore invented. The shop is not named
  for the same reason: attaching a made-up total to a real business would be a
  small libel, and inventing a business name to avoid that is its own kind of
  lie. "Independent specialist" is true of the shape without naming anyone.

  The car is a W204 C63 — the 6.2 V8 C-Class. Brakes on one are genuinely
  expensive, which is the point: it is exactly the job where a quote is
  impossible to sanity-check without knowing what other owners paid.
*/

const RECEIPT = {
  vehicle: "Mercedes-Benz C63 AMG",
  generation: "W204",
  shop: "Independent specialist",
  date: "March 2026",
  lines: [
    { label: "Front discs, pair", figure: "$742" },
    { label: "Front pads, set", figure: "$318" },
    { label: "Labour, 3.5 hrs", figure: "$455" },
  ],
  total: "$1,515",
} as const;

export function ReceiptExample() {
  return (
    <figure
      data-example="true"
      className="border border-separator bg-elevated rounded-control p-6 sm:p-7"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-separator pb-4">
        <div className="min-w-0">
          <p className="text-headline font-semibold truncate">{RECEIPT.vehicle}</p>
          <p className="text-footnote text-secondary mt-1">
            {RECEIPT.shop} · {RECEIPT.date}
          </p>
        </div>
        <span className="tabular text-footnote text-tertiary-label uppercase shrink-0">
          {RECEIPT.generation}
        </span>
      </div>

      <dl className="pt-2">
        {RECEIPT.lines.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline justify-between gap-4 border-b border-separator py-2.5"
          >
            <dt className="text-subhead text-secondary">{l.label}</dt>
            <dd className="tabular text-subhead">{l.figure}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-baseline justify-between gap-4 border-b-2 border-label pt-3 pb-2.5">
        <span className="text-subhead font-semibold">Total paid</span>
        <span className="tabular text-title3 font-semibold">{RECEIPT.total}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-footnote font-medium text-accent">
          <Check aria-hidden="true" strokeWidth={2.25} className="size-4 shrink-0" />
          Receipt checked
        </span>
        <figcaption className="text-caption text-tertiary-label">
          An example. No prices have been filed yet.
        </figcaption>
      </div>
    </figure>
  );
}

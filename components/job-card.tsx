/*
  A workshop job card.

  The governing object for the whole interface. Gaari's core record already IS
  a physical thing — vehicle, work done, who did it, what it cost — and a
  service docket has a century of visual language behind it. Building the UI
  as that object is what stops the materials being scattered decoration: card
  stock is what you read, metal is what you grip, ink is what attests, green
  is what acts.

  Four rules hold the whole system together, and they are worth stating
  because breaking any one of them is what makes skeuomorphism read as fake:

    1. One governing object. Not "metal things".
    2. One light source: above and slightly left. Top edges catch light,
       shadows fall down. Always.
    3. Materials have jobs. Metal appears ONCE here, on the clip, gripping.
    4. Depth is earned. The card lifts; pressables press in.
*/
import type { ReactNode } from "react";

export function VehiclePlate({ children }: { children: ReactNode }) {
  return (
    /*
      The wordmark's plate, at badge size.

      Extending the logo's own shape language to the vehicle identity means
      the brand appears on every record rather than only in the corner — and
      a number plate is the one piece of automotive iconography everybody
      reads instantly, in any country.
    */
    <span className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 font-condensed text-footnote font-bold uppercase tracking-[0.09em] text-[#EFE7C8] bg-[linear-gradient(180deg,#20301f,#16210f)] shadow-[inset_0_0_0_1.5px_rgba(239,231,200,0.45),0_1px_2px_rgba(0,0,0,0.3)]">
      {children}
    </span>
  );
}

/*
  Ink on paper: it attests, it does not act — so it is never a button colour.

  Laid out in the header row rather than absolutely positioned over the card.
  Two attempts at overlapping it collided with real content: first the action
  button, then the date. A stamp that obscures the thing it is vouching for is
  worse than one that sits beside it, and the slight rotation is enough to
  read as pressed by hand.
*/
function VerifiedStamp() {
  return (
    <span
      className="select-none -rotate-[8deg] rounded-[3px] border-2 px-1.5 py-px font-condensed text-caption font-bold uppercase tracking-[0.11em] opacity-85"
      style={{ borderColor: "var(--stamp)", color: "var(--stamp)" }}
    >
      Verified
    </span>
  );
}

export function JobCard({
  vehicle,
  service,
  shop,
  place,
  date,
  reported,
  median,
  verified = false,
  action,
}: {
  vehicle: string;
  service: string;
  shop: string;
  place?: string;
  date: string;
  /** Already formatted for display, e.g. "$742". */
  reported: string;
  /** Already formatted. Omitted when there is nothing to compare against. */
  median?: string;
  verified?: boolean;
  action?: ReactNode;
}) {
  return (
    <article className="relative rounded-card bg-elevated shadow-card p-5 pt-6">
      {/*
        The clip: the only metal on the card, doing the job a clip does.
        Decorative to a screen reader — it holds nothing it can announce.

        Two elements rather than one, and not by preference. `.machined` is an
        unlayered rule, and an unlayered rule beats anything in @layer
        utilities regardless of specificity — so putting `absolute` on the
        same element loses to .machined's own `position: relative`. It stayed
        inline, which meant `h-6 w-24` were ignored too and the clip rendered
        0x0. The wrapper owns the position and size; the material sits inside
        it and fills it.
      */}
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-24 rounded-[3px] shadow-[0_1px_2px_rgba(30,33,29,0.35),0_4px_8px_-2px_rgba(30,33,29,0.3)]"
      >
        <span className="machined block h-full w-full rounded-[3px]" />
      </span>

      <div className="flex items-baseline justify-between gap-3">
        <VehiclePlate>{vehicle}</VehiclePlate>
        <div className="flex items-baseline gap-2 shrink-0">
          {verified && <VerifiedStamp />}
          <span className="text-footnote text-secondary">{date}</span>
        </div>
      </div>

      <h3 className="text-headline font-semibold mt-4">{service}</h3>
      <p className="text-subhead text-secondary mt-0.5">
        {shop}
        {place ? ` · ${place}` : ""}
      </p>

      {/* A dashed rule, because a docket is torn along one. */}
      <hr className="my-4 border-0 border-t border-dashed border-separator" />

      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-caption font-semibold uppercase tracking-[0.12em] text-secondary">
            Owner reported
          </div>
          {/*
            Tabular numerals, condensed face, and the largest type on the
            card. The price is the entire point of the product and until now
            rendered in the same grey as everything around it.
          */}
          <div className="font-condensed font-bold text-large-title leading-none tabular-nums">
            {reported}
          </div>
        </div>
        {median && (
          <div className="text-right">
            <div className="text-caption font-semibold uppercase tracking-[0.12em] text-secondary">
              Area median
            </div>
            <div className="font-condensed font-bold text-title2 leading-none tabular-nums text-secondary">
              {median}
            </div>
          </div>
        )}
      </div>

      {action && <div className="mt-4">{action}</div>}

    </article>
  );
}

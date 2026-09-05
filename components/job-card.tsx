/*
  A workshop job card.

  Gaari's core record already IS a physical thing — vehicle, work done, who
  did it, what it cost — and a service docket has a century of visual
  language behind it. This used to carry that further into skeuomorphism: a
  raised card, a metal clip gripping it from above, one light source. That
  reads as a decoration the moment the rest of the site stops floating things
  above the page, so the card is a Sheet now, ruled off by its own top edge
  like every other document region, and the clip is gone with it.

  What survives is the plate — the one piece of automotive iconography
  everybody reads instantly — and the stamp, which still only ever attests,
  never acts.
*/
import type { ReactNode } from "react";
import { Sheet, Stamp } from "@/components/ui";

export function VehiclePlate({ children }: { children: ReactNode }) {
  return (
    /*
      The wordmark's plate, at badge size.

      Extending the logo's own shape language to the vehicle identity means
      the brand appears on every record rather than only in the corner — and
      a number plate is the one piece of automotive iconography everybody
      reads instantly, in any country. Inked in --label rather than the
      retired forest green: the plate is the same document ink as everything
      else on the page, just reversed.
    */
    <span className="tabular inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-footnote font-bold uppercase tracking-[0.09em] text-elevated bg-label shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.35),0_1px_2px_rgba(16,27,46,0.3)]">
      {children}
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
    <Sheet as="article" className="p-5 pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <VehiclePlate>{vehicle}</VehiclePlate>
        <div className="flex items-baseline gap-2 shrink-0">
          {verified && <Stamp>Verified</Stamp>}
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
            Tabular numerals, mono face, and the largest type on the card. The
            price is the entire point of the product and until now rendered
            in the same grey as everything around it.
          */}
          <div className="tabular font-bold text-large-title leading-none">
            {reported}
          </div>
        </div>
        {median && (
          <div className="text-right">
            <div className="text-caption font-semibold uppercase tracking-[0.12em] text-secondary">
              Area median
            </div>
            <div className="tabular font-bold text-title2 leading-none text-secondary">
              {median}
            </div>
          </div>
        )}
      </div>

      {action && <div className="mt-4">{action}</div>}
    </Sheet>
  );
}

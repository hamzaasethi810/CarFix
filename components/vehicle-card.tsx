import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Code, money, num } from "@/components/ui";

/*
  A car, as a card.

  The garage was a ruled table with the car's name under a column headed
  "Operation" — a repair-order shape imposed on something that is not a repair
  order. A garage is a small set of things you own and recognise on sight, not
  a list of line items, and three cars in a table read like an invoice for
  owning them.

  What a card gets that a row does not: the identity can breathe on two lines,
  the two figures can be big enough to read at a glance, and the whole thing is
  one obvious target rather than a row you hope is clickable.

  The stat that is missing is left out rather than dashed. A car with nothing
  logged says "Nothing logged yet" once, which is a sentence; the table said
  "—" twice, which reads as data that failed to arrive.
*/
export function VehicleCard({
  href,
  name,
  identity,
  code,
  services,
  spent,
  index = 0,
}: {
  href: string;
  name: string;
  /** Year, make, model. Shown under the name when the car has a nickname. */
  identity?: string;
  code?: string;
  services?: number;
  spent?: number;
  /** Position in the grid, so the entrance can stagger. */
  index?: number;
}) {
  const logged = Boolean(services);

  return (
    <Link
      href={href}
      style={{ ["--enter-delay" as string]: `${index * 60}ms` }}
      className={
        "card-enter group relative flex flex-col justify-between gap-6 " +
        "border border-separator bg-elevated p-5 rounded-control " +
        "transition-[border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] " +
        "[@media(hover:hover)_and_(pointer:fine)]:hover:border-accent " +
        "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-raised " +
        /*
          motion-safe rather than a motion-reduce reset afterwards. Cancelling
          a lift once it has been declared still leaves the declaration there
          for anything that reads the class list, and it needed an ungated
          hover: to do the cancelling. Not applying it at all is simpler and
          honest: under reduced motion the card just does not move.
        */
        "motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 " +
        "motion-reduce:transition-none"
      }
    >
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-title3 font-semibold tracking-tight truncate">{name}</h3>
          {code && <Code>{code}</Code>}
        </div>
        {identity && (
          <p className="text-subhead text-secondary mt-1 truncate">{identity}</p>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        {logged ? (
          <dl className="flex items-end gap-8">
            <div>
              <dd className="tabular text-title2 font-semibold leading-none">{num(services)}</dd>
              <dt className="text-caption text-tertiary-label mt-1.5">
                {services === 1 ? "service" : "services"}
              </dt>
            </div>
            {spent ? (
              <div>
                <dd className="tabular text-title2 font-semibold leading-none">{money(spent)}</dd>
                <dt className="text-caption text-tertiary-label mt-1.5">spent</dt>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-subhead text-tertiary-label">Nothing logged yet</p>
        )}

        {/*
          The chevron moves a little on hover, gated to real pointers. It is
          the only motion on the card that is purely an affordance: it says the
          card goes somewhere, which a flat tile does not.
        */}
        <ChevronRight
          aria-hidden="true"
          strokeWidth={1.5}
          className={
            "size-5 shrink-0 text-tertiary-label transition-transform duration-150 " +
            "ease-[var(--ease-out)] " +
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 " +
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:text-accent " +
            "motion-reduce:transition-none"
          }
        />
      </div>
    </Link>
  );
}

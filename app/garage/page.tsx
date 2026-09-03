import Link from "next/link";
import { redirect } from "next/navigation";
import { miles, money } from "@/components/ui";
import { CountUp } from "@/components/landing/count-up";
import { currentUser } from "@/lib/auth/guards";
import { getGarage, getGarageTotals } from "@/lib/services/vehicles";
import { getMakes } from "@/lib/services/taxonomy";
import { AddVehicleSheet } from "./add-vehicle-sheet";

/*
  The garage, as a dashboard.

  It was a list of cards with a chevron on each, which is the shape of a
  settings screen: every row an identical rounded box floating on a ground,
  nothing to read at a glance, and a permanent add-a-car form taking a third
  of the width.

  What it is now: totals across the top, then one line per car. Cards are
  gone. Elevation should mean something, and thirty-odd screens of floating
  boxes had made it mean nothing, so separation comes from rules and space.
  The only thing that still floats is the add-car dialog, which genuinely is
  above the page.

  Each row carries the identity and the money. Everything else — engine,
  drivetrain, trim, platform, mileage — sits behind a disclosure, because a
  spec sheet printed across every row is what made the old page unreadable.
*/
export default async function GaragePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [vehicles, makes, totals] = await Promise.all([
    getGarage(user.id),
    getMakes(),
    getGarageTotals(user.id),
  ]);

  const services = [...totals.values()].reduce((n, t) => n + t.services, 0);
  const spent = [...totals.values()].reduce((n, t) => n + t.spent, 0);

  /*
    Zero is not a statistic, it is an admission. A garage with nothing logged
    shows the cars and asks for the first service, rather than three noughts.
  */
  const summary: [number, string, boolean][] = [
    [vehicles.length, vehicles.length === 1 ? "Car" : "Cars", false],
    [services, services === 1 ? "Service logged" : "Services logged", false],
    [spent, "Total spent", true],
  ].filter(([n]) => (n as number) > 0) as [number, string, boolean][];

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-10 sm:pt-14">
        <div>
          <h1 className="text-title1 font-semibold">Your garage</h1>
          <p className="text-subhead text-secondary mt-1.5">
            The cars you own, and what they have cost you.
          </p>
        </div>
        <AddVehicleSheet makes={makes} />
      </div>

      {summary.length > 0 && (
        <dl className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-8 border-t border-separator pt-8">
          {summary.map(([n, label, isMoney]) => (
            <div key={label}>
              <dd className="font-condensed font-bold text-title1 leading-none">
                {isMoney ? money(n) : <CountUp value={n} />}
              </dd>
              <dt className="text-footnote text-secondary mt-1.5">{label}</dt>
            </div>
          ))}
        </dl>
      )}

      {vehicles.length === 0 ? (
        <div className="mt-16 border-t border-separator pt-16 text-center">
          <h2 className="text-headline font-semibold">No cars yet</h2>
          <p className="text-subhead text-secondary mt-2 max-w-sm mx-auto">
            Use Add a car above to put the first one in, then log what you have
            paid to keep it running.
          </p>
        </div>
      ) : (
        <ul className="mt-10 border-t border-separator divide-y divide-separator">
          {vehicles.map((v) => {
            const t = totals.get(v.id);
            const spec = [
              v.trim && ["Trim", v.trim],
              v.engine && ["Engine", v.engine],
              v.drivetrain && ["Drivetrain", v.drivetrain],
              v.platform && ["Platform", v.platform],
              v.mileage !== null && ["Mileage", miles(v.mileage)],
            ].filter(Boolean) as [string, string][];

            return (
              <li key={v.id}>
                {/*
                  Native details, not a JS accordion: keyboard support,
                  aria-expanded and find-in-page all come free, and it still
                  opens with JavaScript off.
                */}
                <details className="group">
                  <summary
                    className="flex items-baseline gap-4 py-5 cursor-pointer list-none border-l-2 border-transparent -ml-4 pl-4 transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:border-accent"
                  >
                    {/*
                      The chassis code leads. It is the thing an enthusiast
                      actually recognises, and it was previously a grey pill
                      easily mistaken for a caption.
                    */}
                    <span className="font-condensed font-bold text-title3 tabular-nums shrink-0 w-24">
                      {v.generation}
                    </span>

                    {/*
                      The second line only appears when the first is a
                      nickname. Without a nickname the title already reads
                      "2021 BMW M3", and repeating it underneath was the
                      same string printed twice.
                    */}
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-medium truncate">
                        {v.nickname ?? `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`}
                      </span>
                      {v.nickname && (
                        <span className="block text-footnote text-secondary truncate mt-0.5">
                          {v.year} {v.make} {v.model}
                          {v.trim ? ` ${v.trim}` : ""}
                        </span>
                      )}
                    </span>

                    <span className="text-right shrink-0">
                      <span className="block text-body tabular-nums">
                        {t?.spent ? money(t.spent) : <span className="text-tertiary-label">Nothing logged</span>}
                      </span>
                      {t?.services ? (
                        <span className="block text-footnote text-secondary mt-0.5">
                          {t.services} {t.services === 1 ? "service" : "services"}
                        </span>
                      ) : null}
                    </span>
                  </summary>

                  <div className="pb-6 pl-28 pr-1">
                    {spec.length > 0 && (
                      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                        {spec.map(([k, val]) => (
                          <div key={k}>
                            <dt className="text-caption text-tertiary-label">{k}</dt>
                            <dd className="text-subhead mt-0.5">{val}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <div className="mt-5 flex flex-wrap gap-4">
                      <Link href={`/vehicle/${v.id}`} className="text-subhead text-accent hover:underline underline-offset-4">
                        Service history
                      </Link>
                      <Link href="/experiences/new" className="text-subhead text-accent hover:underline underline-offset-4">
                        Log a service
                      </Link>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Account settings reachable from the page people actually live on.
        A link rather than the delete control itself: an irreversible action
        duplicated in two places is two places to hit it by accident, and the
        real one already exists on the security page.
      */}
      <footer className="mt-20 border-t border-separator pt-6">
        <Link
          href="/settings/security"
          className="text-footnote text-secondary hover:text-label transition-colors duration-150"
        >
          Password, two-factor and deleting your account
        </Link>
      </footer>
    </main>
  );
}

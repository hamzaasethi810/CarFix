import Link from "next/link";
import { redirect } from "next/navigation";
import { BlankForm, Figure, money } from "@/components/ui";
import { VehicleCard } from "@/components/vehicle-card";
import { CountUp } from "@/components/landing/count-up";
import { currentUser } from "@/lib/auth/guards";
import { getGarage, getGarageTotals } from "@/lib/services/vehicles";
import { getMakes } from "@/lib/services/taxonomy";
import { AddVehicleSheet } from "./add-vehicle-sheet";

/*
  The garage, as a ledger.

  It was a list of cards with a chevron on each, which is the shape of a
  settings screen: every row an identical rounded box floating on a ground,
  nothing to read at a glance, and a permanent add-a-car form taking a third
  of the width.

  What it is now: totals across the top as Figures, then one ruled line per
  car. Cards are gone. Elevation should mean something, and thirty-odd
  screens of floating boxes had made it mean nothing, so separation comes
  from rules and space. The only thing that still floats is the add-car
  dialog, which genuinely is above the page.

  Each line carries the identity, the chassis code and the money. The rest of
  a car's spec — engine, drivetrain, trim, platform, mileage — now lives on
  the car's own record at /vehicle/[id], behind a disclosure there: a spec
  sheet printed across every row here is what made the old page unreadable.
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
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-8 border-t border-separator pt-8">
          {summary.map(([n, label, isMoney]) => (
            <Figure key={label} value={isMoney ? money(n) : <CountUp value={n} />} label={label} />
          ))}
        </div>
      )}

      {vehicles.length === 0 ? (
        <BlankForm
          title="No cars yet"
          hint="Use Add a car above to put the first one in, then log what you have paid to keep it running."
        />
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {vehicles.map((v, i) => {
            const t = totals.get(v.id);
            const identity = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`;
            return (
              <VehicleCard
                key={v.id}
                index={i}
                href={`/vehicle/${v.id}`}
                name={v.nickname ?? identity}
                identity={v.nickname ? identity : undefined}
                code={v.generation}
                services={t?.services}
                spent={t?.spent}
              />
            );
          })}
        </div>
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

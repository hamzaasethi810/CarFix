import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, EmptyState, PageTitle, miles } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getGarage } from "@/lib/services/vehicles";
import { getMakes } from "@/lib/services/taxonomy";
import { AddVehicleForm } from "./add-vehicle-form";

export default async function GaragePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [vehicles, makes] = await Promise.all([getGarage(user.id), getMakes()]);

  return (
    <>
      <PageTitle
        title="Your garage"
        subtitle="Add the cars you own, then log the work done on them."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section aria-label="Your cars">
          {vehicles.length === 0 ? (
            <EmptyState title="No cars yet" hint="Add your first car to start logging services." />
          ) : (
            <ul className="space-y-3">
              {vehicles.map((v) => (
                <li key={v.id}>
                  <Link href={`/vehicle/${v.id}`} className="block group">
                    <Card className="group-hover:bg-tertiary transition-colors duration-150">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h2 className="text-headline font-semibold">
                          {v.nickname ?? `${v.year} ${v.make} ${v.model}`}
                        </h2>
                        <span className="text-subhead text-secondary">{v.generation}</span>
                      </div>
                      <p className="text-subhead text-secondary mt-1">
                        {v.year} {v.make} {v.model}
                        {v.trim && ` ${v.trim}`}
                        {v.mileage !== null && ` · ${miles(v.mileage)}`}
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card>
          <h2 className="text-headline font-semibold mb-4">Add a car</h2>
          <AddVehicleForm makes={makes} />
        </Card>
      </div>
    </>
  );
}

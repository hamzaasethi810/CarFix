import { notFound } from "next/navigation";
import {
  BlankForm,
  Columns,
  OperationLine,
  SectionTitle,
  SheetHeader,
  formatDate,
  miles,
  money,
} from "@/components/ui";
import { Reconciliation } from "@/components/reconciliation";
import { RemoveVehicle } from "./remove-vehicle";
import { currentUser } from "@/lib/auth/guards";
import { getVehicle } from "@/lib/services/vehicles";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";

/*
  The car's own record.

  This used to be a title, three grey Detail cards and two stacks of
  ExperienceCards — the shape of a settings screen again. The VIN the brief
  for this page asked for as the header's code does not exist anywhere in the
  data model: Vehicle is never issued one, only decoded transiently while
  adding a car (lib/services/vin.ts). The generation's chassis code is what
  actually identifies a car on this site — see Code's own doc comment, "an
  operation code, VIN, or chassis code" — so that is what sits in SheetHeader
  instead.

  Full spec sits behind a disclosure, the way the garage row's used to,
  because a spec sheet printed in the open is what made that page unreadable.
  The car's own filed services are a ledger; other owners' reports for the
  same generation are a second, otherwise-identical ledger, so an empty one
  can keep the same column heads as the filled one.
*/
export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();

  const vehicle = await getVehicle(id, user?.id).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });

  const [own, generation, generationPricing] = await Promise.all([
    browseExperiences({ vehicleId: id, limit: 20, offset: 0 }, user?.id),
    browseExperiences({ generationId: vehicle.generationId, limit: 10, offset: 0 }, user?.id),
    getPricing({ generationId: vehicle.generationId }),
  ]);

  /*
    The car's own experiences already appear above, so showing them again in
    the generation roll-up reads as a duplicate. Only other cars appear here.
  */
  const otherGenerationExperiences = generation.items.filter((e) => e.vehicle.id !== id);

  const spec = [
    vehicle.owner && ["Owner", vehicle.owner.displayName],
    vehicle.trim && ["Trim", vehicle.trim],
    vehicle.engine && ["Engine", vehicle.engine],
    vehicle.drivetrain && ["Drivetrain", vehicle.drivetrain],
    vehicle.platform && ["Platform", vehicle.platform],
    vehicle.mileage !== null && ["Mileage", miles(vehicle.mileage)],
  ].filter(Boolean) as [string, string][];

  const partsSum = own.items.reduce((n, e) => n + (e.partsCost ?? 0), 0);
  const laborSum = own.items.reduce((n, e) => n + (e.laborCost ?? 0), 0);
  const totalSpend = own.items.reduce((n, e) => n + e.totalPrice, 0);

  return (
    <>
      <SheetHeader
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`}
        code={vehicle.generation}
      />

      {spec.length > 0 && (
        <details className="mt-4 border-b border-separator pb-4">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-subhead font-medium text-accent underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
            Full spec
          </summary>
          <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
            {spec.map(([k, val]) => (
              <div key={k}>
                <dt className="text-caption text-tertiary-label">{k}</dt>
                <dd className="text-subhead mt-0.5">{val}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <SectionTitle>Service history for this car</SectionTitle>
      {own.items.length === 0 ? (
        <BlankForm
          heads={["Date", "Cost"]}
          title="Nothing logged yet"
          hint="Log a service to start building this car's history."
        />
      ) : (
        <>
          <Columns first="Service" heads={["Date", "Cost"]} label="Filed services">
            {own.items.map((e) => (
              <OperationLine
                key={e.id}
                label={e.service.name}
                code={e.mechanic.name}
                figures={[formatDate(e.serviceDate), money(e.totalPrice)]}
                href={`/experiences/${e.id}`}
              />
            ))}
          </Columns>

          <Reconciliation
            lines={[
              { label: "Parts", amount: partsSum },
              { label: "Labor", amount: laborSum },
            ]}
            total={totalSpend}
            live={false}
            className="mt-8 max-w-sm ml-auto"
          />
        </>
      )}

      <SectionTitle
        hint={`${generationPricing.label}${
          generationPricing.median !== null
            ? ` · median ${money(generationPricing.median)}`
            : ""
        }`}
      >
        {vehicle.generation} data
      </SectionTitle>

      {otherGenerationExperiences.length === 0 ? (
        <BlankForm heads={["Reported"]} title={`No other ${vehicle.generation} experiences yet`} />
      ) : (
        <Columns first="Service" heads={["Reported"]} label={`Other ${vehicle.generation} experiences`}>
          {otherGenerationExperiences.map((e) => (
            <OperationLine
              key={e.id}
              label={`${e.vehicle.year} ${e.vehicle.make} ${e.vehicle.model}`}
              code={e.mechanic.name}
              figures={[money(e.totalPrice)]}
              href={`/experiences/${e.id}`}
            />
          ))}
        </Columns>
      )}

      {vehicle.isOwn && (
        <RemoveVehicle
          vehicleId={vehicle.id}
          vehicleName={vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        />
      )}
    </>
  );
}

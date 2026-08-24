import { notFound } from "next/navigation";
import { Card, EmptyState, PageTitle, SectionTitle, miles, money } from "@/components/ui";
import { ExperienceCard } from "@/components/experience-card";
import { currentUser } from "@/lib/auth/guards";
import { getVehicle } from "@/lib/services/vehicles";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-footnote text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-headline font-semibold mt-1">{value}</p>
    </Card>
  );
}

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

  return (
    <>
      <PageTitle
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`}
        subtitle={[vehicle.generation, vehicle.platform].filter(Boolean).join(" · ")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Detail label="Owner" value={vehicle.owner?.displayName ?? "Unknown"} />
        <Detail
          label="Mileage"
          value={
            vehicle.mileage === null ? "Not reported" : miles(vehicle.mileage)
          }
        />
        <Detail
          label="Engine / drivetrain"
          value={[vehicle.engine, vehicle.drivetrain].filter(Boolean).join(" · ") || "Not reported"}
        />
      </div>

      <SectionTitle>Service history for this car</SectionTitle>
      {own.items.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          hint="Log a service to start building this car's history."
        />
      ) : (
        <ul className="space-y-3">
          {own.items.map((e) => (
            <li key={e.id}>
              <ExperienceCard e={e} showMechanic />
            </li>
          ))}
        </ul>
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
        <EmptyState title={`No other ${vehicle.generation} experiences yet`} />
      ) : (
        <ul className="space-y-3">
          {otherGenerationExperiences.map((e) => (
            <li key={e.id}>
              <ExperienceCard e={e} showMechanic />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

import { notFound } from "next/navigation";
import { Card, EmptyState, PageTitle, money } from "@/components/ui";
import { ExperienceCard } from "@/components/experience-card";
import { currentUser } from "@/lib/auth/guards";
import { getVehicle } from "@/lib/services/vehicles";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";
import { VehiclePhotos } from "./vehicle-photos";

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

  return (
    <>
      <PageTitle
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`}
        subtitle={[vehicle.generation, vehicle.platform].filter(Boolean).join(" · ")}
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <p className="text-muted text-sm">Owner</p>
          <p className="font-medium">{vehicle.owner?.displayName ?? "Unknown"}</p>
        </Card>
        <Card>
          <p className="text-muted text-sm">Mileage</p>
          <p className="font-medium">
            {vehicle.mileage === null ? "Not reported" : `${vehicle.mileage.toLocaleString()} mi`}
          </p>
        </Card>
        <Card>
          <p className="text-muted text-sm">Engine / drivetrain</p>
          <p className="font-medium">
            {[vehicle.engine, vehicle.drivetrain].filter(Boolean).join(" · ") || "Not reported"}
          </p>
        </Card>
      </div>

      <VehiclePhotos vehicleId={vehicle.id} slots={vehicle.photoSlots} editable={vehicle.isOwn} />

      <h2 className="text-lg font-medium mt-10 mb-3">Service history for this car</h2>
      {own.items.length === 0 ? (
        <EmptyState title="Nothing logged yet" hint="Log a service to start building the history." />
      ) : (
        <ul className="space-y-3">
          {own.items.map((e) => (
            <li key={e.id}>
              <ExperienceCard e={e} showMechanic />
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-lg font-medium mt-10 mb-1">{vehicle.generation} data</h2>
      <p className="text-muted text-sm mb-3">
        {generationPricing.label}
        {generationPricing.median !== null && ` · median ${money(generationPricing.median)}`}
      </p>
      {generation.items.length === 0 ? (
        <EmptyState title={`No ${vehicle.generation} experiences yet`} />
      ) : (
        <ul className="space-y-3">
          {generation.items.map((e) => (
            <li key={e.id}>
              <ExperienceCard e={e} showMechanic />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

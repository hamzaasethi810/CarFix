import { notFound } from "next/navigation";
import { Card, EmptyState, PageTitle, money } from "@/components/ui";
import { ExperienceCard } from "@/components/experience-card";
import { currentUser } from "@/lib/auth/guards";
import { getMechanic } from "@/lib/services/mechanics";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";

export default async function MechanicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();

  const mechanic = await getMechanic(id).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });

  const [experiences, pricing] = await Promise.all([
    browseExperiences({ mechanicId: id, limit: 20, offset: 0 }, user?.id),
    getPricing({ mechanicId: id }),
  ]);

  return (
    <>
      <PageTitle title={mechanic.name} subtitle={`${mechanic.city}, ${mechanic.state}`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-muted text-sm">Experiences</p>
          <p className="text-2xl font-semibold">{mechanic.experienceCount}</p>
          <p className="text-muted text-xs mt-1">{mechanic.verifiedCount} verified</p>
        </Card>
        <Card>
          <p className="text-muted text-sm">Owner-reported median</p>
          <p className="text-2xl font-semibold">{money(pricing.median)}</p>
          <p className="text-muted text-xs mt-1">{pricing.label}</p>
        </Card>
        <Card>
          <p className="text-muted text-sm">Specialties</p>
          <p className="text-sm mt-1">
            {mechanic.specialties.length
              ? mechanic.specialties.map((s) => s.name).join(", ")
              : "Not listed"}
          </p>
        </Card>
      </div>

      {mechanic.description && <p className="mt-6 text-sm">{mechanic.description}</p>}

      <div className="mt-4 text-sm text-muted space-y-1">
        <p>
          {mechanic.address}, {mechanic.city}, {mechanic.state} {mechanic.zip}
        </p>
        {mechanic.phone && <p>{mechanic.phone}</p>}
        {mechanic.website && (
          <p>
            <a
              href={mechanic.website}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="underline text-foreground"
            >
              Website
            </a>
          </p>
        )}
      </div>

      <h2 className="text-lg font-medium mt-10 mb-3">Owner experiences</h2>
      {experiences.items.length === 0 ? (
        <EmptyState
          title="No experiences logged yet"
          hint="Be the first to report what you paid here."
        />
      ) : (
        <ul className="space-y-3">
          {experiences.items.map((e) => (
            <li key={e.id}>
              <ExperienceCard e={e} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

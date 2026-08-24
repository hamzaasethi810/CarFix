import { notFound } from "next/navigation";
import { Card, EmptyState, PageTitle, SectionTitle, money } from "@/components/ui";
import { ExperienceCard } from "@/components/experience-card";
import { currentUser } from "@/lib/auth/guards";
import { getMechanic } from "@/lib/services/mechanics";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-footnote text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-title1 font-semibold mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-footnote text-secondary mt-1">{hint}</p>}
    </Card>
  );
}

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

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Experiences"
          value={String(mechanic.experienceCount)}
          hint={`${mechanic.verifiedCount} verified`}
        />
        <Stat label="Owner-reported median" value={money(pricing.median)} hint={pricing.label} />
        <Card>
          <p className="text-footnote text-secondary uppercase tracking-wide">Specialties</p>
          <p className="text-subhead mt-2">
            {mechanic.specialties.length
              ? mechanic.specialties.map((s) => s.name).join(", ")
              : "Not listed"}
          </p>
        </Card>
      </div>

      {mechanic.description && <p className="mt-6 text-body text-pretty">{mechanic.description}</p>}

      <Card className="mt-6">
        <h2 className="text-headline font-semibold mb-3">Contact</h2>
        <address className="not-italic text-subhead text-secondary space-y-2">
          <p>
            {mechanic.address}, {mechanic.city}, {mechanic.state} {mechanic.zip}
          </p>
          {mechanic.phone && (
            <p>
              <a href={`tel:${mechanic.phone}`} className="text-accent font-medium">
                {mechanic.phone}
              </a>
            </p>
          )}
          {mechanic.website && (
            <p>
              <a
                href={mechanic.website}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="text-accent font-medium"
              >
                Visit website
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          )}
        </address>
      </Card>

      <SectionTitle hint="Reported by owners who had work done here.">
        Owner experiences
      </SectionTitle>

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

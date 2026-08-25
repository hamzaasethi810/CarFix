import { notFound } from "next/navigation";
import { Card, EmptyState, SectionTitle, money } from "@/components/ui";
import { ExperienceCard } from "@/components/experience-card";
import { currentUser } from "@/lib/auth/guards";
import { getMechanic } from "@/lib/services/mechanics";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";
import { getShopPrices } from "@/lib/services/shops";
import { GoldCar } from "@/app/shops/[id]/subscription-panel";

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

  const [experiences, pricing, published] = await Promise.all([
    browseExperiences({ mechanicId: id, limit: 20, offset: 0 }, user?.id),
    getPricing({ mechanicId: id }),
    getShopPrices(id),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-large-title font-bold inline-flex items-center gap-2.5">
          {mechanic.subscribed && <GoldCar className="size-7 shrink-0" />}
          {mechanic.name}
        </h1>
        <p className="text-secondary text-callout mt-1">
          {[mechanic.city, mechanic.state].filter(Boolean).join(", ")}
          {mechanic.subscribed && " · Subscribed shop"}
        </p>
      </div>

      {!mechanic.confirmed && (
        <Card className="mb-4 border-l-2 border-warning">
          <p className="text-subhead">
            <span className="font-semibold">Unconfirmed listing.</span>{" "}
            Somebody added this shop and nobody has corroborated it yet. It is
            confirmed once several different people report work here, or the
            shop claims it.
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Experiences"
          value={String(mechanic.experienceCount)}
          hint={`${mechanic.verifiedCount} verified`}
        />
        {/*
          The reported range, not a median. A median needs a decent number of
          reports before it means anything, and on a shop with three it reads
          as a precise figure while being nearly noise. A range says what was
          actually seen without implying more than the data supports.
        */}
        <Stat
          label="Reported prices"
          value={
            pricing.min === null || pricing.max === null
              ? "—"
              : pricing.min === pricing.max
                ? money(pricing.min)
                : `${money(pricing.min)}–${money(pricing.max)}`
          }
          hint={pricing.label}
        />
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

      {published.length > 0 && (
        <>
          <SectionTitle hint="Set by the shop. Owner-reported prices are further down.">
            The shop&rsquo;s prices
          </SectionTitle>
          <Card>
            <ul className="divide-y divide-separator">
              {published.map((p) => (
                <li key={p.serviceId} className="flex flex-wrap items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-subhead font-medium">{p.service}</span>
                  <span className="text-subhead tabular-nums">
                    {p.maxPrice != null && p.maxPrice !== p.minPrice
                      ? `${money(p.minPrice)} – ${money(p.maxPrice)}`
                      : money(p.minPrice)}
                    {p.note && <span className="text-secondary font-normal"> · {p.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

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

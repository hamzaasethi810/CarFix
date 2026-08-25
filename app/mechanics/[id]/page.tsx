import { notFound } from "next/navigation";
import { Card, EmptyState, SectionTitle, Stat, money } from "@/components/ui";
import { ExperienceCard } from "@/components/experience-card";
import { currentUser } from "@/lib/auth/guards";
import { getMechanic } from "@/lib/services/mechanics";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";
import { getShopPrices } from "@/lib/services/shops";
import { GoldCar } from "@/app/shops/[id]/subscription-panel";

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

      {/*
        A description belongs with the name it describes. Sitting between the
        figures and the contact card it read as a stray sentence nobody had
        found a home for.
      */}
      {mechanic.description && (
        <p className="-mt-2 mb-5 text-body text-secondary text-pretty max-w-prose">
          {mechanic.description}
        </p>
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
              ? "None yet"
              : pricing.min === pricing.max
                ? money(pricing.min)
                : `${money(pricing.min)}–${money(pricing.max)}`
          }
          hint={pricing.label}
        />
        {/*
          Sits beside the two figures, so it matches their label treatment.
          Chips rather than a comma list: these are the things somebody scans
          for, and a run-on sentence is the hardest shape to scan.
        */}
        <Card>
          <p className="text-footnote text-secondary">Specialties</p>
          {mechanic.specialties.length ? (
            <ul className="flex flex-wrap gap-1.5 mt-2">
              {mechanic.specialties.map((sp) => (
                <li
                  key={sp.id ?? sp.name}
                  className="rounded-control bg-fill px-2.5 py-1 text-footnote font-medium"
                >
                  {sp.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-subhead text-secondary mt-2">Not listed</p>
          )}
        </Card>
      </div>


      <Card className="mt-6">
        <h2 className="text-headline font-semibold mb-3">Contact</h2>
        <address className="not-italic text-subhead text-secondary space-y-2">
          <p>
            {/*
              Joined rather than punctuated by hand: an ingested listing can be
              missing a town or a state, and hard-coded commas rendered that as
              "Address not listed, ,".
            */}
            {[mechanic.address, mechanic.city, [mechanic.state, mechanic.zip].filter(Boolean).join(" ")]
              .map((part) => part?.trim())
              .filter(Boolean)
              .join(", ") || "Address not listed"}
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

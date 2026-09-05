import { notFound } from "next/navigation";
import {
  BlankForm,
  Columns,
  Figure,
  OperationLine,
  SectionTitle,
  Sheet,
  SheetHeader,
  Stamp,
  Tag,
  money,
} from "@/components/ui";
import { ExperienceCard } from "@/components/experience-card";
import { currentUser } from "@/lib/auth/guards";
import { getMechanic } from "@/lib/services/mechanics";
import { browseExperiences, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";
import { getShopPrices } from "@/lib/services/shops";

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

  /*
    Each filed rate gets its own Typical figure: what owners have actually
    reported paying for that same service at this shop, not the site-wide
    range above. Fetched per row rather than reusing the aggregate, because a
    shop that files ten prices and gets one report on each looks nothing like
    one that gets ten reports on a single service.
  */
  const typicals = await Promise.all(
    published.map((p) => getPricing({ mechanicId: id, serviceId: p.serviceId })),
  );

  return (
    <>
      <SheetHeader
        title={mechanic.name}
        meta={[mechanic.city, mechanic.state].filter(Boolean).join(", ")}
        actions={
          <>
            {mechanic.subscribed && <Tag>Subscribed</Tag>}
            {mechanic.confirmed ? (
              <Stamp>Confirmed</Stamp>
            ) : (
              <Tag tone="neutral">Unconfirmed</Tag>
            )}
          </>
        }
      />

      {!mechanic.confirmed && (
        <Sheet className="mt-4 p-5 border-l-2 border-warning">
          <p className="text-subhead">
            <span className="font-semibold">Unconfirmed listing.</span>{" "}
            Somebody added this shop and nobody has corroborated it yet. It is
            confirmed once several different people report work here, or the
            shop claims it.
          </p>
        </Sheet>
      )}

      {/*
        A description belongs with the name it describes. Sitting between the
        figures and the contact card it read as a stray sentence nobody had
        found a home for.
      */}
      {mechanic.description && (
        <p className="mt-4 mb-1 text-body text-secondary text-pretty max-w-prose">
          {mechanic.description}
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-separator pt-8">
        <Figure
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
        <Figure
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
      </div>

      {/*
        Chips rather than a comma list: these are the things somebody scans
        for, and a run-on sentence is the hardest shape to scan.
      */}
      {mechanic.specialties.length > 0 && (
        <div className="mt-6">
          <p className="text-footnote text-secondary mb-2">Specialties</p>
          <ul className="flex flex-wrap gap-1.5">
            {mechanic.specialties.map((sp) => (
              <li key={sp.id ?? sp.name}>
                <Tag tone="neutral">{sp.name}</Tag>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SectionTitle>Contact</SectionTitle>
      <Sheet className="p-5">
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
      </Sheet>

      <SectionTitle hint="Typical is what owners have reported paying here for the same service. Filed is what the shop asks.">
        The shop&rsquo;s prices
      </SectionTitle>
      {published.length === 0 ? (
        <BlankForm
          heads={["Typical", "Filed"]}
          title="No published prices yet"
          hint="This shop has not filed prices for any service."
        />
      ) : (
        <Columns heads={["Typical", "Filed"]} label="The shop's published prices">
          {published.map((p, i) => {
            const t = typicals[i];
            return (
              <OperationLine
                key={p.serviceId}
                label={p.service}
                note={p.note ?? undefined}
                figures={[
                  t.min === null || t.max === null
                    ? null
                    : t.max !== t.min
                      ? `${money(t.min)} – ${money(t.max)}`
                      : money(t.min),
                  p.maxPrice != null && p.maxPrice !== p.minPrice
                    ? `${money(p.minPrice)} – ${money(p.maxPrice)}`
                    : money(p.minPrice),
                ]}
              />
            );
          })}
        </Columns>
      )}

      <SectionTitle hint="Reported by owners who had work done here.">
        Owner experiences
      </SectionTitle>

      {experiences.items.length === 0 ? (
        <BlankForm
          heads={["Service", "Cost"]}
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

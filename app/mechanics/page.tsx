import Link from "next/link";
import { Card, EmptyState, PageTitle, money } from "@/components/ui";
import { search } from "@/lib/services/mechanics";
import { getServices } from "@/lib/services/taxonomy";
import { mechanicSearchSchema } from "@/lib/validation/schemas";
import { SearchFilters } from "./search-filters";

export default async function MechanicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );

  const parsed = mechanicSearchSchema.safeParse(flat);
  const services = await getServices();

  if (!parsed.success) {
    return (
      <>
        <PageTitle title="Find a mechanic" />
        <SearchFilters services={services} />
        <div className="mt-6">
          <EmptyState
            title="Those filters weren't valid"
            hint="Try adjusting your search and running it again."
          />
        </div>
      </>
    );
  }

  const results = await search({ ...parsed.data, verifiedOnly: parsed.data.verifiedOnly ?? false });

  return (
    <>
      <PageTitle
        title="Find a mechanic"
        subtitle="Filter by the work you need and the car you drive."
      />
      <SearchFilters services={services} />

      <div aria-live="polite" className="mt-6">
        {results.items.length === 0 ? (
          <EmptyState
            title="No mechanics matched"
            hint="Try widening your radius, or clearing the verified-only filter."
          />
        ) : (
          <ul className="space-y-3">
            {results.items.map((m) => (
              <li key={m.id}>
                <Link href={`/mechanics/${m.id}`} className="block group">
                  <Card className="group-hover:bg-tertiary transition-colors duration-150">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h2 className="text-headline font-semibold">{m.name}</h2>
                      <span className="text-subhead text-secondary">
                        {m.city}, {m.state}
                        {m.distanceMiles !== null && ` · ${m.distanceMiles} mi`}
                      </span>
                    </div>

                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-subhead">
                      <div className="flex gap-1.5">
                        <dt className="text-secondary">Rating</dt>
                        <dd className="font-medium">
                          {m.avgRating === null ? "None yet" : `${m.avgRating} / 5`}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-secondary">Experiences</dt>
                        <dd className="font-medium">
                          {m.experienceCount}
                          {m.verifiedCount > 0 && (
                            <span className="text-success"> · {m.verifiedCount} verified</span>
                          )}
                        </dd>
                      </div>
                      {m.medianPrice !== null && (
                        <div className="flex gap-1.5">
                          <dt className="text-secondary">Median</dt>
                          <dd className="font-medium">{money(m.medianPrice)}</dd>
                        </div>
                      )}
                      {m.wouldReturnPct !== null && (
                        <div className="flex gap-1.5">
                          <dt className="text-secondary">Would return</dt>
                          <dd className="font-medium">{m.wouldReturnPct}%</dd>
                        </div>
                      )}
                    </dl>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

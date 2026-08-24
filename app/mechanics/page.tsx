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
        <EmptyState title="Those filters weren't valid" hint="Try adjusting your search." />
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

      {results.items.length === 0 ? (
        <EmptyState
          title="No mechanics matched"
          hint="Try widening your radius or clearing the verified-only filter."
        />
      ) : (
        <ul className="space-y-3 mt-6">
          {results.items.map((m) => (
            <li key={m.id}>
              <Link href={`/mechanics/${m.id}`}>
                <Card className="hover:border-accent transition-colors">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-medium">{m.name}</h2>
                    <span className="text-sm text-muted">
                      {m.city}, {m.state}
                      {m.distanceMiles !== null && ` · ${m.distanceMiles} mi`}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                    <span>
                      {m.avgRating === null ? "No ratings yet" : `${m.avgRating} / 5 average`}
                    </span>
                    <span>
                      {m.experienceCount} experience{m.experienceCount === 1 ? "" : "s"}
                      {m.verifiedCount > 0 && ` · ${m.verifiedCount} verified`}
                    </span>
                    {m.medianPrice !== null && (
                      <span>Owner-reported median: {money(m.medianPrice)}</span>
                    )}
                    {m.wouldReturnPct !== null && <span>{m.wouldReturnPct}% would return</span>}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

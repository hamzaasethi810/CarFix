import Link from "next/link";
import { buttonStyles } from "@/components/ui";
import { getProofNumbers } from "@/lib/services/stats";

/*
  The landing page.

  It was a five-beat scroll story built around a generated 3D car. That told a
  visitor what the site was about and then made them scroll to the bottom
  before they could do anything, which is the wrong shape for a page whose job
  is to start a search.

  This is the floor of the rebuild, not the finished page: hero, real counts,
  one way in. The filter bar and the category cards land on top of it.
*/
export const revalidate = 300;

export default async function HomePage() {
  const stats = await getProofNumbers();

  /*
    A count of zero is not proof, it is an admission. Zeros are dropped and
    the row lays out to whatever is left.
  */
  const counts: [number, string][] = (
    [
      [stats?.shops ?? 0, "Garages"],
      [stats?.experiences ?? 0, "Reported services"],
      [stats?.generations ?? 0, "Vehicle generations"],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
      {/*
        Left-aligned, not centred. A centred headline over a full-bleed
        background is the shape every generated landing page takes.
      */}
      <section className="pt-14 sm:pt-24 max-w-2xl">
        <h1 className="text-large-title sm:text-[3.25rem] sm:leading-[1.04] text-balance">
          Know what it should cost.
        </h1>
        <p className="text-body text-secondary mt-5 max-w-md text-balance">
          Prices reported by the owners who paid them, for your exact make,
          model and year. Not quotes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/search" className={`${buttonStyles.primary} px-7`}>
            Find shops near me
          </Link>
          <Link href="/register" className={buttonStyles.secondary}>
            Add what you paid
          </Link>
        </div>
      </section>

      {counts.length > 0 && (
        <section className="mt-20 sm:mt-28 border-t border-separator pt-10">
          <dl className="grid gap-10 sm:grid-cols-3">
            {counts.map(([n, label]) => (
              <div key={label}>
                <dd className="font-condensed font-bold text-large-title leading-none tabular-nums">
                  {n.toLocaleString("en-US")}
                </dd>
                <dt className="text-subhead text-secondary mt-2">{label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  );
}

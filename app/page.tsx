import Link from "next/link";
import { CarHero } from "@/components/landing/car-hero";
import { Reveal } from "@/components/landing/reveal";
import { buttonStyles } from "@/components/ui";
import { getProofNumbers } from "@/lib/services/stats";

/*
  The landing page.

  It used to be the search tool: a globe and a filter bar, and no way to tell
  what the site was for. The tool lives at /search now. This page says what
  Gaari is, shows that there is real data behind it, and hands you over.
*/
export const revalidate = 300;

const TRUST = [
  {
    title: "Owners, not shops",
    body: "Every price comes from the person who paid it. Shops cannot post their own rates.",
  },
  {
    title: "Receipts are proof, not data",
    body: "A receipt is scanned to confirm the job happened, then deleted. It is never stored.",
  },
  {
    title: "Moderated",
    body: "Reviews and shop replies are checked before anyone sees them.",
  },
];

export default async function HomePage() {
  const stats = await getProofNumbers();

  /*
    A count of zero is not proof, it is an admission.

    The panel exists to show there is real data behind the site, and
    "0 Reported services" argues the opposite far more loudly than the other
    two numbers argue for it. Zeros are dropped, and if every number is zero
    the whole panel stays away rather than pleading an empty case.
  */
  const shown: [number, string][] = (
    [
      [stats?.experiences ?? 0, "Reported services"],
      [stats?.shops ?? 0, "Garages"],
      [stats?.generations ?? 0, "Vehicle generations"],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    <main>
      <section className="pt-10 sm:pt-16">
        <CarHero />
        <div className="mx-auto max-w-3xl px-6 pt-14 pb-20 text-center">
          <h1 className="text-large-title sm:text-[3.25rem] sm:leading-[1.05] text-balance">
            Know what it should cost.
          </h1>
          <p className="text-body text-secondary mt-5 max-w-xl mx-auto text-balance">
            See what real owners paid their mechanic, for your exact make, model
            and year. Real prices, not quotes.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/search" className={buttonStyles.primary}>
              Find shops near me
            </Link>
            <Link href="/experiences/new" className={buttonStyles.secondary}>
              Log a service
            </Link>
          </div>
        </div>
      </section>

      {shown.length > 0 && (
        <Reveal>
          <section className="border-y border-separator bg-grouped">
            <div
              className="mx-auto max-w-4xl px-6 py-16 grid gap-6 text-center"
              style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}
            >
              {shown.map(([n, label]) => (
                <div key={label as string}>
                  <div className="font-condensed font-bold text-large-title leading-none tabular-nums text-accent">
                    {(n as number).toLocaleString("en-US")}
                  </div>
                  <div className="text-footnote text-secondary mt-2">
                    {label as string}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className="mx-auto max-w-4xl px-6 py-24">
          <h2 className="text-title1 text-center">Why you can believe it</h2>
          <dl className="mt-12 grid gap-10 sm:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title}>
                <dt className="text-headline font-semibold">{t.title}</dt>
                <dd className="text-subhead text-secondary mt-2">{t.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Reveal>

      <Reveal>
        <section className="border-t border-separator">
          <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <h2 className="text-title1 text-balance">
              See what your next service should cost.
            </h2>
            <p className="text-body text-secondary mt-4">
              Free to join. Free to look.
            </p>
            <div className="mt-8">
              <Link href="/login" className={`${buttonStyles.primary} px-8`}>
                Get started
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}

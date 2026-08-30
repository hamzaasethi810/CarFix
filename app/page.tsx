import Link from "next/link";
import { ScrollStory } from "@/components/landing/scroll-story";
import { JobCard } from "@/components/job-card";
import { buttonStyles } from "@/components/ui";
import { getProofNumbers } from "@/lib/services/stats";

/*
  The landing page.

  It used to be the search tool: a globe and a filter bar, and no way to tell
  what the site was for. The tool now lives at /search; this page's job is to
  say what Gaari is, show that it has real prices in it, and hand you to the
  tool once you want it.
*/
export const revalidate = 300;

export default async function HomePage() {
  const stats = await getProofNumbers();

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-24 text-center sm:pt-28">
        <h1 className="text-large-title sm:text-[3.25rem] sm:leading-[1.05] text-balance">
          Know what it should cost.
        </h1>
        <p className="text-body text-secondary mt-5 max-w-xl mx-auto text-balance">
          Gaari is what real owners actually paid their mechanic — by make, model
          and generation. Not a quote. Not an estimate. What it cost.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/search" className={buttonStyles.primary}>
            Find shops near me
          </Link>
          <Link href="/experiences/new" className={buttonStyles.secondary}>
            Log a service
          </Link>
        </div>
      </section>

      <ScrollStory />

      {/* Real reported prices */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-title1 text-center">Real jobs, real prices</h2>
        <p className="text-body text-secondary mt-3 text-center max-w-xl mx-auto">
          Every card is a service somebody paid for and reported. Receipts are
          checked for proof, then deleted.
        </p>
        <div className="grid gap-7 sm:grid-cols-2 mt-10">
          <JobCard
            vehicle="BMW · M3 · G80"
            service="Front brake pads & discs"
            shop="Patriot Auto Services"
            place="Arlington, VA"
            date="2 Mar 2026"
            reported="$742"
            median="$810"
            verified
          />
          <JobCard
            vehicle="Honda · Civic · FK8"
            service="Oil & filter change"
            shop="Mac's Tire Service"
            place="Alexandria, VA"
            date="18 Feb 2026"
            reported="$96"
            median="$134"
          />
        </div>
      </section>

      {/* Proof numbers */}
      {stats && (
        <section className="border-y border-separator bg-grouped">
          <div className="mx-auto max-w-4xl px-6 py-16 grid grid-cols-3 gap-6 text-center">
            {[
              [stats.experiences, "Reported services"],
              [stats.shops, "Garages"],
              [stats.generations, "Vehicle generations"],
            ].map(([n, label]) => (
              <div key={label as string}>
                <div className="font-condensed font-bold text-large-title leading-none tabular-nums text-accent">
                  {(n as number).toLocaleString("en-US")}
                </div>
                <div className="text-footnote text-secondary mt-2">{label as string}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trust */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-title1 text-center">Why you can believe it</h2>
        <dl className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            ["Owners, not shops", "Every price comes from the person who paid it. Shops cannot post their own rates."],
            ["Receipts are proof, not data", "A receipt is scanned to confirm the job happened, then deleted. It is never stored."],
            ["Moderated", "Reviews and shop replies are screened before they appear."],
          ].map(([t, d]) => (
            <div key={t}>
              <dt className="text-headline font-semibold">{t}</dt>
              <dd className="text-subhead text-secondary mt-2">{d}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 text-center">
          <Link href="/search" className={buttonStyles.primary}>
            Find shops near me
          </Link>
        </div>
      </section>
    </main>
  );
}

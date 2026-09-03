import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { QuickFilters } from "@/components/landing/quick-filters";
import { buttonStyles } from "@/components/ui";
import { getProofNumbers } from "@/lib/services/stats";
import { getMakes } from "@/lib/services/taxonomy";

/*
  The landing page.

  Two jobs, in order. Say what this covers, because "car prices" is too vague
  to act on and the three trades below are the whole proposition: the same
  record serves someone checking whether a brake bill was fair and someone
  pricing a titanium exhaust. Then get them moving, which is why both ways in
  sit above the fold rather than at the bottom of a scroll.

  Left-aligned and asymmetric on purpose. A centred headline over a full-bleed
  ground is the shape every generated landing page takes.
*/
export const revalidate = 300;

const TRADES = [
  {
    name: "Mechanics",
    line: "Brakes, oil, clutches, diagnostics. What the shop charged, not what it quoted.",
  },
  {
    name: "Wrap shops",
    line: "Wraps, PPF, respray. Work that never had a list price to begin with.",
  },
  {
    name: "Tuners",
    line: "Exhausts, tunes, kits. Priced by generation, not by guesswork.",
  },
];

export default async function HomePage() {
  const [stats, makes] = await Promise.all([getProofNumbers(), getMakes()]);

  /*
    A count of zero is not proof, it is an admission. Zeros are dropped and
    the row lays out to whatever is left.
  */
  const counts: [number, string][] = (
    [
      [stats?.shops ?? 0, "Garages listed"],
      [stats?.experiences ?? 0, "Prices reported"],
      [stats?.generations ?? 0, "Vehicle generations"],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    <main className="mx-auto max-w-5xl px-5 sm:px-6 pb-28">
      {/*
        The filter carries the right half rather than an image. It fills the
        space, and unlike a photograph it converts: the page stops describing
        the product and becomes it.
      */}
      <section className="pt-14 sm:pt-20 grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-10 lg:gap-14 lg:items-start">
        <div className="lg:pt-6">
          <h1 className="text-large-title sm:text-[3.5rem] sm:leading-[1.02] tracking-[-0.02em] text-balance">
            Know what your generation costs.
          </h1>
          <p className="text-body text-secondary mt-5 max-w-lg text-balance">
            A 3 Series spans twenty years and four platforms. An E90 brake job
            and an F30 brake job are not the same price, so nothing here is
            filed by model alone.
          </p>
          <p className="text-body text-secondary mt-4 max-w-lg text-balance">
            Real prices from the owners who paid them, at mechanics, wrap
            shops and tuners.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/register" className={`${buttonStyles.secondary} px-6`}>
              Add what you paid
            </Link>
            {counts.length > 0 && (
              <p className="text-footnote text-tertiary-label">
                {counts.map(([n, l]) => `${n.toLocaleString("en-US")} ${l.toLowerCase()}`).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <QuickFilters makes={makes} />
      </section>

      {/*
        The three trades, on rules rather than in tiles. Three equal cards
        side by side is the default every builder ships; a list with real
        typographic hierarchy reads as edited.
      */}
      <section aria-labelledby="covers" className="mt-24 sm:mt-28">
        <h2 id="covers" className="text-caption uppercase tracking-[0.14em] text-tertiary-label">
          What is in the record
        </h2>
        <dl className="mt-8 border-t border-separator">
          {TRADES.map((t) => (
            <div
              key={t.name}
              className="grid sm:grid-cols-[minmax(0,14rem)_1fr] gap-1 sm:gap-8 border-b border-separator py-7"
            >
              <dt className="text-title3 tracking-[-0.01em]">{t.name}</dt>
              <dd className="text-body text-secondary max-w-xl">{t.line}</dd>
            </div>
          ))}
        </dl>
      </section>

      {counts.length > 0 && (
        <section className="mt-24 sm:mt-32">
          <dl className="grid gap-10 sm:grid-cols-3">
            {counts.map(([n, label]) => (
              <div key={label}>
                <dd className="font-condensed font-bold text-large-title leading-none">
                  <CountUp value={n} />
                </dd>
                <dt className="text-subhead text-secondary mt-2">{label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-24 sm:mt-32 border-t border-separator pt-12">
        <h2 className="text-title2 tracking-[-0.01em] text-balance max-w-lg">
          Every price here came from someone who paid it.
        </h2>
        <p className="text-body text-secondary mt-4 max-w-lg">
          Add yours, upload the receipt, and it is marked confirmed. That is
          the whole mechanism.
        </p>
        <div className="mt-8">
          <Link href="/register" className={`${buttonStyles.primary} px-7`}>
            Create an account
          </Link>
        </div>
      </section>
    </main>
  );
}

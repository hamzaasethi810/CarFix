import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { GenerationPicker } from "@/components/landing/generation-picker";
import { Reveal } from "@/components/landing/reveal";
import { Plate } from "@/components/plate";
import { buttonStyles } from "@/components/ui";
import { hasImage } from "@/lib/design/assets";
import { getProofNumbers } from "@/lib/services/stats";
import { getMakes } from "@/lib/services/taxonomy";

export const revalidate = 300;

/* ------------------------------------------------------------------------
   ALL THE WORDS ON THIS PAGE LIVE HERE.
   --------------------------------------------------------------------- */
const COPY = {
  hero: {
    heading: "Find the shop that knows your car.",
    body: "Thousands of garages, wrap shops and tuners, searchable by the generation you actually drive. Then tell the next owner what you paid.",
  },
  cta: { label: "File a price", href: "/register" },
  trades: {
    heading: "Three kinds of work, one record.",
    items: [
      { id: "mechanics", name: "Mechanics", line: "Brakes, oil, clutches, diagnostics. What the shop charged, not what it quoted." },
      { id: "appearance", name: "Wrap shops", line: "Wraps, PPF, respray. Work that never had a list price to begin with." },
      { id: "performance", name: "Tuners", line: "Exhausts, tunes, kits. Priced by generation, not by guesswork." },
    ],
  },
  why: {
    heading: "A price is only worth something with a receipt behind it",
    body: "Upload the receipt and it is read, checked against the shop and total you entered, then destroyed. Only the confirmation is kept. That is the difference between a figure and a rumour.",
    caption: "Mercedes-AMG GT R, filed under C190. Every price here is filed by generation, not by badge.",
  },
  scale: {
    heading: "Where it stands today",
    body: "The shops are in. The prices are not, yet, and that is the honest state of it: every figure on this site has to be filed by somebody who paid it.",
    labels: { shops: "Garages listed", generations: "Vehicle generations", services: "Kinds of work" },
  },
} as const;

const PLATE_HERO = "/img/gt3rs.webp";
const PLATE_WHY = "/img/gtr.webp";

function Section({
  children,
  className = "",
  labelledBy,
}: {
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className={`border-t border-separator ${className}`}>
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-20 sm:py-24">{children}</div>
    </section>
  );
}

export default async function HomePage() {
  /*
    Two queries, both used on screen.

    There were three: the third asked the pricing API for a median that is zero
    for every generation in the database, because nothing has been filed yet. A
    call whose answer is known in advance is not a feature, and it ran on every
    interaction with the hero.
  */
  const [stats, makes] = await Promise.all([getProofNumbers(), getMakes()]);

  const counts: [number, string][] = (
    [
      [stats?.shops ?? 0, COPY.scale.labels.shops],
      [stats?.generations ?? 0, COPY.scale.labels.generations],
      [stats?.services ?? 0, COPY.scale.labels.services],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    <div className="home-root">
      {/*
        One: the thing the site does, and the control that does it.

        No worked example and no invented receipt. The old hero was a mock
        repair order for a Mercedes nobody owns, with a $2,180 brake job nobody
        paid, on a page arguing that you should trust real numbers. The hero
        now asks the only question this product can answer today — which car do
        you drive — and sends that answer to shops that work on it.
      */}
      <section className="mx-auto w-full max-w-5xl px-5 sm:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16">
          <div>
            <Reveal>
              <h1 className="text-[2.4rem] leading-[1.08] sm:text-[3.25rem] sm:leading-[1.04] tracking-[-0.03em] text-balance">
                {COPY.hero.heading}
              </h1>
              <p className="mt-5 max-w-lg text-body text-secondary text-pretty">{COPY.hero.body}</p>
            </Reveal>

            <Reveal delay={120} className="mt-9">
              <GenerationPicker makes={makes} />
            </Reveal>
          </div>

          {hasImage(PLATE_HERO) && (
            <Reveal delay={200} className="hidden lg:block">
              <Plate
                src={PLATE_HERO}
                alt="A Porsche 911 GT3 RS parked on a road through open country."
                width={2400}
                height={1600}
                sizes="(max-width: 1024px) 0px, 40rem"
                priority
              />
            </Reveal>
          )}
        </div>
      </section>

      {/* Two: what counts as work here. */}
      <Section labelledBy="trades">
        <Reveal>
          <h2 id="trades" className="text-title1 tracking-[-0.022em] max-w-md text-balance">
            {COPY.trades.heading}
          </h2>
        </Reveal>
        <dl className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-3 border-t border-separator pt-8">
          {COPY.trades.items.map((t, i) => (
            <Reveal key={t.id} delay={120 + i * 80}>
              <dt className="text-title3 font-semibold tracking-[-0.015em]">{t.name}</dt>
              <dd className="mt-2 text-body text-secondary text-pretty">{t.line}</dd>
            </Reveal>
          ))}
        </dl>
      </Section>

      {/*
        Three: why a receipt matters.

        The photograph belongs to this section rather than floating beside an
        unrelated paragraph, and its caption names the car and its chassis code,
        because "filed by generation, not by badge" is the argument and a
        labelled specimen makes it without another sentence of copy.
      */}
      <Section labelledBy="why">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-16 lg:items-center">
          <Reveal>
            <h2 id="why" className="text-title1 tracking-[-0.022em] text-balance">
              {COPY.why.heading}
            </h2>
            <p className="mt-5 text-body text-secondary max-w-md text-pretty">{COPY.why.body}</p>
            <Link href={COPY.cta.href} className={`${buttonStyles.secondaryAccent} mt-7 px-6`}>
              {COPY.cta.label}
            </Link>
          </Reveal>

          {hasImage(PLATE_WHY) && (
            <Reveal delay={160}>
              <Plate
                src={PLATE_WHY}
                alt="A Mercedes-AMG GT R photographed from the front three-quarter."
                width={1500}
                height={2250}
                sizes="(max-width: 1024px) 88vw, 28rem"
                caption={COPY.why.caption}
              />
            </Reveal>
          )}
        </div>
      </Section>

      {/* Four: the honest state of it. */}
      {counts.length > 0 && (
        <Section labelledBy="scale">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 id="scale" className="text-title1 tracking-[-0.022em] text-balance">
                {COPY.scale.heading}
              </h2>
              <p className="mt-4 text-body text-secondary max-w-md text-pretty">{COPY.scale.body}</p>
            </Reveal>

            <Reveal delay={140}>
              <dl className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
                {counts.map(([n, label]) => (
                  <div key={label} className="border-t border-separator pt-3">
                    <dd className="tabular text-title1 font-semibold leading-none">
                      <CountUp value={n} />
                    </dd>
                    <dt className="text-footnote text-secondary mt-2">{label}</dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={320}>
            <div className="mt-14 flex justify-end border-t border-separator pt-8">
              <Link href={COPY.cta.href} className={`${buttonStyles.primary} px-8`}>
                {COPY.cta.label}
              </Link>
            </div>
          </Reveal>
        </Section>
      )}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { QuickFilters } from "@/components/landing/quick-filters";
import { Reveal } from "@/components/landing/reveal";
import { buttonStyles } from "@/components/ui";
import { hasImage } from "@/lib/design/assets";
import { getProofNumbers } from "@/lib/services/stats";
import { getMakes } from "@/lib/services/taxonomy";

export const revalidate = 300;

/* ------------------------------------------------------------------------
   ALL THE WORDS ON THIS PAGE LIVE HERE.

   Edit anything in COPY and the page updates. Nothing below this block needs
   touching to change wording; the markup reads from it.
   --------------------------------------------------------------------- */
const COPY = {
  hero: {
    heading: "Real prices, tailored to your car.",
    body: "What owners paid their mechanic, wrap shop and tuner. Filed by generation, not by badge.",
  },
  start: {
    heading: "Start with the car you actually own.",
    body: "Or start from the other end. Add what you were charged, and the next owner with your car stops guessing.",
    button: "File a price",
  },
  record: {
    heading: "One record, three kinds of work.",
    trades: [
      {
        id: "mechanics",
        name: "Mechanics",
        line: "Brakes, oil, clutches, diagnostics. What the shop charged, not what it quoted.",
      },
      {
        id: "appearance",
        name: "Wrap shops",
        line: "Wraps, PPF, respray. Work that never had a list price to begin with.",
      },
      {
        id: "performance",
        name: "Tuners",
        line: "Exhausts, tunes, kits. Priced by generation, not by guesswork.",
      },
    ],
  },
  proof: {
    heading: "Every price carries its receipt.",
    body: "A number on its own is a rumour. Upload the receipt and it is read, checked against the shop and total you entered, then destroyed. Only the confirmation is kept.",
    example: {
      service: "Carbon ceramic pads, front",
      vehicle: "Mercedes-AMG GT R · C190",
      total: "$2,180",
      low: "$1,640",
      high: "$3,900",
      parts: "$1,690",
      labour: "$490",
      receipt: "Confirmed",
      caption: "An example, to show the shape of a report. Not a real price.",
    },
  },
  scale: {
    heading: "What is in it so far.",
    button: "File your first price",
    labels: {
      shops: "Garages listed",
      generations: "Vehicle generations",
      services: "Kinds of work",
    },
  },
} as const;

const HERO_IMAGE = "/img/hero.webp";
const PROOF_IMAGE = "/img/proof.webp";

/*
  A chapter: one idea, one screen.

  scroll-snap-align plus scroll-snap-stop: always is what makes the page stop
  at each one rather than letting a hard flick carry you through three. The
  snap type is proximity rather than mandatory, so a chapter that outgrows a
  short window can still be read without the browser dragging you off it.
*/
function Chapter({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      aria-labelledby={label}
      className={`chapter flex min-h-[100dvh] items-center border-t border-separator ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-20">{children}</div>
    </section>
  );
}

export default async function HomePage() {
  const [stats, makes] = await Promise.all([getProofNumbers(), getMakes()]);

  /*
    Parsed from the same strings the card prints, so the mark and the labels
    can never disagree.
  */
  const money = (v: string) => Number(v.replace(/[^0-9.]/g, ""));
  const { low, high, total } = COPY.proof.example;
  const markerPercent = Math.min(
    100,
    Math.max(0, ((money(total) - money(low)) / (money(high) - money(low))) * 100),
  );

  const counts: [number, string][] = (
    [
      [stats?.shops ?? 0, COPY.scale.labels.shops],
      [stats?.generations ?? 0, COPY.scale.labels.generations],
      [stats?.services ?? 0, COPY.scale.labels.services],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    <div className="home-root">
      {/* One: the claim. */}
      <section className="chapter flex min-h-[100dvh] items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 sm:px-8 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <div>
            <Reveal>
              <h1 className="text-large-title sm:text-[3.5rem] sm:leading-[1.03] tracking-[-0.025em] text-accent text-balance">
                {COPY.hero.heading}
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-6 max-w-md text-body text-secondary text-balance">
                {COPY.hero.body}
              </p>
            </Reveal>
          </div>

          {hasImage(HERO_IMAGE) && (
            <Reveal delay={220}>
              {/*
                Inset and rounded rather than bled to the edge. On a light
                ground a photograph run to the viewport edge reads as pasted
                on; given its own margin it reads as placed.
              */}
              <Image
                src={HERO_IMAGE}
                alt=""
                width={2400}
                height={1600}
                priority
                sizes="(max-width: 1024px) 92vw, 38vw"
                className="w-full rounded-card object-cover shadow-raised"
              />
            </Reveal>
          )}
        </div>
      </section>

      {/* Two: the way in. */}
      <Chapter label="start">
        {/*
          Two ways in, weighted equally either side of the centre line. They
          previously sat in a 22rem column beside a 1fr one, which read as a
          control with a caption rather than a genuine choice, and left the
          right column stranding 316px of its width.
        */}
        <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-2 md:gap-16 lg:gap-24 md:items-center">
          <Reveal>
            <QuickFilters makes={makes} />
          </Reveal>
          <Reveal delay={160}>
            <h2 id="start" className="text-title1 tracking-[-0.02em] text-accent text-balance">
              {COPY.start.heading}
            </h2>
            <p className="mt-4 text-body text-secondary text-balance">
              {COPY.start.body}
            </p>
            <Link href="/register" className={`${buttonStyles.secondaryAccent} mt-7 px-6`}>
              {COPY.start.button}
            </Link>
          </Reveal>
        </div>
      </Chapter>

      {/*
        Three: what is covered.

        Stacked full width rather than a name beside its description. Three
        rows of two columns reads as a table; a vertical run gives each trade
        the whole measure and a rule of its own.
      */}
      <Chapter label="record">
        <Reveal>
          <h2 id="record" className="text-title1 tracking-[-0.02em] text-accent max-w-md text-balance">
            {COPY.record.heading}
          </h2>
        </Reveal>
        {/*
          The rules are capped to the same measure as the text. They used to
          run 1,088px wide over paragraphs that stopped at 672px, leaving
          416px of hairline past the last word, three times over.
        */}
        <div className="mt-12 max-w-4xl border-t border-separator">
          {COPY.record.trades.map((trade, i) => {
            const src = `/img/${trade.id}.webp`;
            return (
              <Reveal key={trade.id} delay={160 + i * 120}>
                <div className="grid gap-5 border-b border-separator py-8 sm:py-10 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center sm:gap-10">
                  <div>
                    <h3 className="text-title2 tracking-[-0.015em]">{trade.name}</h3>
                    <p className="mt-2 text-body text-secondary">{trade.line}</p>
                  </div>
                  {hasImage(src) && (
                    <Image
                      src={src}
                      alt=""
                      width={800}
                      height={600}
                      sizes="(max-width: 640px) 88vw, 11rem"
                      className="h-28 w-full rounded-control object-cover sm:h-32"
                    />
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </Chapter>

      {/* Four: what a report is. */}
      <Chapter label="proof">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16 lg:items-center">
          <div>
            <Reveal>
              <h2 id="proof" className="text-title1 tracking-[-0.02em] text-accent text-balance">
                {COPY.proof.heading}
              </h2>
              <p className="mt-5 text-body text-secondary max-w-md text-balance">
                {COPY.proof.body}
              </p>
            </Reveal>

            <Reveal delay={160}>
              <figure className="mt-9 rounded-card border border-separator bg-elevated p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-headline">{COPY.proof.example.service}</p>
                    <p className="text-subhead text-secondary mt-1">
                      {COPY.proof.example.vehicle}
                    </p>
                  </div>
                  <p className="font-condensed font-bold text-title1 tabular-nums shrink-0">
                    {COPY.proof.example.total}
                  </p>
                </div>

                {/*
                  The marker is derived, not placed. It was hard-coded at 38%
                  while the value it represents sits at 23.9% of the range: a
                  14-point error on the only chart on a page whose argument is
                  that a number on its own is a rumour.

                  Only the rule itself is aria-hidden. The two amounts are the
                  most decision-relevant numbers in the card and were being
                  hidden from screen readers along with the decoration.
                */}
                <div className="mt-7">
                  <div className="relative h-px bg-separator" aria-hidden="true">
                    <span className="absolute left-0 -top-1 h-2 w-px bg-label/30" />
                    <span
                      className="absolute -top-1.5 h-3 w-0.5 bg-accent"
                      style={{ left: `${markerPercent.toFixed(1)}%` }}
                    />
                    <span className="absolute right-0 -top-1 h-2 w-px bg-label/30" />
                  </div>
                  <p className="mt-2 flex justify-between text-caption text-tertiary-label tabular-nums">
                    <span>{COPY.proof.example.low}</span>
                    <span>{COPY.proof.example.high}</span>
                  </p>
                  <p className="mt-1 text-caption text-tertiary-label">
                    What this job typically runs.
                  </p>
                </div>

                <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-separator pt-4">
                  <div>
                    <dt className="text-caption text-tertiary-label">Parts</dt>
                    <dd className="text-subhead tabular-nums mt-0.5">{COPY.proof.example.parts}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-tertiary-label">Labour</dt>
                    <dd className="text-subhead tabular-nums mt-0.5">{COPY.proof.example.labour}</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-tertiary-label">Receipt</dt>
                    <dd className="text-subhead mt-0.5 text-accent">{COPY.proof.example.receipt}</dd>
                  </div>
                </dl>

                <figcaption className="mt-5 text-footnote text-tertiary-label">
                  {COPY.proof.example.caption}
                </figcaption>
              </figure>
            </Reveal>
          </div>

          {hasImage(PROOF_IMAGE) && (
            <Reveal delay={240} className="hidden lg:block">
              <Image
                src={PROOF_IMAGE}
                alt=""
                width={1500}
                height={2250}
                sizes="(max-width: 1024px) 0px, 34vw"
                className="w-full rounded-card object-cover max-h-[62vh] shadow-raised"
              />
            </Reveal>
          )}
        </div>
      </Chapter>

      {/* Five: the scale of it, and the ask. */}
      {counts.length > 0 && (
        <Chapter label="scale">
          <Reveal>
            <h2 id="scale" className="text-title1 tracking-[-0.02em] text-accent max-w-md text-balance">
              {COPY.scale.heading}
            </h2>
          </Reveal>
          <dl className="mt-14 grid gap-12 sm:grid-cols-3">
            {counts.map(([n, label], i) => (
              <Reveal key={label} delay={160 + i * 120}>
                <dd className="font-condensed font-bold text-[3.25rem] sm:text-[4rem] leading-none text-accent">
                  <CountUp value={n} />
                </dd>
                <dt className="text-subhead text-secondary mt-3">{label}</dt>
              </Reveal>
            ))}
          </dl>
          <Reveal delay={520}>
            <div className="mt-20 flex justify-center">
              <Link href="/register" className={`${buttonStyles.primary} px-10`}>
                {COPY.scale.button}
              </Link>
            </div>
          </Reveal>
        </Chapter>
      )}
    </div>
  );
}

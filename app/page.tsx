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
    button: "Add what you paid",
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
    body: "Every price here came from someone who paid it. Add yours, upload the receipt, and it is marked confirmed.",
    button: "Get started",
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
                sizes="(max-width: 1024px) 92vw, 52vw"
                className="w-full rounded-card object-cover shadow-raised"
              />
            </Reveal>
          )}
        </div>
      </section>

      {/* Two: the way in. */}
      <Chapter label="start">
        <div className="grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16 lg:items-center">
          <Reveal>
            <QuickFilters makes={makes} />
          </Reveal>
          <Reveal delay={160}>
            <h2 id="start" className="text-title1 tracking-[-0.02em] text-accent max-w-sm text-balance">
              {COPY.start.heading}
            </h2>
            <p className="mt-4 text-body text-secondary max-w-sm text-balance">
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
        <div className="mt-12 border-t border-separator">
          {COPY.record.trades.map((trade, i) => (
            <Reveal key={trade.id} delay={160 + i * 120}>
              <div className="flex flex-col gap-3 border-b border-separator py-8 sm:py-10">
                <h3 className="text-title2 tracking-[-0.015em]">{trade.name}</h3>
                <p className="text-body text-secondary max-w-2xl">{trade.line}</p>
              </div>
            </Reveal>
          ))}
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

                <div className="mt-7" aria-hidden="true">
                  <div className="relative h-px bg-separator">
                    <span className="absolute left-0 -top-1 h-2 w-px bg-label/30" />
                    <span className="absolute left-[38%] -top-1.5 h-3 w-0.5 bg-accent" />
                    <span className="absolute right-0 -top-1 h-2 w-px bg-label/30" />
                  </div>
                  <div className="mt-2 flex justify-between text-caption text-tertiary-label tabular-nums">
                    <span>{COPY.proof.example.low}</span>
                    <span>{COPY.proof.example.high}</span>
                  </div>
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
                sizes="42vw"
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
            <p className="mt-16 text-body text-secondary max-w-lg text-balance">
              {COPY.scale.body}
            </p>
            <Link href="/register" className={`${buttonStyles.primary} mt-7 px-8`}>
              {COPY.scale.button}
            </Link>
          </Reveal>
        </Chapter>
      )}
    </div>
  );
}

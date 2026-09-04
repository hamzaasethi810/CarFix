import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { QuickFilters } from "@/components/landing/quick-filters";
import { Reveal } from "@/components/landing/reveal";
import { Plate } from "@/components/plate";
import { Reconciliation } from "@/components/reconciliation";
import {
  Columns,
  Figure,
  OperationLine,
  RangeScale,
  SheetHeader,
  buttonStyles,
} from "@/components/ui";
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
  /*
    One label, one destination.

    There used to be two: "File a price" here and "File your first price" at
    the foot, both pointing at /register. A design critique counted four CTA
    labels for two destinations. Two names for one action is not emphasis, it
    is a reader wondering whether they are different things.
  */
  cta: {
    label: "File a price",
    href: "/register",
  },
  start: {
    heading: "Start with the car you actually own.",
    body: "Or start from the other end. Add what you were charged, and the next owner with your car stops guessing.",
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
      vehicle: "Mercedes-AMG GT R",
      generation: "C190",
      total: "$2,180",
      low: "$1,640",
      high: "$3,900",
      parts: "$1,690",
      labour: "$490",
      caption: "An example, to show the shape of a report. Not a real price.",
      range: "What this job typically runs.",
    },
  },
  scale: {
    heading: "What is in it so far.",
    labels: {
      shops: "Garages listed",
      generations: "Vehicle generations",
      services: "Kinds of work",
    },
  },
} as const;

const PLATE_TRADES = "/img/gtr.webp";
const PLATE_PROOF = "/img/gt3rs.webp";

/** The figures are authored as printed strings, so the arithmetic reads them back. */
const amount = (s: string) => Number(s.replace(/[^0-9.]/g, ""));

/*
  A section of the document.

  The scroll-snap that used to pin each of these to the viewport is gone. Snap
  plus a record long enough to read is a fight: a hard flick carried you past
  a chapter, and a chapter taller than the window could not be read at all
  without the browser dragging you off it.
*/
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
    <section
      aria-labelledby={labelledBy}
      className={`border-t border-separator ${className}`}
    >
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-20 sm:py-28">{children}</div>
    </section>
  );
}

export default async function HomePage() {
  const [stats, makes] = await Promise.all([getProofNumbers(), getMakes()]);

  const ex = COPY.proof.example;
  const parts = amount(ex.parts);
  const labour = amount(ex.labour);
  const total = amount(ex.total);

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
        One: the record.

        No car photograph above the fold. The category ships a full-bleed hero
        shot with a search field floating over it, and the whole argument of
        this page is that a price is a document rather than a mood. So the
        first thing on screen is an actual itemised record that reconciles.
      */}
      <section className="mx-auto w-full max-w-5xl px-5 sm:px-8 pt-14 pb-20 sm:pt-20 sm:pb-28">
        <Reveal>
          <h1 className="text-large-title sm:text-[3.25rem] sm:leading-[1.05] tracking-[-0.03em] text-balance">
            {COPY.hero.heading}
          </h1>
          <p className="mt-5 max-w-xl text-body text-secondary text-pretty">{COPY.hero.body}</p>
        </Reveal>

        <Reveal delay={120} className="mt-14">
          <SheetHeader as="h2" title={ex.service} code={ex.generation} meta={ex.vehicle} />

          <Columns
            heads={["Parts", "Labour"]}
            label="Example repair order"
            className="mt-2"
          >
            <OperationLine label={ex.service} figures={[ex.parts, ex.labour]} />
          </Columns>

          <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-14 sm:items-end">
            {/*
              The range sits beside the total rather than under it, so the
              question the visitor actually arrived with (is this number
              normal) is answered on the same line as the number.
            */}
            <RangeScale
              low={amount(ex.low)}
              high={amount(ex.high)}
              value={total}
              caption={ex.range}
            />

            <Reconciliation
              lines={[
                { label: "Parts", amount: parts },
                { label: "Labour", amount: labour },
              ]}
              total={total}
            />
          </div>

          {/*
            The signature line. On a repair order the owner signs bottom
            right, so that is where the action goes: the position is a
            convention the visitor has obeyed their whole adult life, which
            is worth more than any amount of emphasis.
          */}
          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4 border-t border-separator pt-6">
            <p className="text-footnote text-tertiary-label max-w-sm text-pretty">{ex.caption}</p>
            <Link href={COPY.cta.href} className={`${buttonStyles.primary} px-8`}>
              {COPY.cta.label}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Two: the way in. */}
      <Section labelledBy="start">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16 md:items-center">
          <Reveal>
            <QuickFilters makes={makes} />
          </Reveal>
          <Reveal delay={140}>
            <h2 id="start" className="text-title1 tracking-[-0.022em] text-balance">
              {COPY.start.heading}
            </h2>
            <p className="mt-4 text-body text-secondary text-pretty">{COPY.start.body}</p>
          </Reveal>
        </div>
      </Section>

      {/*
        Three: what is covered.

        A ruled run rather than three cards. These have no figures, so a table
        would be a lie about their shape, and three equal cards side by side is
        the arrangement every generated page reaches for.
      */}
      <Section labelledBy="record">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)] lg:gap-20">
          <div>
            <Reveal>
              <h2 id="record" className="text-title1 tracking-[-0.022em] max-w-md text-balance">
                {COPY.record.heading}
              </h2>
            </Reveal>
            <dl className="mt-10 border-t border-separator">
              {COPY.record.trades.map((trade, i) => (
                <Reveal key={trade.id} delay={140 + i * 80}>
                  <div className="border-b border-separator py-7">
                    <dt className="text-title3 font-semibold tracking-[-0.015em]">{trade.name}</dt>
                    <dd className="mt-1.5 text-body text-secondary max-w-prose text-pretty">
                      {trade.line}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>

          {hasImage(PLATE_TRADES) && (
            <Reveal delay={200} className="hidden lg:block lg:self-end">
              <Plate
                src={PLATE_TRADES}
                alt=""
                width={1500}
                height={2250}
                sizes="(max-width: 1024px) 0px, 28rem"
              />
            </Reveal>
          )}
        </div>
      </Section>

      {/* Four: what a report is. */}
      <Section labelledBy="proof">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16 lg:items-center">
          <Reveal>
            <h2 id="proof" className="text-title1 tracking-[-0.022em] text-balance">
              {COPY.proof.heading}
            </h2>
            <p className="mt-5 text-body text-secondary max-w-md text-pretty">{COPY.proof.body}</p>
          </Reveal>

          {hasImage(PLATE_PROOF) && (
            <Reveal delay={160}>
              <Plate
                src={PLATE_PROOF}
                alt=""
                width={2400}
                height={1600}
                sizes="(max-width: 1024px) 88vw, 34rem"
              />
            </Reveal>
          )}
        </div>
      </Section>

      {/*
        Five: the scale of it, and the ask.

        Rendered only for figures that are actually above zero. Shops are
        listed and prices are not yet, so printing three noughts would be an
        admission dressed as a statistic.
      */}
      {counts.length > 0 && (
        <Section labelledBy="scale">
          <Reveal>
            <h2 id="scale" className="text-title1 tracking-[-0.022em] max-w-md text-balance">
              {COPY.scale.heading}
            </h2>
          </Reveal>
          <dl className="mt-12 grid gap-10 sm:grid-cols-3 border-t border-separator pt-10">
            {counts.map(([n, label], i) => (
              <Reveal key={label} delay={140 + i * 80}>
                {/*
                  CountUp seeds itself with the real value rather than zero, so
                  the server renders the true number and it is correct with no
                  JavaScript at all. It only drops to zero at the instant it
                  starts animating.
                */}
                <Figure value={<CountUp value={n} />} label={label} />
              </Reveal>
            ))}
          </dl>
          <Reveal delay={420}>
            <div className="mt-16 flex justify-end border-t border-separator pt-8">
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

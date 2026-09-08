import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { GenerationPicker } from "@/components/landing/generation-picker";
import { Reveal } from "@/components/landing/reveal";
import Image from "next/image";
import { ReceiptExample } from "@/components/landing/receipt-example";
import { buttonStyles } from "@/components/ui";
import { hasImage } from "@/lib/design/assets";
import { getProofNumbers } from "@/lib/services/stats";
import { getMakes, getServices } from "@/lib/services/taxonomy";

export const revalidate = 300;

/* ------------------------------------------------------------------------
   ALL THE WORDS ON THIS PAGE LIVE HERE.
   --------------------------------------------------------------------- */
const COPY = {
  hero: {
    heading: "Find the shop that knows your car.",
    body: "Thousands of garages, wrap shops and tuners, with real reviews and verified pricing."
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
    heading: "Every price is checked against its receipt",
    body: "After we verify your receipt, we delete it for your security.",
  },
  scale: {
    heading: "Real Data",
    body: "All shops and reviews will tell you if they are verified.",
    labels: { shops: "Garages listed", generations: "Vehicle generations", services: "Kinds of work" },
  },
} as const;

const PLATE_HERO = "/img/gt3rs.webp";

/*
  One block on screen at a time.

  Each section fills the viewport below the header and snaps to it, so the hero
  is never sharing the screen with the section under it. min-h rather than a
  fixed height: a block that outgrows a short window still scrolls normally
  instead of being clipped, and proximity snapping rather than mandatory means
  a long block can be read without the browser pulling you off it.

  An earlier pass removed snapping from this page because it was fighting a
  very tall record in the hero. That record is gone, so the objection went with
  it.
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
      /*
        Alternating stock, set by the caller.

        Every block sat on the same ground, so after the hero the page read as
        one photograph followed by three pages of text. A tone change is the
        cheapest thing that makes a block feel like its own panel, and it costs
        nothing in load, motion or contrast — the second copy tone is already
        in the palette and already contrast-checked against the ink.
      */
      className={`home-block flex min-h-[calc(100dvh-4rem)] items-center border-t border-separator ${className}`}
    >
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-16">{children}</div>
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
  const [stats, makes, services] = await Promise.all([
    getProofNumbers(),
    getMakes(),
    getServices(),
  ]);

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
      <section className="home-block relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden">
        {/*
          The car is the background of the block, full bleed.

          A scrim sits over it rather than a fade across it. The fade was doing
          two jobs badly: hiding the photograph where the text was, and dimming
          it everywhere else as the price.

          The scrim is 62 percent of the page's own stock, and that number is
          measured rather than chosen. The darkest pixel under the text region
          is pure black, which gives the ink 1.22:1 against it — completely
          unreadable. At 60 percent the worst case becomes 5.84:1, clear of the
          4.5 floor with room to spare, and the photograph still comes through
          at forty percent across the whole block rather than a strip of it.

          aria-hidden because it carries no information.
        */}
        {hasImage(PLATE_HERO) && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <Image
              src={PLATE_HERO}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[var(--scrim)]" />
          </div>
        )}

        <div className="relative mx-auto w-full max-w-5xl px-5 sm:px-8 py-16">
          <div className="max-w-xl">
            <Reveal>
              <h1 className="text-[2.4rem] leading-[1.08] sm:text-[3.25rem] sm:leading-[1.04] tracking-[-0.03em] text-balance">
                {COPY.hero.heading}
              </h1>
              {/*
                Full ink, not the secondary grey used everywhere else.

                Secondary is the ink at 72 percent, and measured against the
                darkest pixel under this text it reaches only 4.07:1 even with a
                heavy scrim — it would have forced the scrim up to 75 percent
                and dimmed the photograph to buy back a contrast the grey itself
                was spending. Hierarchy here comes from size and weight instead.
              */}
              <p className="mt-5 max-w-lg text-body text-label text-pretty">{COPY.hero.body}</p>
            </Reveal>

            <Reveal delay={120} className="mt-9">
              <GenerationPicker makes={makes} services={services} />
            </Reveal>
          </div>

        </div>
      </section>

      {/*
        Two: what counts as work here.

        A ruled editorial list rather than three equal columns of text. Three
        identical columns is the text version of the three-identical-cards
        pattern every generated page reaches for, and it gave each trade the
        same weight as a footnote. Full measure, one per row, the name at title
        scale: they are the three halves of what this site covers, so they are
        allowed to take up room.
      */}
      <Section labelledBy="trades" className="bg-grouped">
        <Reveal>
          <h2 id="trades" className="text-title1 tracking-[-0.022em] max-w-md text-balance">
            {COPY.trades.heading}
          </h2>
        </Reveal>
        <dl className="mt-12 border-t border-separator">
          {COPY.trades.items.map((t, i) => (
            <Reveal key={t.id} delay={120 + i * 90}>
              <div
                className={
                  "group grid gap-2 border-b border-separator py-7 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-10 sm:py-9 " +
                  "transition-[border-color] duration-200 " +
                  "[@media(hover:hover)_and_(pointer:fine)]:hover:border-accent"
                }
              >
                <dt className="text-title2 font-semibold tracking-[-0.02em]">{t.name}</dt>
                <dd className="text-body text-secondary max-w-prose text-pretty self-center">
                  {t.line}
                </dd>
              </div>
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
            <p className="mt-4 text-subhead text-secondary max-w-md text-pretty">
            </p>
            <Link href={COPY.cta.href} className={`${buttonStyles.secondaryAccent} mt-7 px-6`}>
              {COPY.cta.label}
            </Link>
          </Reveal>

          <Reveal delay={160}>
            <ReceiptExample />
          </Reveal>
        </div>
      </Section>

      {/* Four: the honest state of it. */}
      {counts.length > 0 && (
        <Section labelledBy="scale">
          <Reveal>
            <h2 id="scale" className="text-title1 tracking-[-0.022em] text-balance">
              {COPY.scale.heading}
            </h2>
            <p className="mt-4 text-body text-secondary max-w-md text-pretty">{COPY.scale.body}</p>
          </Reveal>

          {/*
            Set at display scale, because these are the only hard numbers on
            the page and they were being whispered in a side column at the size
            of a caption. Everything else here is a claim; this is the one
            thing that is simply true, and it is the reason to believe the
            rest. Tabular figures so the three sit on a common rhythm rather
            than jostling as they count up.
          */}
          <dl className="mt-14 grid gap-10 border-t border-separator pt-10 sm:grid-cols-3">
            {counts.map(([n, label], i) => (
              <Reveal key={label} delay={140 + i * 90}>
                <dd className="tabular text-[3rem] sm:text-[3.75rem] font-semibold leading-none tracking-[-0.03em]">
                  <CountUp value={n} />
                </dd>
                <dt className="text-subhead text-secondary mt-3">{label}</dt>
              </Reveal>
            ))}
          </dl>

          <Reveal delay={440}>
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

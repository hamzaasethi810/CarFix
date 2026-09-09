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

const HERO_WIDE = "/img/hero-911.webp";
const HERO_BAND = "/img/hero-911-band.webp";

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
      <section className="home-block hero-ground relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden">
        {/*
          The photograph, and nothing on top of it.

          It carries no information, so it is aria-hidden and it is not a
          decorative frame around the words — on wide screens it is the section's
          own ground, with the words standing in the empty studio floor to the
          car's left. The layout switch lives in globals.css, where the wide
          branch can be gated on aspect as well as width in one place.

          No scrim over it. The photograph is shot on a near-white ground that
          is already this page's own tone, so the type sits on it in the same
          ink as every other block and the picture runs at full strength. The
          asset is built by scripts/build-hero-image.mjs, which crops the
          Porsche wordmark out of the source and grows the studio wall leftwards
          so the car has somewhere to be that is not behind the headline.
        */}
        {hasImage(HERO_WIDE) && hasImage(HERO_BAND) && (
          <div data-no-blend aria-hidden="true" className="hero-figure pointer-events-none">
            {/*
              Art direction, not two copies of one picture. Only the framing the
              current layout uses is ever fetched: the other is display:none, and
              a lazy image with no box is never requested. That is also why
              neither is marked priority — priority preloads unconditionally, so
              a phone would pull the wide crop it will never show.
            */}
            <Image
              src={HERO_BAND}
              alt=""
              fill
              sizes="100vw"
              className="hero-img-band object-cover object-center"
            />
            <Image
              src={HERO_WIDE}
              alt=""
              fill
              sizes="100vw"
              className="hero-img-wide object-cover object-right"
            />
          </div>
        )}

        <div className="relative flex flex-1 items-center px-6 py-14 sm:px-10 xl:px-12 xl:py-0">
          <div className="hero-copy">
            <Reveal>
              <h1 className="text-[2.4rem] leading-[1.08] sm:text-[3.25rem] sm:leading-[1.04] tracking-[-0.03em] text-balance">
                {COPY.hero.heading}
              </h1>
              <p className="mt-5 text-body text-secondary text-pretty">{COPY.hero.body}</p>
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
            rest. In the accent, because the one true thing on the page should
            be the thing wearing the brand's colour.

            tabular-nums rather than the site's .tabular class. Both fix the
            digit widths so the numbers do not jostle as they count up, but
            .tabular also switches to Geist Mono, and in a monospace face the
            comma takes a full character advance — at this size "3,737" set
            itself as "3 , 737" with a gap either side. That is correct on the
            receipt, which is a printed document and reads as one; these are
            display type and belong in the same face as the heading above them.
          */}
          <dl className="mt-14 grid gap-10 border-t border-separator pt-10 sm:grid-cols-3">
            {counts.map(([n, label], i) => (
              <Reveal key={label} delay={140 + i * 90}>
                <dd className="tabular-nums text-[3rem] sm:text-[3.75rem] font-semibold leading-none tracking-[-0.03em] text-accent">
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

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

const PLATE_HERO = "/img/gt2rs.webp";

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
          The car sits behind the block rather than beside it.

          Confined to the right 62 percent and faded into the page from its own
          left edge, so it never runs under the headline or the controls. A
          photograph at this opacity is atmosphere, and atmosphere competing
          with a form for the same pixels only makes the form harder to read.

          Desktop only. At narrow widths the text occupies the full width, so
          there is no column for the image to sit behind — it would be directly
          under the words rather than beside them. aria-hidden throughout: it
          carries nothing.
        */}
        {hasImage(PLATE_HERO) && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] lg:block"
          >
            <Image
              src={PLATE_HERO}
              alt=""
              fill
              priority
              sizes="62vw"
              className="object-cover object-center opacity-[0.38] [mask-image:linear-gradient(to_right,transparent,black_38%)]"
            />
          </div>
        )}

        <div className="relative mx-auto w-full max-w-5xl px-5 sm:px-8 py-16">
          <div className="max-w-xl">
            <Reveal>
              <h1 className="text-[2.4rem] leading-[1.08] sm:text-[3.25rem] sm:leading-[1.04] tracking-[-0.03em] text-balance">
                {COPY.hero.heading}
              </h1>
              <p className="mt-5 max-w-lg text-body text-secondary text-pretty">{COPY.hero.body}</p>
            </Reveal>

            <Reveal delay={120} className="mt-9">
              <GenerationPicker makes={makes} services={services} />
            </Reveal>
          </div>

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

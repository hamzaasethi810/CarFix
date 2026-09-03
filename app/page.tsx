import Image from "next/image";
import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { QuickFilters } from "@/components/landing/quick-filters";
import { buttonStyles } from "@/components/ui";
import { hasImage } from "@/lib/design/assets";
import { getProofNumbers } from "@/lib/services/stats";
import { getMakes } from "@/lib/services/taxonomy";

/*
  The landing page.

  The argument, in order: this is priced for your car specifically, here are
  the three trades it covers, here is how a price gets here, here is what one
  looks like, and here is what stops it being hearsay.

  Photography is composed for but not required. Each slot asks hasImage() and
  falls back to type on a tonal ground, so the page is whole today and better
  the moment the files land. A grey box captioned "image" is worse than an
  honest absence.
*/
export const revalidate = 300;

const HERO_IMAGE = "/img/hero.webp";

const TRADES = [
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
];

const STEPS = [
  {
    title: "Tell it what you drive",
    body: "Make, model, and the generation. A 3 Series spans four platforms and their bills have nothing in common.",
  },
  {
    title: "See what owners paid",
    body: "Real amounts from people with your car, at shops near you, for the job you are about to agree to.",
  },
  {
    title: "Add your own",
    body: "Upload the receipt and your report is marked confirmed. That is what keeps the next person from guessing.",
  },
];

export default async function HomePage() {
  const [stats, makes] = await Promise.all([getProofNumbers(), getMakes()]);
  const heroImage = hasImage(HERO_IMAGE);

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
    <main className="pb-28">
      {/*
        A dark band under the type, whether or not there is a photograph in
        it. White on a deep ground is legible over any image, so the layout
        does not change when the file arrives.
      */}
      <section className="relative isolate overflow-hidden bg-[#16181A] text-white">
        {heroImage && (
          <>
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/*
              A scrim, not a wash. Weighted toward the left where the type
              sits, so the picture stays a picture on the right.
            */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#16181A]/92 via-[#16181A]/70 to-[#16181A]/30"
            />
          </>
        )}

        {/*
          Height follows the content. With a photograph the band earns real
          scale; without one it is type on a dark ground and stretching it to
          the same height leaves a large empty rectangle that reads as a
          failed image rather than a deliberate band.
        */}
        <div
          className={`relative mx-auto max-w-6xl px-5 sm:px-6 ${
            heroImage ? "py-28 sm:py-36 lg:py-44" : "py-16 sm:py-20"
          }`}
        >
          <h1 className="max-w-2xl text-large-title sm:text-[3.75rem] sm:leading-[1.02] tracking-[-0.025em] text-balance">
            Real prices, tailored to your car.
          </h1>
          <p className="mt-6 max-w-xl text-body text-white/70 text-balance">
            What owners actually paid their mechanic, their wrap shop and their
            tuner. Filed by generation, because your car is not just its badge.
          </p>
        </div>
      </section>

      {/*
        The filter rides up over the band's edge, so the first thing below the
        headline is the control rather than another paragraph.
      */}
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/*
          relative z-10 is load-bearing. The band above is positioned, so a
          static sibling pulled up by a negative margin paints underneath it
          and the filter's heading vanishes behind the black.
        */}
        <div
          className={`relative z-10 grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-8 lg:gap-14 lg:items-center ${
            heroImage ? "-mt-12 sm:-mt-16" : "mt-10 sm:mt-12"
          }`}
        >
          <QuickFilters makes={makes} />

          <div className="lg:pt-10">
            <p className="text-body text-secondary max-w-md text-balance">
              Or start from the other end: add what you were charged, and the
              next owner with your car stops guessing.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/register" className={`${buttonStyles.secondary} px-6`}>
                Add what you paid
              </Link>
              {counts.length > 0 && (
                <p className="text-footnote text-tertiary-label">
                  {counts
                    .map(([n, l]) => `${n.toLocaleString("en-US")} ${l.toLowerCase()}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/*
          The three trades. Image on one side, type on the other, alternating
          so it does not read as three identical rows stamped out.
        */}
        <section aria-labelledby="record" className="mt-28 sm:mt-36">
          <h2 id="record" className="text-title1 tracking-[-0.02em] max-w-md text-balance">
            One record, three kinds of work.
          </h2>

          <div className="mt-12 border-t border-separator">
            {TRADES.map((trade, i) => {
              const src = `/img/${trade.id}.webp`;
              const withImage = hasImage(src);
              return (
                <div
                  key={trade.id}
                  className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 sm:gap-10 items-center border-b border-separator py-10 sm:py-12"
                >
                  <div className={i % 2 === 1 ? "sm:order-2" : undefined}>
                    <h3 className="text-title2 tracking-[-0.015em]">{trade.name}</h3>
                    <p className="text-body text-secondary mt-3 max-w-md">{trade.line}</p>
                  </div>
                  {withImage && (
                    <Image
                      src={src}
                      alt=""
                      width={900}
                      height={600}
                      sizes="(max-width: 640px) 90vw, 45vw"
                      className={`h-40 sm:h-48 w-auto object-contain ${
                        i % 2 === 1 ? "sm:order-1" : "sm:justify-self-end"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="how" className="mt-28 sm:mt-36">
          <h2 id="how" className="text-title1 tracking-[-0.02em] max-w-md text-balance">
            How a price gets here.
          </h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3 className="text-headline">{step.title}</h3>
                <p className="text-subhead text-secondary mt-2.5">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/*
          What a report looks like, marked as illustrative in the markup and
          on screen. With nothing reported yet this is the only honest way to
          show the shape of the thing.
        */}
        <section aria-labelledby="shape" className="mt-28 sm:mt-36">
          <h2 id="shape" className="text-title1 tracking-[-0.02em] max-w-md text-balance">
            Every report carries its receipt.
          </h2>
          <p className="text-body text-secondary mt-4 max-w-lg">
            A price on its own is a rumour. Upload the receipt and it is read,
            checked against the shop and the total you entered, then destroyed.
            Only the confirmation is kept.
          </p>

          <figure className="mt-10 max-w-xl rounded-card border border-separator bg-elevated p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-headline">Brake pads and rotors, front</p>
                <p className="text-subhead text-secondary mt-1">E90 335i · independent specialist</p>
              </div>
              <p className="font-condensed font-bold text-title2 tabular-nums shrink-0">$640</p>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-separator pt-4">
              <div>
                <dt className="text-caption text-tertiary-label">Parts</dt>
                <dd className="text-subhead tabular-nums mt-0.5">$395</dd>
              </div>
              <div>
                <dt className="text-caption text-tertiary-label">Labour</dt>
                <dd className="text-subhead tabular-nums mt-0.5">$245</dd>
              </div>
              <div>
                <dt className="text-caption text-tertiary-label">Receipt</dt>
                <dd className="text-subhead mt-0.5 text-accent">Confirmed</dd>
              </div>
            </dl>
            <figcaption className="mt-5 text-footnote text-tertiary-label">
              An example, to show the shape of a report. Not a real price.
            </figcaption>
          </figure>
        </section>

        {counts.length > 0 && (
          <section className="mt-28 sm:mt-36 border-t border-separator pt-12">
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

        <section className="mt-24 sm:mt-32">
          <h2 className="text-title2 tracking-[-0.015em] max-w-lg text-balance">
            Every price here came from someone who paid it.
          </h2>
          <div className="mt-8">
            <Link href="/register" className={`${buttonStyles.primary} px-7`}>
              Create an account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

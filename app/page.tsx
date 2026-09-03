import Image from "next/image";
import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { QuickFilters } from "@/components/landing/quick-filters";
import { Reveal } from "@/components/landing/reveal";
import { buttonStyles } from "@/components/ui";
import { hasImage } from "@/lib/design/assets";
import { getProofNumbers } from "@/lib/services/stats";
import { getMakes } from "@/lib/services/taxonomy";

/*
  The landing page, as chapters.

  Each section holds the screen on its own: min-h-[100dvh] rather than
  h-screen, so a chapter that outgrows a small phone pushes the page taller
  instead of clipping its own content. Content is vertically centred, so a
  short chapter sits in the middle of the viewport rather than at the top of
  an empty one.

  Everything arrives on scroll, staggered inside each chapter so the eye
  follows a sequence rather than watching one rectangle fade in six times.

  Photography is composed for but not required: each slot asks hasImage() and
  composes without it.
*/
export const revalidate = 300;

const HERO_IMAGE = "/img/hero.webp";
const PROOF_IMAGE = "/img/proof.webp";

const TRADES = [
  { id: "mechanics", name: "Mechanics", line: "Brakes, oil, clutches, diagnostics." },
  { id: "appearance", name: "Wrap shops", line: "Wraps, PPF, respray." },
  { id: "performance", name: "Tuners", line: "Exhausts, tunes, kits." },
];

/* A chapter: one idea, one screen. */
function Chapter({
  children,
  dark = false,
  className = "",
  label,
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <section
      aria-labelledby={label}
      className={`flex min-h-[100dvh] items-center ${
        dark ? "bg-[#16181A] text-white" : ""
      } ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 py-20">{children}</div>
    </section>
  );
}

export default async function HomePage() {
  const [stats, makes] = await Promise.all([getProofNumbers(), getMakes()]);
  const heroImage = hasImage(HERO_IMAGE);

  /*
    Three numbers, all of them true today. "Prices reported" is not among
    them because it is zero, and a zero presented as proof is an admission.
    Service types is the honest third: it is the breadth of work the record
    can file a price against, which is the claim the page actually makes.
  */
  const counts: [number, string][] = (
    [
      [stats?.shops ?? 0, "Garages listed"],
      [stats?.generations ?? 0, "Vehicle generations"],
      [stats?.services ?? 0, "Kinds of work"],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    /*
      Not a <main>: the root layout already renders one, and nesting them is
      invalid. The marker class is what lets globals.css drop that layout
      container's width cap and padding for this route, so the hero and the
      dark chapters can run edge to edge.
    */
    <div className="home-root">
      {/*
        One: the claim.

        A split rather than type over a full-bleed photograph. The car sits
        centre-left in the source frame, which is exactly where a headline
        wants to be, and any overlay crop that clears it at one width puts
        the words back across the bonnet at another. Two columns cannot
        overlap at any size, and on a phone the picture simply follows the
        words.
      */}
      <section className="flex min-h-[100dvh] flex-col bg-[#16181A] text-white lg:grid lg:min-h-[100dvh] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
        <div className="flex flex-1 items-center px-5 sm:px-8 lg:px-12 xl:pl-20 py-16 sm:py-20 lg:py-0">
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <Reveal>
              <h1 className="text-large-title sm:text-[3.5rem] lg:text-[3.75rem] sm:leading-[1.03] tracking-[-0.025em] text-balance">
                Real prices, tailored to your car.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-md text-body text-white/70 text-balance">
                What owners paid their mechanic, wrap shop and tuner. Filed by
                generation, not by badge.
              </p>
            </Reveal>
          </div>
        </div>

        {heroImage ? (
          <div className="relative h-[46vh] min-h-[280px] w-full lg:h-auto">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              priority
              /* Half the viewport on a wide screen, all of it on a phone. */
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center"
            />
            {/*
              A short feather on the inner edge only, so the photograph meets
              the type column without a hard seam. It never reaches far enough
              to sit over the car.
            */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#16181A]/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#16181A] lg:via-transparent lg:to-transparent lg:[--tw-gradient-from-position:0%] lg:[--tw-gradient-via-position:14%]"
            />
          </div>
        ) : null}
      </section>

      {/* Two: the way in. */}
      <Chapter label="start">
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-10 lg:gap-16 lg:items-center">
          <Reveal>
            <QuickFilters makes={makes} />
          </Reveal>
          <Reveal delay={120}>
            <h2 id="start" className="text-title1 tracking-[-0.02em] max-w-sm text-balance">
              Start with the car you actually own.
            </h2>
            <p className="mt-4 text-body text-secondary max-w-sm text-balance">
              Or start from the other end. Add what you were charged, and the
              next owner with your car stops guessing.
            </p>
            <Link href="/register" className={`${buttonStyles.secondary} mt-7 px-6`}>
              Add what you paid
            </Link>
          </Reveal>
        </div>
      </Chapter>

      {/* Three: what is covered. */}
      <Chapter label="record">
        <Reveal>
          <h2 id="record" className="text-title1 tracking-[-0.02em] max-w-md text-balance">
            One record, three kinds of work.
          </h2>
        </Reveal>
        <div className="mt-12 border-t border-separator">
          {TRADES.map((trade, i) => {
            const src = `/img/${trade.id}.webp`;
            return (
              <Reveal key={trade.id} delay={140 + i * 110}>
                <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:gap-10 items-center border-b border-separator py-9">
                  <div className={i % 2 === 1 ? "sm:order-2" : undefined}>
                    <h3 className="text-title3 tracking-[-0.015em]">{trade.name}</h3>
                    <p className="text-subhead text-secondary mt-1.5">{trade.line}</p>
                  </div>
                  {hasImage(src) && (
                    <Image
                      src={src}
                      alt=""
                      width={800}
                      height={560}
                      sizes="(max-width: 640px) 88vw, 40vw"
                      className={`h-36 sm:h-44 w-auto object-contain ${
                        i % 2 === 1 ? "sm:order-1" : "sm:justify-self-end"
                      }`}
                    />
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </Chapter>

      {/*
        Four: what a report is.

        Three columns of content in two, on a chapter that also carries a
        photograph: the picture takes its own column so nothing is ever set
        over the car, and it drops out entirely below lg where there is no
        room for a third thing.
      */}
      <Chapter label="proof" dark>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16 lg:items-center">
          <div>
            <Reveal>
              <h2 id="proof" className="text-title1 tracking-[-0.02em] text-balance">
                Every price carries its receipt.
              </h2>
              <p className="mt-5 text-body text-white/70 max-w-md text-balance">
                A number on its own is a rumour. Upload the receipt and it is
                read, checked against the shop and total you entered, then
                destroyed. Only the confirmation is kept.
              </p>
            </Reveal>

            <Reveal delay={140}>
              <figure className="mt-9 rounded-card border border-white/12 bg-white/[0.04] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-headline">Carbon ceramic pads, front</p>
                    <p className="text-subhead text-white/60 mt-1">
                      Mercedes-AMG GT R · C190
                    </p>
                  </div>
                  <p className="font-condensed font-bold text-title1 tabular-nums shrink-0">
                    $2,180
                  </p>
                </div>

                <div className="mt-7" aria-hidden="true">
                  <div className="relative h-px bg-white/20">
                    <span className="absolute left-0 -top-1 h-2 w-px bg-white/35" />
                    <span className="absolute left-[38%] -top-1.5 h-3 w-0.5 bg-[#5FD08A]" />
                    <span className="absolute right-0 -top-1 h-2 w-px bg-white/35" />
                  </div>
                  <div className="mt-2 flex justify-between text-caption text-white/45 tabular-nums">
                    <span>$1,640</span>
                    <span>$3,900</span>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/12 pt-4">
                  <div>
                    <dt className="text-caption text-white/45">Parts</dt>
                    <dd className="text-subhead tabular-nums mt-0.5">$1,690</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-white/45">Labour</dt>
                    <dd className="text-subhead tabular-nums mt-0.5">$490</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-white/45">Receipt</dt>
                    <dd className="text-subhead mt-0.5 text-[#5FD08A]">Confirmed</dd>
                  </div>
                </dl>

                <figcaption className="mt-5 text-footnote text-white/45">
                  An example, to show the shape of a report. Not a real price.
                </figcaption>
              </figure>
            </Reveal>
          </div>

          {hasImage(PROOF_IMAGE) && (
            <Reveal delay={220} className="hidden lg:block">
              <Image
                src={PROOF_IMAGE}
                alt=""
                width={1500}
                height={2250}
                sizes="45vw"
                className="w-full rounded-card object-cover max-h-[68vh]"
              />
            </Reveal>
          )}
        </div>
      </Chapter>

      {/* Five: the scale of it. */}
      {counts.length > 0 && (
        <Chapter label="scale">
          <Reveal>
            <h2 id="scale" className="text-title1 tracking-[-0.02em] max-w-md text-balance">
              What is in it so far.
            </h2>
          </Reveal>
          <dl className="mt-14 grid gap-12 sm:grid-cols-3">
            {counts.map(([n, label], i) => (
              <Reveal key={label} delay={140 + i * 110}>
                <dd className="font-condensed font-bold text-[3.25rem] sm:text-[4rem] leading-none">
                  <CountUp value={n} />
                </dd>
                <dt className="text-subhead text-secondary mt-3">{label}</dt>
              </Reveal>
            ))}
          </dl>
        </Chapter>
      )}

      {/* Six: the ask. */}
      <Chapter label="close">
        <Reveal>
          <h2 id="close" className="text-title1 tracking-[-0.02em] max-w-xl text-balance">
            Every price here came from someone who paid it.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-5 text-body text-secondary max-w-md text-balance">
            Add yours, upload the receipt, and it is marked confirmed. That is
            the whole mechanism.
          </p>
          <Link href="/register" className={`${buttonStyles.primary} mt-9 px-8`}>
            Create an account
          </Link>
        </Reveal>
      </Chapter>
    </div>
  );
}

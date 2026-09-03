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

  Built as chapters on alternating grounds rather than one column of prose.
  An earlier version stacked five text sections down a single bone-coloured
  page and read as a wall of words with no way in; a full-bleed dark band
  between the light ones does more to separate two ideas than any amount of
  margin, and it gives the eye somewhere to rest.

  Copy is deliberately short. Every section says one thing.

  Photography is composed for but not required: each slot asks hasImage() and
  composes without it, so the page is whole today and better when files land
  in public/img.
*/
export const revalidate = 300;

const HERO_IMAGE = "/img/hero.webp";

const TRADES = [
  { id: "mechanics", name: "Mechanics", line: "Brakes, oil, clutches, diagnostics." },
  { id: "appearance", name: "Wrap shops", line: "Wraps, PPF, respray." },
  { id: "performance", name: "Tuners", line: "Exhausts, tunes, kits." },
];

export default async function HomePage() {
  const [stats, makes] = await Promise.all([getProofNumbers(), getMakes()]);
  const heroImage = hasImage(HERO_IMAGE);

  const counts: [number, string][] = (
    [
      [stats?.shops ?? 0, "Garages listed"],
      [stats?.experiences ?? 0, "Prices reported"],
      [stats?.generations ?? 0, "Vehicle generations"],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    <main>
      {/* Chapter one, dark. */}
      <section className="relative isolate overflow-hidden bg-[#16181A] text-white">
        {heroImage && (
          <>
            <Image src={HERO_IMAGE} alt="" fill priority sizes="100vw" className="object-cover" />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#16181A]/92 via-[#16181A]/72 to-[#16181A]/35"
            />
          </>
        )}
        <div
          className={`relative mx-auto max-w-6xl px-5 sm:px-6 ${
            heroImage ? "py-28 sm:py-36" : "py-20 sm:py-24"
          }`}
        >
          <h1 className="max-w-2xl text-large-title sm:text-[3.75rem] sm:leading-[1.02] tracking-[-0.025em] text-balance">
            Real prices, tailored to your car.
          </h1>
          <p className="mt-5 max-w-md text-body text-white/70 text-balance">
            What owners paid their mechanic, wrap shop and tuner. Filed by
            generation, not by badge.
          </p>
        </div>
      </section>

      {/*
        The filter gets its own light chapter and nothing else in it. It was
        previously pulled up over the band's edge and sharing a row with a
        paragraph and a button, which is what made the top of the page read
        as three things fighting.
      */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-16 sm:py-20">
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-10 lg:gap-16 lg:items-center">
          <QuickFilters makes={makes} />
          <div>
            <p className="text-body text-secondary max-w-sm text-balance">
              Or start from the other end. Add what you were charged, and the
              next owner with your car stops guessing.
            </p>
            <Link href="/register" className={`${buttonStyles.secondary} mt-6 px-6`}>
              Add what you paid
            </Link>
          </div>
        </div>
      </section>

      {/* Chapter two, light: what is covered. */}
      <section aria-labelledby="record" className="mx-auto max-w-6xl px-5 sm:px-6 pb-20 sm:pb-24">
        <h2 id="record" className="text-title1 tracking-[-0.02em] max-w-md text-balance">
          One record, three kinds of work.
        </h2>
        <div className="mt-10 border-t border-separator">
          {TRADES.map((trade, i) => {
            const src = `/img/${trade.id}.webp`;
            return (
              <div
                key={trade.id}
                className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:gap-10 items-center border-b border-separator py-8"
              >
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
            );
          })}
        </div>
      </section>

      {/*
        Chapter three, dark: what a report is. The record itself is the
        illustration here, which is the one picture this page can honestly
        draw with no data and no photography.
      */}
      <section aria-labelledby="proof" className="bg-[#16181A] text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 lg:items-center">
            <div>
              <h2 id="proof" className="text-title1 tracking-[-0.02em] text-balance">
                Every price carries its receipt.
              </h2>
              <p className="mt-5 text-body text-white/70 max-w-md text-balance">
                A number on its own is a rumour. Upload the receipt and it is
                read, checked against the shop and total you entered, then
                destroyed. Only the confirmation is kept.
              </p>
            </div>

            <figure className="rounded-card border border-white/12 bg-white/[0.04] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-headline">Brake pads and rotors, front</p>
                  <p className="text-subhead text-white/60 mt-1">E90 335i</p>
                </div>
                <p className="font-condensed font-bold text-title1 tabular-nums shrink-0">$640</p>
              </div>

              {/*
                What the range looks like once there is data. Geometry, not a
                picture of a chart: three ticks on a rule, the middle one
                marking where this report sits.
              */}
              <div className="mt-7" aria-hidden="true">
                <div className="relative h-px bg-white/20">
                  <span className="absolute left-0 -top-1 h-2 w-px bg-white/35" />
                  <span className="absolute left-[46%] -top-1.5 h-3 w-0.5 bg-accent" />
                  <span className="absolute right-0 -top-1 h-2 w-px bg-white/35" />
                </div>
                <div className="mt-2 flex justify-between text-caption text-white/45 tabular-nums">
                  <span>$430</span>
                  <span>$980</span>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/12 pt-4">
                <div>
                  <dt className="text-caption text-white/45">Parts</dt>
                  <dd className="text-subhead tabular-nums mt-0.5">$395</dd>
                </div>
                <div>
                  <dt className="text-caption text-white/45">Labour</dt>
                  <dd className="text-subhead tabular-nums mt-0.5">$245</dd>
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
          </div>
        </div>
      </section>

      {/* Chapter four, light: the close. */}
      <section className="mx-auto max-w-6xl px-5 sm:px-6 py-20 sm:py-28">
        {counts.length > 0 && (
          <dl className="grid gap-10 sm:grid-cols-3 pb-16 border-b border-separator">
            {counts.map(([n, label]) => (
              <div key={label}>
                <dd className="font-condensed font-bold text-large-title leading-none">
                  <CountUp value={n} />
                </dd>
                <dt className="text-subhead text-secondary mt-2">{label}</dt>
              </div>
            ))}
          </dl>
        )}

        <div className="pt-16">
          <h2 className="text-title2 tracking-[-0.015em] max-w-lg text-balance">
            Every price here came from someone who paid it.
          </h2>
          <Link href="/register" className={`${buttonStyles.primary} mt-8 px-7`}>
            Create an account
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ScrollStory, type Beat } from "@/components/landing/scroll-story";
import { buttonStyles } from "@/components/ui";
import { getProofNumbers } from "@/lib/services/stats";

/*
  The landing page: one scroll, one car, five beats.

  It used to be the search tool, which left a visitor looking at a globe and a
  filter bar with no idea what the site was for. The tool lives at /search now.
  This page's argument is that the same record serves someone who just wants to
  know whether a bill was fair and someone specifying a titanium system, so the
  car is taken apart on the way down: opened up, resprayed, then followed to
  the back.
*/
export const revalidate = 300;

export default async function HomePage() {
  const stats = await getProofNumbers();

  /*
    A count of zero is not proof, it is an admission. Zeros are dropped and
    the row lays out to whatever is left.
  */
  const counts: [number, string][] = (
    [
      [stats?.experiences ?? 0, "Reported services"],
      [stats?.shops ?? 0, "Garages"],
      [stats?.generations ?? 0, "Vehicle generations"],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  const beats: Beat[] = [
    {
      panel: (
        <div>
          <h1 className="text-large-title sm:text-[3.25rem] sm:leading-[1.05] text-balance">
            Know what it should cost.
          </h1>
          <p className="text-body text-secondary mt-5 max-w-xl mx-auto text-balance">
            See what real owners paid their mechanic, for your exact make, model
            and year. Real prices, not quotes.
          </p>
        </div>
      ),
    },
    {
      panel: (
        <div>
          <h2 className="text-title1">Real mechanics, real bills</h2>
          <p className="text-body text-secondary mt-4 max-w-xl mx-auto text-balance">
            Brakes, oil, clutches, diagnostics. What the shop charged and what
            the same job costs elsewhere, so you know before you agree to it.
          </p>
        </div>
      ),
    },
    {
      panel: (
        <div>
          <h2 className="text-title1">Wraps, paint and bodywork</h2>
          <p className="text-body text-secondary mt-4 max-w-xl mx-auto text-balance">
            Full wraps, PPF, respray. Work that never has a list price, priced
            by the people who paid for it.
          </p>
        </div>
      ),
    },
    {
      panel: (
        <div>
          <h2 className="text-title1">Tunes, kits and exhausts</h2>
          <p className="text-body text-secondary mt-4 max-w-xl mx-auto text-balance">
            See what other owners paid to fit an exhaust, run a tune or install
            a kit on your exact generation.
          </p>
        </div>
      ),
    },
    {
      panel: (
        <div>
          <h2 className="text-title1 text-balance">
            Whatever you drive it for.
          </h2>
          {counts.length > 0 && (
            <div
              className="mt-8 grid gap-8"
              style={{ gridTemplateColumns: `repeat(${counts.length}, minmax(0, 1fr))` }}
            >
              {counts.map(([n, label]) => (
                <div key={label}>
                  <div className="font-condensed font-bold text-title1 leading-none tabular-nums text-accent">
                    {n.toLocaleString("en-US")}
                  </div>
                  <div className="text-caption text-secondary mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/login" className={`${buttonStyles.primary} px-8`}>
              Get started
            </Link>
            <Link href="/search" className={buttonStyles.secondary}>
              Find shops near me
            </Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <main>
      <ScrollStory beats={beats} />
    </main>
  );
}

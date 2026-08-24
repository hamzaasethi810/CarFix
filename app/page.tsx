import Link from "next/link";
import { Card } from "@/components/ui";

const FEATURES = [
  {
    title: "Real prices",
    body: "Owner-reported totals with parts and labor, shown as a median with the sample size — never as a quote.",
  },
  {
    title: "Your generation",
    body: "A G80 M3 owner sees G80 data, not every BMW ever made.",
  },
  {
    title: "Receipt-verified",
    body: "Owners can verify a service with a receipt. We check it, then delete it.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="text-center pt-6 pb-4">
        <h1 className="text-large-title sm:text-[2.75rem] sm:leading-[3.25rem] font-bold tracking-tight max-w-2xl mx-auto text-balance">
          Who should work on <span className="text-brand">your</span> car?
        </h1>
        <p className="text-secondary text-body mt-4 max-w-xl mx-auto text-pretty">
          Find local mechanics who have actually worked on cars like yours, see what other owners
          paid, and read reviews written by enthusiasts who know the platform.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/mechanics"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-control bg-accent text-on-accent text-headline font-semibold hover:bg-accent-hover transition-colors duration-150"
          >
            Find a mechanic
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-control bg-fill text-accent text-headline font-semibold hover:opacity-80 transition-opacity duration-150"
          >
            Add your car
          </Link>
        </div>
      </section>

      <section aria-label="How CarFix works" className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <h2 className="text-headline font-semibold">{f.title}</h2>
            <p className="text-secondary text-subhead mt-1.5">{f.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="text-center py-10">
        <h1 className="text-4xl font-semibold tracking-tight">
          Who should work on <span className="text-accent">your</span> car?
        </h1>
        <p className="text-muted mt-3 max-w-2xl mx-auto">
          Find local mechanics who have actually worked on cars like yours, see what other owners
          paid, and read reviews written by enthusiasts who know the platform.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/mechanics"
            className="rounded-md bg-accent text-accent-fg px-4 py-2 font-medium"
          >
            Find a mechanic
          </Link>
          <Link href="/register" className="rounded-md border border-border px-4 py-2 font-medium">
            Add your car
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="font-medium">Real prices</h2>
          <p className="text-muted text-sm mt-1">
            Owner-reported totals with parts and labor, shown as a median with the sample size —
            never as a quote.
          </p>
        </Card>
        <Card>
          <h2 className="font-medium">Your generation</h2>
          <p className="text-muted text-sm mt-1">
            A G80 M3 owner sees G80 data, not every BMW ever made.
          </p>
        </Card>
        <Card>
          <h2 className="font-medium">Receipt-verified</h2>
          <p className="text-muted text-sm mt-1">
            Owners can optionally verify a service with a receipt. We check it, then delete it.
          </p>
        </Card>
      </section>
    </div>
  );
}

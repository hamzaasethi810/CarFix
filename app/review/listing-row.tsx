"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, ErrorText, buttonStyles, num, formatDate } from "@/components/ui";

type Listing = {
  id: string;
  name: string;
  place: string;
  phone: string | null;
  website: string | null;
  submittedBy: string;
  submittedAt: string | null;
  reportCount: number;
};

/*
  A listing somebody added by hand. There is no document to check here — the
  judgement is whether the place plausibly exists, helped by the address having
  already geocoded and by how many people have reported work there.
*/
export function ListingRow({ item }: { item: Listing }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"CONFIRMED" | "REJECTED" | null>(null);

  async function decide(decision: "CONFIRMED" | "REJECTED") {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/listings/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setPending(false);
    setConfirming(null);
    if (!res.ok) return setError("That decision could not be recorded.");
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-headline font-semibold">{item.name}</h2>
        <span className="text-subhead text-secondary">added by {item.submittedBy}</span>
      </div>

      <p className="text-subhead text-secondary">
        {item.place}
        {item.phone && ` · ${item.phone}`}
        {item.submittedAt && ` · ${formatDate(item.submittedAt)}`}
      </p>

      <p className="text-footnote text-secondary">
        {num(item.reportCount)} {item.reportCount === 1 ? "report" : "reports"} so far
        {item.website && (
          <>
            {" · "}
            <a
              href={item.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-accent"
            >
              website
            </a>
          </>
        )}
        {" · "}
        <Link href={`/mechanics/${item.id}`} className="text-accent">
          view listing
        </Link>
      </p>

      {confirming ? (
        <div role="alertdialog" aria-label="Confirm decision" className="rounded-control bg-fill p-4 space-y-3">
          <p className="text-subhead">
            {confirming === "CONFIRMED"
              ? `Confirm ${item.name} as a real business?`
              : `Remove ${item.name}?`}{" "}
            <span className="text-secondary">
              {confirming === "CONFIRMED"
                ? "It loses the unconfirmed label and becomes eligible to be claimed and subscribed."
                : "It is hidden from the map. Reports already attached to it are kept, not destroyed."}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => decide(confirming)}
              disabled={pending}
              className={confirming === "CONFIRMED" ? buttonStyles.primary : buttonStyles.destructive}
            >
              {pending ? "Working…" : confirming === "CONFIRMED" ? "Yes, confirm" : "Yes, remove"}
            </button>
            <button type="button" onClick={() => setConfirming(null)} disabled={pending} className={buttonStyles.secondary}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setConfirming("CONFIRMED")} disabled={pending} className={buttonStyles.primary}>
            Confirm
          </button>
          <button type="button" onClick={() => setConfirming("REJECTED")} disabled={pending} className={buttonStyles.destructive}>
            Remove
          </button>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

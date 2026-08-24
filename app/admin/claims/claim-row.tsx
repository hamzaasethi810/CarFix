"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, buttonStyles } from "@/components/ui";

type Claim = {
  id: string;
  businessName: string;
  contactPhone: string | null;
  note: string | null;
  submittedAt: string;
  hasDocument: boolean;
  claimant: string;
  shop: { id: string; name: string; city: string; state: string };
};

export function ClaimRow({ item }: { item: Claim }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function viewDocument() {
    setError(null);
    const res = await fetch(`/api/admin/claims/${item.id}/document`);
    if (!res.ok) return setError("That document is no longer available.");
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/claims/${item.id}`, {
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
        <h2 className="text-headline font-semibold">{item.businessName}</h2>
        <span className="text-subhead text-secondary">{item.claimant}</span>
      </div>

      <p className="text-subhead text-secondary">
        Claiming {item.shop.name}
        {item.shop.city && ` — ${item.shop.city}, ${item.shop.state}`}
        {item.contactPhone && ` · ${item.contactPhone}`} ·{" "}
        <time dateTime={item.submittedAt}>
          {new Date(item.submittedAt).toLocaleDateString()}
        </time>
      </p>

      {item.note && <p className="text-subhead">{item.note}</p>}

      {confirming ? (
        <div role="alertdialog" aria-label="Confirm decision" className="rounded-control bg-fill p-4 space-y-3">
          <p className="text-subhead">
            {confirming === "APPROVED"
              ? `Hand ${item.shop.name} to ${item.claimant}?`
              : "Reject this claim?"}{" "}
            <span className="text-secondary">
              The document is permanently deleted either way. This cannot be undone.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => decide(confirming)}
              disabled={pending}
              className={confirming === "APPROVED" ? buttonStyles.primary : buttonStyles.destructive}
            >
              {pending ? "Working…" : confirming === "APPROVED" ? "Yes, approve" : "Yes, reject"}
            </button>
            <button type="button" onClick={() => setConfirming(null)} disabled={pending} className={buttonStyles.secondary}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={viewDocument} disabled={!item.hasDocument || pending} className={buttonStyles.secondary}>
            {item.hasDocument ? "View document" : "No document"}
          </button>
          <button type="button" onClick={() => setConfirming("APPROVED")} disabled={pending} className={buttonStyles.primary}>
            Approve
          </button>
          <button type="button" onClick={() => setConfirming("REJECTED")} disabled={pending} className={buttonStyles.destructive}>
            Reject
          </button>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

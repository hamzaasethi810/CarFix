"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, buttonStyles, miles, money } from "@/components/ui";
import { DocumentViewer } from "@/components/document-viewer";

type QueueItem = {
  id: string;
  totalPrice: number;
  serviceDate: string;
  mileageAtService: number;
  service: { name: string };
  mechanic: { name: string; city: string; state: string };
  vehicle: { year: number; make: string; model: string; generation: string };
  author: { username: string; displayName: string } | null;
  hasReceipt: boolean;
};

type Decision = "VERIFIED" | "REJECTED";

export function VerificationRow({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState<Decision | null>(null);
  const [viewing, setViewing] = useState(false);

  /*
    Opens it in a dialog on this page. It used to open a signed storage URL in
    a new tab, which downloaded the file — a copy that survived both the link
    expiring and the receipt being destroyed.
  */
  function viewReceipt() {
    setError(null);
    setViewing(true);
  }

  async function decide(decision: Decision) {
    setPending(true);
    setError(null);

    const res = await fetch(`/api/admin/verifications/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });

    setPending(false);
    setConfirming(null);
    if (!res.ok) return setError("That decision could not be recorded.");
    // The receipt no longer exists, so the dialog showing it must go too.
    setViewing(false);
    router.refresh();
  }

  return (
    <>
    {viewing && (
      <DocumentViewer
        src={`/api/admin/verifications/${item.id}/receipt`}
        title={`Receipt — ${item.mechanic.name}, ${money(item.totalPrice)}`}
        onClose={() => setViewing(false)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-footnote text-secondary flex-1 min-w-[12rem]">
            Reported {money(item.totalPrice)} for {item.service.name}. Deciding
            deletes this receipt permanently.
          </span>
          <button
            type="button"
            onClick={() => decide("VERIFIED")}
            disabled={pending}
            className={buttonStyles.primary}
          >
            {pending ? "Working…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => decide("REJECTED")}
            disabled={pending}
            className={buttonStyles.destructive}
          >
            Reject
          </button>
        </div>
      </DocumentViewer>
    )}
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-headline font-semibold">
          {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}{" "}
          <span className="text-secondary font-normal">{item.vehicle.generation}</span>
        </h2>
        <span className="text-subhead text-secondary">
          {item.author?.displayName ?? "Unknown"}
        </span>
      </div>

      <p className="text-subhead text-secondary">
        {item.service.name} · <span className="tabular-nums">{money(item.totalPrice)}</span> ·{" "}
        {item.mechanic.name} ({item.mechanic.city}, {item.mechanic.state}) ·{" "}
        <time dateTime={item.serviceDate}>
          {new Date(item.serviceDate).toLocaleDateString()}
        </time>{" "}
        · {miles(item.mileageAtService)}
      </p>

      {confirming ? (
        /*
          Both outcomes destroy the receipt permanently, so neither happens on a
          single click — the consequence is spelled out before it is confirmed.
        */
        <div className="rounded-control bg-fill p-4 space-y-3" role="alertdialog" aria-label="Confirm decision">
          <p className="text-subhead">
            {confirming === "VERIFIED"
              ? "Mark this experience verified?"
              : "Reject this verification request?"}{" "}
            <span className="text-secondary">
              The receipt will be permanently deleted either way. This cannot be undone.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => decide(confirming)}
              disabled={pending}
              className={confirming === "VERIFIED" ? buttonStyles.primary : buttonStyles.destructive}
            >
              {pending ? "Working…" : confirming === "VERIFIED" ? "Yes, verify" : "Yes, reject"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={pending}
              className={buttonStyles.secondary}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={viewReceipt}
            disabled={!item.hasReceipt || pending}
            className={buttonStyles.secondary}
          >
            {item.hasReceipt ? "View receipt" : "No receipt"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming("VERIFIED")}
            disabled={pending}
            className={buttonStyles.primary}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setConfirming("REJECTED")}
            disabled={pending}
            className={buttonStyles.destructive}
          >
            Reject
          </button>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}
    </Card>
    </>
  );
}

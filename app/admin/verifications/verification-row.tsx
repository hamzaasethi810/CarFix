"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, money } from "@/components/ui";

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

export function VerificationRow({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function viewReceipt() {
    setError(null);
    const res = await fetch(`/api/admin/verifications/${item.id}/receipt`);
    if (!res.ok) return setError("That receipt is no longer available.");
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function decide(decision: "VERIFIED" | "REJECTED") {
    setPending(true);
    setError(null);

    const res = await fetch(`/api/admin/verifications/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });

    setPending(false);
    if (!res.ok) return setError("That decision could not be recorded.");
    router.refresh();
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">
          {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}{" "}
          <span className="text-muted font-normal">{item.vehicle.generation}</span>
        </h2>
        <span className="text-sm text-muted">
          {item.author?.displayName ?? "Unknown"}
        </span>
      </div>

      <div className="text-sm text-muted">
        {item.service.name} · {money(item.totalPrice)} · {item.mechanic.name} (
        {item.mechanic.city}, {item.mechanic.state}) ·{" "}
        {new Date(item.serviceDate).toLocaleDateString()} ·{" "}
        {item.mileageAtService.toLocaleString()} mi
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={viewReceipt}
          disabled={!item.hasReceipt || pending}
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {item.hasReceipt ? "View receipt" : "No receipt"}
        </button>
        <button
          type="button"
          onClick={() => decide("VERIFIED")}
          disabled={pending}
          className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => decide("REJECTED")}
          disabled={pending}
          className="rounded-md bg-accent text-accent-fg px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

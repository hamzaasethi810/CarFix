"use client";

import { useState } from "react";
import { Card, ErrorText, money } from "@/components/ui";
import { Field, Select, TextInput } from "@/components/form";
import { buttonStyles } from "@/components/ui";

type Price = {
  serviceId: string;
  service: string;
  category: string;
  minPrice: number;
  maxPrice: number | null;
  note: string | null;
};

/*
  A shop's own asking prices. A range is optional — leave the second figure
  blank for a fixed price. These are always shown separately from what owners
  report paying, so a published price can never be mistaken for evidence.
*/
export function PriceEditor({
  mechanicId,
  initial,
  services,
}: {
  mechanicId: string;
  initial: Price[];
  services: { id: string; name: string }[];
}) {
  const [prices, setPrices] = useState<Price[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(formData: FormData) {
    setPending(true);
    setError(null);

    const maxRaw = String(formData.get("maxPrice") ?? "").trim();
    const res = await fetch(`/api/shops/${mechanicId}/prices`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: formData.get("serviceId"),
        minPrice: Number(formData.get("minPrice")),
        maxPrice: maxRaw === "" ? null : Number(maxRaw),
        note: (formData.get("note") as string)?.trim() || null,
      }),
    });

    const body = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) return setError(body?.error?.message ?? "That price could not be saved.");
    setPrices(body);
  }

  async function remove(serviceId: string) {
    setError(null);
    const res = await fetch(
      `/api/shops/${mechanicId}/prices?serviceId=${encodeURIComponent(serviceId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) return setError("That price could not be removed.");
    setPrices((p) => p.filter((x) => x.serviceId !== serviceId));
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-headline font-semibold">Your published prices</h2>
        <p className="text-subhead text-secondary mt-1">
          Give a single figure, or a range if the job varies by car. Shown to
          customers as your asking price, separately from what owners report.
        </p>
      </div>

      {prices.length > 0 && (
        <ul className="divide-y divide-separator border-y border-separator">
          {prices.map((p) => (
            <li key={p.serviceId} className="flex flex-wrap items-center gap-3 py-3">
              <span className="text-subhead font-medium flex-1 min-w-40">{p.service}</span>
              <span className="text-subhead tabular-nums">
                {p.maxPrice != null && p.maxPrice !== p.minPrice
                  ? `${money(p.minPrice)} – ${money(p.maxPrice)}`
                  : money(p.minPrice)}
              </span>
              {p.note && <span className="text-footnote text-secondary">{p.note}</span>}
              <button
                type="button"
                onClick={() => remove(p.serviceId)}
                className="min-h-11 px-3 text-footnote text-destructive"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <Field label="Service">
          {({ id }) => (
            <Select id={id} name="serviceId" required>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="From">
          {({ id }) => (
            <TextInput id={id} name="minPrice" type="number" min={0} step="1" required inputMode="decimal" />
          )}
        </Field>

        <Field label="To" hint="Leave blank for a fixed price.">
          {({ id, describedBy }) => (
            <TextInput id={id} aria-describedby={describedBy} name="maxPrice" type="number" min={0} step="1" inputMode="decimal" placeholder="Optional" />
          )}
        </Field>

        <Field label="Note">
          {({ id }) => <TextInput id={id} name="note" maxLength={200} placeholder="Optional" />}
        </Field>

        <button
          type="submit"
          disabled={pending}
          className={`${buttonStyles.primary} px-5 disabled:opacity-50 text-subhead`}
        >
          {pending ? "Saving…" : "Save price"}
        </button>
      </form>

      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckboxRow, Field, Select, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, ErrorText } from "@/components/ui";
import { MechanicPicker } from "@/components/mechanic-picker";

type Option = { id: string; label?: string; name?: string };

const RATINGS = [
  ["overallRating", "Overall"],
  ["qualityRating", "Work quality"],
  ["priceRating", "Price"],
  ["communicationRating", "Communication"],
  ["turnaroundRating", "Turnaround"],
  ["knowledgeRating", "Enthusiast knowledge"],
] as const;

export function NewExperienceForm({
  vehicles,
  services,
}: {
  vehicles: Option[];
  services: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const num = (k: string) => {
      const v = formData.get(k);
      return v === null || v === "" ? undefined : Number(v);
    };

    const payload: Record<string, unknown> = {
      vehicleId: formData.get("vehicleId"),
      mechanicId: formData.get("mechanicId"),
      serviceId: formData.get("serviceId"),
      totalPrice: num("totalPrice"),
      serviceDate: formData.get("serviceDate"),
      mileageAtService: num("mileageAtService"),
      wouldRecommend: formData.get("wouldRecommend") === "on",
      wouldReturn: formData.get("wouldReturn") === "on",
    };

    const parts = num("partsCost");
    if (parts !== undefined) payload.partsCost = parts;
    const labor = num("laborCost");
    if (labor !== undefined) payload.laborCost = labor;
    const review = formData.get("reviewText");
    if (review) payload.reviewText = String(review);
    for (const [key] of RATINGS) payload[key] = num(key);

    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPending(false);
      return setError(body?.error?.message ?? "We could not save that experience.");
    }

    const created = await res.json();

    // The receipt is a separate, optional step so a failed upload never loses
    // the experience the owner just wrote.
    if (receipt) {
      const form = new FormData();
      form.set("file", receipt);
      await fetch(`/api/experiences/${created.id}/receipt`, { method: "POST", body: form });
    }

    setPending(false);
    router.push(`/experiences/${created.id}`);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <h2 className="text-headline font-semibold">What was done</h2>

        <Field label="Which car?">
          {({ id }) => (
            <Select id={id} name="vehicleId" required>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Which mechanic?"
          hint="Search by shop name or town."
        >
          {() => <MechanicPicker name="mechanicId" required />}
        </Field>

        <Field label="Service">
          {({ id }) => (
            <Select id={id} name="serviceId" required>
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-headline font-semibold">Cost and date</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total price">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="totalPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                required
              />
            )}
          </Field>

          <Field label="Service date">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="serviceDate"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
              />
            )}
          </Field>

          <Field label="Parts cost">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="partsCost"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="Optional"
              />
            )}
          </Field>

          <Field label="Labor cost">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="laborCost"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="Optional"
              />
            )}
          </Field>

          <Field label="Mileage at service">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="mileageAtService"
                type="number"
                inputMode="numeric"
                min={0}
                required
              />
            )}
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-headline font-semibold">How was it?</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {RATINGS.map(([name, label]) => (
            <Field key={name} label={label}>
              {({ id }) => (
                <Select id={id} name={name} defaultValue="5" required>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} — {["Poor", "Fair", "Good", "Great", "Excellent"][n - 1]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:gap-8">
          <CheckboxRow name="wouldRecommend" label="Would recommend" defaultChecked />
          <CheckboxRow name="wouldReturn" label="Would return" defaultChecked />
        </div>

        <Field label="Review">
          {({ id, describedBy }) => (
            <TextArea
              id={id}
              aria-describedby={describedBy}
              name="reviewText"
              rows={4}
              maxLength={5000}
              placeholder="Optional — what stood out?"
            />
          )}
        </Field>
      </Card>

      <Card>
        <h2 className="text-headline font-semibold mb-1">Receipt</h2>
        <p className="text-subhead text-secondary mb-4">
          Optional. We check it to verify your pricing, then delete it. It is never shown publicly.
        </p>

        <label className="flex items-center justify-center min-h-11 rounded-control bg-fill text-accent text-subhead font-medium cursor-pointer hover:opacity-80 transition-opacity duration-150">
          {receipt ? `Selected: ${receipt.name}` : "Choose a receipt"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          />
        </label>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}

      <SubmitButton pending={pending}>Submit experience</SubmitButton>
    </form>
  );
}

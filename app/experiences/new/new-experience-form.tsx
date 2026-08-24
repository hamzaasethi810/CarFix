"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, ErrorText } from "@/components/ui";

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
  mechanics,
}: {
  vehicles: Option[];
  services: Option[];
  mechanics: Option[];
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
    <form action={onSubmit} className="space-y-6">
      <Card className="space-y-3">
        <Field label="Which car?">
          <Select name="vehicleId" required>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Which mechanic?">
          <Select name="mechanicId" required>
            <option value="">Select a mechanic</option>
            {mechanics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="What was done?">
          <Select name="serviceId" required>
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card className="grid gap-3 sm:grid-cols-2">
        <Field label="Total price">
          <TextInput name="totalPrice" type="number" min={0} step="0.01" required />
        </Field>
        <Field label="Service date">
          <TextInput name="serviceDate" type="date" required />
        </Field>
        <Field label="Parts cost">
          <TextInput name="partsCost" type="number" min={0} step="0.01" placeholder="Optional" />
        </Field>
        <Field label="Labor cost">
          <TextInput name="laborCost" type="number" min={0} step="0.01" placeholder="Optional" />
        </Field>
        <Field label="Mileage at service">
          <TextInput name="mileageAtService" type="number" min={0} required />
        </Field>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium">How was it?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {RATINGS.map(([name, label]) => (
            <Field key={name} label={label}>
              <Select name={name} defaultValue="5" required>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="wouldRecommend" defaultChecked />
            Would recommend
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="wouldReturn" defaultChecked />
            Would return
          </label>
        </div>

        <Field label="Review">
          <TextArea name="reviewText" rows={4} maxLength={5000} placeholder="Optional" />
        </Field>
      </Card>

      <Card>
        <Field
          label="Receipt (optional)"
          hint="We check it to verify your pricing, then delete it. It is never shown publicly."
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="block w-full text-sm"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          />
        </Field>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Submit experience</SubmitButton>
    </form>
  );
}

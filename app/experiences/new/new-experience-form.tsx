"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckboxRow, Field, Select, SubmitButton, TextArea, TextInput } from "@/components/form";
import { StarRating } from "@/components/star-rating";
import { ErrorText, Sheet, Stars } from "@/components/ui";
import { Reconciliation } from "@/components/reconciliation";
import { MechanicPicker } from "@/components/mechanic-picker";
import { ServicePicker } from "@/components/service-picker";

type Option = { id: string; label?: string; name?: string };

/*
  Four things a person can actually judge about a job, and no Overall.

  There were six, each a <select> pre-set to "5 - Excellent". A pre-filled top
  score is not a neutral default: it is a rating the form supplies on the
  reviewer's behalf, and most people submit it untouched, which quietly poisons
  the only data this product has. Price came out because the price is already
  the headline number on the record above -- asking someone to also star-rate it
  is asking the same question twice.

  Overall is no longer asked at all. It is the mean of these four, rounded, so
  it cannot disagree with them. It still exists in the database because shop
  averages are computed from it in SQL.
*/
const RATINGS = [
  ["qualityRating", "Work quality"],
  ["communicationRating", "Professionalism"],
  ["knowledgeRating", "Knowledge"],
  ["turnaroundRating", "Time spent"],
] as const;

type RatingKey = (typeof RATINGS)[number][0];

export function NewExperienceForm({ vehicles }: { vehicles: Option[] }) {
  const [ratings, setRatings] = useState<Partial<Record<RatingKey, number>>>({});
  const given = RATINGS.map(([k]) => ratings[k]).filter((n): n is number => typeof n === "number");
  const overall = given.length === RATINGS.length
    ? Math.round(given.reduce((a, b) => a + b, 0) / given.length)
    : 0;

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [serviceId, setServiceId] = useState("");
  // State updates are async; this flips immediately so a double click cannot
  // fire a second request before the button re-renders as disabled.
  const submitting = useRef(false);
  const [priceWarning, setPriceWarning] = useState<string | null>(null);
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  // Tracked only to drive the live reconciliation below the money fields;
  // the fields themselves stay uncontrolled and the form still reads them
  // from FormData by name at submit time.
  const [totalPrice, setTotalPrice] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");

  async function onSubmit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
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
    for (const [key] of RATINGS) payload[key] = ratings[key] ?? undefined;

    /*
      Overall is derived, never asked. Rounded to the nearest whole star so it
      matches how it is displayed, and it is the value shop averages are built
      from in SQL, so it has to be present.
    */
    const given = RATINGS.map(([k]) => ratings[k]).filter((n): n is number => typeof n === "number");
    payload.overallRating = given.length
      ? Math.round(given.reduce((a, b) => a + b, 0) / given.length)
      : undefined;

    /*
      priceRating is still a NOT NULL column and is no longer collected. It is
      written as the derived overall so the insert succeeds, and it is no longer
      shown anywhere. Dropping the column needs a migration, which is a change
      to the database rather than to this form, so it is deliberately not done
      here.
    */
    payload.priceRating = payload.overallRating;

    /*
      Sanity-check the figure before saving. This never blocks — if they have
      already seen the warning and stand by the number, it goes through.
    */
    if (!warningAccepted && serviceId && payload.totalPrice) {
      const check = await fetch(
        `/api/price-check?serviceId=${encodeURIComponent(serviceId)}&totalPrice=${payload.totalPrice}`,
      );
      const verdict = await check.json().catch(() => null);
      if (check.ok && verdict?.unusual) {
        setPriceWarning(verdict.message);
        setWarningAccepted(true);
        setPending(false);
        submitting.current = false;
        return;
      }
    }

    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPending(false);
      submitting.current = false;
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

    // Photos of the work, uploaded after the report exists so a failed upload
    // never costs them what they wrote.
    for (const photo of workPhotos) {
      const form = new FormData();
      form.set("file", photo);
      await fetch(`/api/experiences/${created.id}/photos`, { method: "POST", body: form });
    }

    setPending(false);
    router.push(`/experiences/${created.id}`);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Sheet className="p-5 space-y-4">
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

        {/* Searchable: 62 services is too many to scan in a dropdown. */}
        <div>
          <ServicePicker
            value={serviceId}
            onChange={setServiceId}
            label="Service"
            anyLabel="Search services…"
          />
          <input type="hidden" name="serviceId" value={serviceId} />
        </div>
      </Sheet>

      <Sheet className="p-5 space-y-4">
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
                onChange={(e) => setTotalPrice(e.target.value)}
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
                onChange={(e) => setPartsCost(e.target.value)}
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
                onChange={(e) => setLaborCost(e.target.value)}
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

        <Reconciliation
          live
          lines={[
            { label: "Parts", amount: Number(partsCost) || 0 },
            { label: "Labor", amount: Number(laborCost) || 0 },
          ]}
          total={Number(totalPrice) || 0}
          className="mt-8"
        />
      </Sheet>

      <Sheet className="p-5 space-y-4">
        <h2 className="text-headline font-semibold">How was it?</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {RATINGS.map(([name, label]) => (
            <StarRating
              key={name}
              name={name}
              label={label}
              value={ratings[name] ?? null}
              onChange={(v: number) => setRatings((r) => ({ ...r, [name]: v }))}
            />
          ))}
        </div>

        {/*
          Overall, shown rather than asked.

          It is the mean of the four above, so it updates as they are set and
          cannot contradict them. Read-only on purpose: a separate Overall
          control invites a score that disagrees with its own parts, which is
          exactly the kind of number this product exists to stop publishing.
        */}
        <div className="flex items-baseline justify-between border-t border-separator pt-4">
          <span className="text-subhead font-medium">Overall</span>
          {overall ? (
            <span className="flex items-center gap-2">
              <Stars value={overall} />
              <span className="text-footnote text-secondary tabular-nums">
                {overall} of 5, averaged
              </span>
            </span>
          ) : (
            <span className="text-footnote text-tertiary-label">
              Rate the four above and this fills in.
            </span>
          )}
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
      </Sheet>

      <Sheet className="p-5">
        <h2 className="text-headline font-semibold mb-1">Receipt</h2>
        <p className="text-subhead text-secondary mb-4">
          Optional. We check the shop name and total, then delete it — permanently,
          the moment a decision is made. A reviewer gets 120 seconds to look and
          nothing else. It is never shown publicly.{" "}
          <a href="/policies/receipts" className="text-accent" target="_blank" rel="noopener">
            Read the policy
          </a>
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
      </Sheet>

      <Sheet className="p-5">
        <Field
          label="Photos of the work (optional)"
          hint="The wrap, the brake kit, the exhaust. Up to two, and JPEG only."
        >
          {() => (
            <label className="flex items-center justify-center min-h-11 rounded-control bg-fill text-accent text-subhead font-medium cursor-pointer hover:opacity-80 transition-opacity duration-150">
              {workPhotos.length > 0 ? `${workPhotos.length} selected` : "Choose photos"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => setWorkPhotos(Array.from(e.target.files ?? []).slice(0, 4))}
              />
            </label>
          )}
        </Field>
      </Sheet>

      {priceWarning && (
        <Sheet className="p-5 border-l-2 border-warning">
          <p className="text-subhead">
            <span className="font-semibold">Does that look right?</span> {priceWarning}
          </p>
          <p className="text-footnote text-secondary mt-2">
            Submit again to save it as entered.
          </p>
        </Sheet>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <SubmitButton pending={pending}>
        {priceWarning ? "Yes, submit it" : "Submit experience"}
      </SubmitButton>
    </form>
  );
}

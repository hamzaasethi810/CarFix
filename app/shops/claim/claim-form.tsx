"use client";

import { useState } from "react";
import { Card, ErrorText } from "@/components/ui";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";
import { MechanicPicker } from "@/components/mechanic-picker";

/*
  Proof of trading. The document goes to private storage under a random key,
  is shown to a reviewer through a short-lived link, and is destroyed the
  moment a decision is made — the same lifecycle as a receipt. We ask to see
  it; we do not keep it.
*/
export function ClaimForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [document, setDocument] = useState<File | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    if (!document) {
      setPending(false);
      return setError("Attach a document showing you run this business.");
    }

    const body = new FormData();
    body.set("mechanicId", String(formData.get("mechanicId") ?? ""));
    body.set("businessName", String(formData.get("businessName") ?? ""));
    const phone = String(formData.get("contactPhone") ?? "").trim();
    if (phone) body.set("contactPhone", phone);
    const note = String(formData.get("note") ?? "").trim();
    if (note) body.set("note", note);
    body.set("document", document);

    const res = await fetch("/api/shops/claims", { method: "POST", body });
    setPending(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      return setError(payload?.error?.message ?? "That claim could not be submitted.");
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card>
        <h2 className="text-headline font-semibold">Claim submitted</h2>
        <p className="text-subhead text-secondary mt-1">
          We will review it shortly. Your document is deleted as soon as a
          decision is made, whichever way it goes.
        </p>
      </Card>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field label="Which shop?" hint="Search by name or town. Search the map first if it is not listed yet.">
          {() => <MechanicPicker name="mechanicId" required />}
        </Field>

        <Field label="Registered business name">
          {({ id }) => <TextInput id={id} name="businessName" required maxLength={200} />}
        </Field>

        <Field label="Contact phone">
          {({ id }) => <TextInput id={id} name="contactPhone" type="tel" maxLength={40} placeholder="Optional" />}
        </Field>
      </Card>

      <Card>
        <Field
          label="Proof you run this business"
          hint="A business licence, utility bill, or insurance certificate showing the business name and address. Image or PDF."
        >
          {() => (
            <label className="flex items-center justify-center min-h-11 rounded-control bg-fill text-accent text-subhead font-medium cursor-pointer hover:opacity-80 transition-opacity duration-150">
              {document ? `Selected: ${document.name}` : "Choose a document"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </Field>

        <div className="mt-4">
          <Field label="Anything else we should know?">
            {({ id }) => <TextArea id={id} name="note" rows={3} maxLength={1000} placeholder="Optional" />}
          </Field>
        </div>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Submit claim</SubmitButton>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, ErrorText } from "@/components/ui";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";

type Added = { id: string; name: string; resolvedTo: string; message: string };

export function AddShopForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const text = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v === "" ? null : v;
    };

    const res = await fetch("/api/shops/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        address: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
        zip: text("zip"),
        phone: text("phone"),
        website: text("website"),
        description: text("description"),
      }),
    });

    const body = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) return setError(body?.error?.message ?? "That shop could not be added.");
    setAdded(body);
  }

  if (added) {
    return (
      <Card className="space-y-3">
        <h2 className="text-headline font-semibold">{added.name} is on the map</h2>
        <p className="text-subhead text-secondary">{added.message}</p>
        <p className="text-footnote text-secondary">
          We placed it at: {added.resolvedTo}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/mechanics/${added.id}`}
            className="inline-flex items-center min-h-11 px-5 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold"
          >
            View it
          </Link>
          <button
            type="button"
            onClick={() => setAdded(null)}
            className="inline-flex items-center min-h-11 px-5 rounded-control bg-fill text-accent text-subhead font-semibold"
          >
            Add another
          </button>
        </div>
      </Card>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field label="Shop name">
          {({ id }) => <TextInput id={id} name="name" required maxLength={200} />}
        </Field>

        <Field
          label="Street address"
          hint="We look this up to place the pin, so it needs to be the real address."
        >
          {({ id, describedBy }) => (
            <TextInput id={id} aria-describedby={describedBy} name="address" required maxLength={200} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Town or city">
            {({ id }) => <TextInput id={id} name="city" required maxLength={100} />}
          </Field>
          <Field label="State or region">
            {({ id }) => <TextInput id={id} name="state" required maxLength={100} />}
          </Field>
          <Field label="Postcode">
            {({ id }) => <TextInput id={id} name="zip" maxLength={20} placeholder="Optional" />}
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <Field label="Phone">
          {({ id }) => <TextInput id={id} name="phone" type="tel" maxLength={40} placeholder="Optional" />}
        </Field>
        <Field label="Website">
          {({ id }) => <TextInput id={id} name="website" type="url" maxLength={500} placeholder="Optional" />}
        </Field>
        <Field label="What do they do?">
          {({ id }) => (
            <TextArea id={id} name="description" rows={3} maxLength={1000}
              placeholder="Optional — wraps, tuning, body work, whatever they are known for" />
          )}
        </Field>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Add this shop</SubmitButton>
    </form>
  );
}

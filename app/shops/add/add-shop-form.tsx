"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, ErrorText } from "@/components/ui";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";

type Added = { id: string; name: string; resolvedTo: string; message: string };
type Duplicate = { id: string; name: string };

export function AddShopForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);
  /*
    A shop nearby with a similar name. Held rather than thrown away, because
    the match is only a guess — two real businesses can share a name and a
    street — and the person filling the form knows which it is.
  */
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  const [lastSubmission, setLastSubmission] = useState<Record<string, unknown> | null>(null);

  async function send(payload: Record<string, unknown>) {
    setPending(true);
    setError(null);

    const res = await fetch("/api/shops/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    setPending(false);

    if (res.ok) {
      setDuplicate(null);
      setAdded(body);
      return;
    }

    const found = body?.error?.details?.duplicate;
    if (found && body?.error?.details?.canOverride) {
      setDuplicate(found);
      setLastSubmission(payload);
      setError(null);
      return;
    }

    setDuplicate(null);
    setError(body?.error?.message ?? "That shop could not be added.");
  }

  async function onSubmit(formData: FormData) {

    const text = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v === "" ? null : v;
    };

    await send({
      name: String(formData.get("name") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      zip: text("zip"),
      phone: text("phone"),
      website: text("website"),
      description: text("description"),
    });
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
            onClick={() => {
              setAdded(null);
              setDuplicate(null);
              setLastSubmission(null);
            }}
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

      {duplicate && (
        <Card className="space-y-3 border border-warning">
          <h2 className="text-headline font-semibold">
            Is this {duplicate.name}?
          </h2>
          <p className="text-subhead text-secondary text-pretty">
            A shop with a similar name is already listed at that address. If it
            is the same business, open the existing listing instead of adding it
            twice. If it is genuinely a different shop, go ahead — plenty of
            real businesses share a name or a plaza.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/mechanics/${duplicate.id}`}
              className="inline-flex items-center min-h-11 px-5 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold"
            >
              Open {duplicate.name}
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => lastSubmission && send({ ...lastSubmission, confirmDistinct: true })}
              className="inline-flex items-center min-h-11 px-5 rounded-control bg-fill text-accent text-subhead font-semibold"
            >
              {pending ? "Adding…" : "It is a different shop — add it"}
            </button>
          </div>
        </Card>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Add this shop</SubmitButton>
    </form>
  );
}

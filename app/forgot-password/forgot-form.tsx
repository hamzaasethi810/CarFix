"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, ErrorText } from "@/components/ui";
import { Field, SubmitButton, TextInput } from "@/components/form";

export function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(formData.get("email") ?? "") }),
    });

    const body = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) return setError(body?.error?.message ?? "Something went wrong. Try again.");
    // Deliberately the same message whether or not the address is registered.
    setSent(body.message);
  }

  if (sent) {
    return (
      <Card className="space-y-3">
        <h2 className="text-headline font-semibold">Check your email</h2>
        <p className="text-subhead text-secondary">{sent}</p>
        <p className="text-footnote text-secondary">
          The link works once and expires in an hour.
        </p>
        <Link href="/login" className="text-subhead text-accent font-medium">
          Back to sign in
        </Link>
      </Card>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card>
        <Field label="Your email">
          {({ id }) => (
            <TextInput id={id} name="email" type="email" required autoComplete="email"
              inputMode="email" autoCapitalize="none" autoFocus />
          )}
        </Field>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Send the link</SubmitButton>

      <p className="text-subhead text-secondary text-center">
        Remembered it?{" "}
        <Link href="/login" className="text-accent font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Card, ErrorText } from "@/components/ui";

/*
  Same account model as an owner — one login, whatever else you are. A shop
  owner who also owns a car should not need two.
*/
export function ShopSignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        username: String(formData.get("username") ?? ""),
        displayName: String(formData.get("displayName") ?? ""),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPending(false);
      return setError(body?.error?.message ?? "We could not create your account.");
    }

    await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    // Straight to the claim, which is the point of being here.
    router.push("/shops/claim");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field label="Your name">
          {({ id }) => <TextInput id={id} name="displayName" required maxLength={60} autoComplete="name" />}
        </Field>

        <Field label="Username" hint="Lowercase letters, numbers, and underscores.">
          {({ id, describedBy }) => (
            <TextInput id={id} aria-describedby={describedBy} name="username" required
              pattern="[a-z0-9_]{3,30}" autoCapitalize="none" autoComplete="username" />
          )}
        </Field>

        <Field label="Email">
          {({ id }) => (
            <TextInput id={id} name="email" type="email" required autoComplete="email"
              inputMode="email" autoCapitalize="none" />
          )}
        </Field>

        <Field label="Password" hint="At least 12 characters.">
          {({ id, describedBy }) => (
            <TextInput id={id} aria-describedby={describedBy} name="password" type="password"
              required minLength={12} autoComplete="new-password" />
          )}
        </Field>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Create account and continue</SubmitButton>
    </form>
  );
}

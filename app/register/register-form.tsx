"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Sheet, ErrorText } from "@/components/ui";
import { SocialSignIn } from "@/components/auth-social";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    /*
      Checked here and not on the server. The confirmation exists to catch a
      typo in a field nobody can read back, which is a client concern; the
      register endpoint takes one password and its schema is strict, so
      sending a second field would be rejected outright.
    */
    if (password !== String(formData.get("confirmPassword") ?? "")) {
      setError("Those two passwords do not match.");
      return;
    }

    setPending(true);

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

    /*
      No auto sign-in on purpose. Signing in here would succeed for a new
      address and fail for one that already had an account, which is the same
      existence oracle the server just went to lengths to close. The caller
      goes to sign in instead, behind a notice that reads the same whether the
      account was just created or already existed.
    */
    setPending(false);
    router.push("/login?registered=1");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/*
        The same social option as the sign-in screen, and first: creating an
        account with Google is one tap, versus a five-field form. OAuth signs
        up and signs in through the same flow, so nothing here needs a separate
        "sign up" variant.
      */}
      <SocialSignIn googleEnabled={googleEnabled} />

      <form action={onSubmit} className="space-y-5">
      <Sheet className="p-5 space-y-4">
        <Field label="Display name">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="displayName"
              required
              maxLength={60}
              autoComplete="name"
            />
          )}
        </Field>

        <Field label="Username" hint="Lowercase letters, numbers, and underscores.">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="username"
              required
              pattern="[a-z0-9_]{3,30}"
              autoCapitalize="none"
              autoComplete="username"
            />
          )}
        </Field>

        <Field label="Email">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
            />
          )}
        </Field>

        <Field label="Password" hint="At least 12 characters.">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
            />
          )}
        </Field>


        <Field label="Confirm password">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="confirmPassword"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
            />
          )}
        </Field>
      </Sheet>

      {error && <ErrorText>{error}</ErrorText>}

      <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </div>
  );
}

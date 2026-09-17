"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { ErrorText } from "@/components/ui";
import { SocialSignIn } from "@/components/auth-social";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

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
    <div className="space-y-4">
      {/*
        The same social option as the sign-in screen, and first: creating an
        account with Google is one tap, versus a five-field form. OAuth signs
        up and signs in through the same flow, so nothing here needs a separate
        "sign up" variant.
      */}
      <SocialSignIn googleEnabled={googleEnabled} />

      <form action={onSubmit} className="space-y-4">
        {/*
          Name and username share a row once there is width for it, which saves
          the join form a whole field-height on a laptop and keeps it on one
          screen. They stack on a phone, where a single column is right anyway.
        */}
        <div className="grid gap-4 sm:grid-cols-2">
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

          <Field label="Username" hint="Lowercase, numbers, underscores.">
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
        </div>

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

        {/*
          A show/hide toggle instead of a second "confirm" field. The confirm
          box only ever existed to catch a typo in something you cannot read
          back — but being able to read it back is exactly what this does, and
          it does it in one field instead of two. It also keeps the whole form
          on one screen.
        */}
        <Field label="Password" hint="At least 12 characters.">
          {({ id, describedBy }) => (
            <div className="relative">
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="password"
                type={reveal ? "text" : "password"}
                required
                minLength={12}
                autoComplete="new-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-control text-secondary transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                {reveal ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          )}
        </Field>

      {error && <ErrorText>{error}</ErrorText>}

      <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Card, ErrorText } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });

    setPending(false);

    // Deliberately generic: never reveal whether the account exists.
    if (result?.error) return setError("That email and password combination did not work.");

    router.push("/garage");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card className="space-y-4">
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

        <Field label="Password">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          )}
        </Field>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}

      <SubmitButton pending={pending}>Sign in</SubmitButton>

      <p className="text-subhead text-secondary text-center">
        No account?{" "}
        <Link href="/register" className="text-accent font-medium">
          Create one
        </Link>
      </p>
    </form>
  );
}

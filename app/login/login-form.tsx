"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { ErrorText } from "@/components/ui";

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
    <form action={onSubmit} className="space-y-4">
      <Field label="Email">
        <TextInput name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password">
        <TextInput name="password" type="password" required autoComplete="current-password" />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Sign in</SubmitButton>
      <p className="text-sm text-muted text-center">
        No account?{" "}
        <Link href="/register" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

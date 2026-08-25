"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { SIGNIN_ERROR } from "@/lib/auth/credentials";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Card, ErrorText } from "@/components/ui";

export function LoginForm({ canResetPassword }: { canResetPassword: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Held so the second-factor step does not make them retype them.
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function attempt(email: string, password: string, totp?: string) {
    const result = await signIn("credentials", {
      email,
      password,
      ...(totp ? { totp } : {}),
      redirect: false,
    });

    setPending(false);

    if (!result?.error) {
      router.push("/garage");
      router.refresh();
      return;
    }

    /*
      The provider distinguishes "this account needs a code" from "that code
      was wrong", but only ever after the password has already been accepted —
      so neither message tells an attacker anything about an account they
      cannot already open.
    */
    const reason = String(result.code ?? result.error);

    if (reason.includes(SIGNIN_ERROR.mfaRequired)) {
      setPendingCredentials({ email, password });
      setError(null);
      return;
    }

    if (reason.includes(SIGNIN_ERROR.rateLimited)) {
      setError(
        "Too many sign-in attempts. Wait about five minutes and try again — " +
          "your password and your codes are still fine.",
      );
      return;
    }

    if (reason.includes(SIGNIN_ERROR.mfaInvalid)) {
      setError("That code was not correct. Try the next one your app shows.");
      return;
    }

    setPendingCredentials(null);
    setError("That email and password combination did not work.");
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    if (pendingCredentials) {
      await attempt(
        pendingCredentials.email,
        pendingCredentials.password,
        String(formData.get("totp") ?? ""),
      );
      return;
    }

    await attempt(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );
  }

  if (pendingCredentials) {
    return (
      <form action={onSubmit} className="space-y-5">
        <Card className="space-y-4">
          <div>
            <h2 className="text-headline font-semibold">Enter your code</h2>
            <p className="text-subhead text-secondary mt-1">
              Open your authenticator app, or use one of your backup codes.
            </p>
          </div>

          <Field label="Six-digit code">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="totp"
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="123456"
              />
            )}
          </Field>
        </Card>

        {error && <ErrorText>{error}</ErrorText>}
        <SubmitButton pending={pending}>Verify</SubmitButton>

        <button
          type="button"
          onClick={() => {
            setPendingCredentials(null);
            setError(null);
          }}
          className="w-full min-h-11 text-subhead text-secondary"
        >
          Back
        </button>
      </form>
    );
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

      {/*
        Only offered when this deployment can send the email. Otherwise the
        link leads to a page that promises something nothing will deliver.
      */}
      {canResetPassword && (
        <p className="text-subhead text-center">
          <Link href="/forgot-password" className="text-accent font-medium">
            Forgot your password?
          </Link>
        </p>
      )}

      <p className="text-subhead text-secondary text-center">
        No account?{" "}
        <Link href="/register" className="text-accent font-medium">
          Create one
        </Link>
      </p>
    </form>
  );
}

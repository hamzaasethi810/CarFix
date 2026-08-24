"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, ErrorText } from "@/components/ui";
import { Field, SubmitButton, TextInput } from "@/components/form";

type State =
  | { kind: "checking" }
  | { kind: "invalid" }
  | { kind: "form"; needsSecondFactor: boolean }
  | { kind: "done" };

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  // A missing token is knowable at render time, so it is not an effect's job.
  const [state, setState] = useState<State>(
    token ? { kind: "checking" } : { kind: "invalid" },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Checked up front so a dead link says so immediately, rather than after
  // someone has typed a password twice.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/auth/reset?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        setState(
          body?.usable
            ? { kind: "form", needsSecondFactor: Boolean(body.needsSecondFactor) }
            : { kind: "invalid" },
        );
      })
      .catch(() => !cancelled && setState({ kind: "invalid" }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const again = String(formData.get("confirm") ?? "");

    if (password !== again) return setError("Those two passwords do not match.");
    if (password.length < 12)
      return setError("Use at least 12 characters — length matters more than symbols.");

    setPending(true);
    setError(null);

    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        ...(formData.get("totp") ? { totp: String(formData.get("totp")) } : {}),
      }),
    });

    const body = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) return setError(body?.error?.message ?? "That did not work. Try again.");

    // The account has a second factor and we did not send one.
    if (body?.needsSecondFactor) {
      setState({ kind: "form", needsSecondFactor: true });
      setError("This account uses two-factor authentication. Enter a code to finish.");
      return;
    }

    setState({ kind: "done" });
  }

  if (state.kind === "checking") {
    return <Card><p className="text-subhead text-secondary">Checking your link…</p></Card>;
  }

  if (state.kind === "invalid") {
    return (
      <Card className="space-y-3">
        <h2 className="text-headline font-semibold">That link is no longer valid</h2>
        <p className="text-subhead text-secondary">
          Reset links work once and expire after an hour. Ask for a fresh one.
        </p>
        <Link href="/forgot-password" className="text-subhead text-accent font-medium">
          Send a new link
        </Link>
      </Card>
    );
  }

  if (state.kind === "done") {
    return (
      <Card className="space-y-3">
        <h2 className="text-headline font-semibold">Password changed</h2>
        <p className="text-subhead text-secondary">
          You have been signed out everywhere else, so anyone who was in this
          account is now out of it.
        </p>
        <Link href="/login" className="text-subhead text-accent font-medium">
          Sign in
        </Link>
      </Card>
    );
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field label="New password" hint="At least 12 characters.">
          {({ id, describedBy }) => (
            <TextInput id={id} aria-describedby={describedBy} name="password" type="password"
              required autoFocus autoComplete="new-password" minLength={12} />
          )}
        </Field>

        <Field label="Type it again">
          {({ id }) => (
            <TextInput id={id} name="confirm" type="password" required
              autoComplete="new-password" minLength={12} />
          )}
        </Field>

        {/*
          Email on its own must not be enough to take over an account that has
          a second factor, or reaching the mailbox would defeat it entirely.
        */}
        {state.needsSecondFactor && (
          <Field label="Code from your authenticator" hint="Or one of your backup codes.">
            {({ id }) => (
              <TextInput id={id} name="totp" required inputMode="numeric"
                autoComplete="one-time-code" placeholder="123456" />
            )}
          </Field>
        )}
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Change my password</SubmitButton>
    </form>
  );
}

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Card, ErrorText, SectionTitle } from "@/components/ui";

/*
  Changing a password from inside the account.

  Succeeding signs every session out, including this one, because the server
  bumps sessionsValidFrom. That is the point of changing a password, so the
  form says so before you submit rather than dumping you at the login screen
  with no explanation.
*/
export function ChangePassword() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);

    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword !== String(formData.get("confirmPassword") ?? "")) {
      setError("Those two passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(formData.get("currentPassword") ?? ""),
          newPassword,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "That did not work. Please try again.");
        setPending(false);
        return;
      }

      await signOut({ redirectTo: "/login?changed=1" });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <SectionTitle>Password</SectionTitle>
      <form action={onSubmit}>
        <Card className="space-y-4">
          <p className="text-subhead text-secondary">
            Changing this signs you out on every device, including this one.
          </p>

          <Field label="Current password">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            )}
          </Field>

          <Field label="New password" hint="At least 12 characters.">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="newPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            )}
          </Field>

          <Field label="Confirm new password">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
              />
            )}
          </Field>

          {error && <ErrorText>{error}</ErrorText>}

          <SubmitButton pending={pending}>Change password</SubmitButton>
        </Card>
      </form>
    </>
  );
}

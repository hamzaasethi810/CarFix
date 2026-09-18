"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { ErrorText, SectionTitle, Sheet } from "@/components/ui";

/*
  The two names, edited separately.

  Display name and @handle are different things on the wire — one is free text
  screened for slurs and links, the other is unique across everyone and can
  come back "taken" — so they are two forms with two endpoints, not one. Both
  pre-fill the current value, confirm plainly on success, and surface the
  server's own message on failure (the moderation and length rules live there,
  so the message the person needs is the one the server sends).
*/

function Saved() {
  return (
    <p role="status" className="text-subhead font-medium text-accent">
      Saved.
    </p>
  );
}

export function DisplayNameForm({ current }: { current: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: String(formData.get("displayName") ?? "") }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "That did not work. Please try again.");
        setPending(false);
        return;
      }
      setSaved(true);
      setPending(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <SectionTitle>Display name</SectionTitle>
      <form action={onSubmit}>
        <Sheet className="p-5 space-y-4">
          <p className="text-subhead text-secondary">
            The name shown on your profile and beside anything you post.
          </p>
          <Field label="Display name">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="displayName"
                defaultValue={current}
                required
                maxLength={60}
                autoComplete="name"
              />
            )}
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          {saved && <Saved />}
          <SubmitButton pending={pending}>Save display name</SubmitButton>
        </Sheet>
      </form>
    </>
  );
}

export function UsernameForm({ current }: { current: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res = await fetch("/api/profile/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: String(formData.get("username") ?? "") }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "That did not work. Please try again.");
        setPending(false);
        return;
      }
      setSaved(true);
      setPending(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <SectionTitle>Username</SectionTitle>
      <form action={onSubmit}>
        <Sheet className="p-5 space-y-4">
          <p className="text-subhead text-secondary">
            Your public handle — it appears as <span className="tabular">@{current}</span> and
            is the address of your profile page. Changing it changes that link.
          </p>
          <Field label="Username" hint="Lowercase letters, numbers, and underscores.">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                name="username"
                defaultValue={current}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9_]{3,30}"
                autoCapitalize="none"
                autoComplete="off"
              />
            )}
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          {saved && <Saved />}
          <SubmitButton pending={pending}>Save username</SubmitButton>
        </Sheet>
      </form>
    </>
  );
}

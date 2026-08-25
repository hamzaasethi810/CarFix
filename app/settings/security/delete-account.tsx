"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card, ErrorText, SectionTitle } from "@/components/ui";
import { Field, TextInput } from "@/components/form";

/*
  The way out.

  The endpoint for this already existed but nothing on the site reached it, so
  a documented right to delete your account could only be exercised by hand-
  crafting an HTTP request. A right nobody can reach is not a right.

  Typing the word is deliberate. This withdraws every report the account has
  filed, and a misclick that quiet would be unrecoverable for the person and
  invisible to everyone else.
*/
export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);

    const res = await fetch("/api/profile", { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPending(false);
      return setError(body?.error?.message ?? "That could not be completed.");
    }

    // Sign out afterwards, or the browser keeps a session for an account that
    // no longer resolves.
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <SectionTitle hint="This cannot be undone from here.">Delete your account</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-secondary text-pretty">
          Removes your profile, your cars, and your saved searches, and withdraws
          the reports you have filed so nobody can see them. Receipts were already
          destroyed when they were reviewed, so there are none to remove.
        </p>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center min-h-11 px-4 rounded-full text-destructive text-subhead font-semibold hover:bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)]"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <Field
              label="Type DELETE to confirm"
              hint="Deliberately awkward — this withdraws everything you have posted."
            >
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                  placeholder="DELETE"
                />
              )}
            </Field>

            {error && <ErrorText>{error}</ErrorText>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={pending || confirm !== "DELETE"}
                className="inline-flex items-center min-h-11 px-5 rounded-full bg-destructive text-white text-subhead font-semibold disabled:opacity-40"
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                  setError(null);
                }}
                disabled={pending}
                className="inline-flex items-center min-h-11 px-5 rounded-full bg-fill text-accent text-subhead font-semibold"
              >
                Keep my account
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

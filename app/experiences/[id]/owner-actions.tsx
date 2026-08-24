"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, buttonStyles } from "@/components/ui";
import { Field, TextArea, TextInput } from "@/components/form";

/*
  The author's own controls. Deleting is always available — it is their account
  of their own money. Editing closes after ten minutes, which the server
  enforces; this only mirrors that so the button disappears when it stops
  working.
*/
export function OwnerActions({
  experienceId,
  editableForMs,
  initial,
}: {
  experienceId: string;
  editableForMs: number;
  initial: { totalPrice: number; partsCost: number | null; laborCost: number | null; reviewText: string | null };
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(editableForMs);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  // Count the window down so the control vanishes exactly when it expires.
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => {
      setRemaining((ms) => Math.max(0, ms - 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const canEdit = remaining > 0;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  async function save(formData: FormData) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);

    const numOrNull = (k: string) => {
      const v = formData.get(k);
      return v === null || String(v).trim() === "" ? null : Number(v);
    };

    const res = await fetch(`/api/experiences/${experienceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalPrice: Number(formData.get("totalPrice")),
        partsCost: numOrNull("partsCost"),
        laborCost: numOrNull("laborCost"),
        reviewText: (formData.get("reviewText") as string) || null,
      }),
    });

    setPending(false);
    busy.current = false;

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "That change could not be saved.");
    }

    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);

    const res = await fetch(`/api/experiences/${experienceId}`, { method: "DELETE" });
    setPending(false);
    busy.current = false;

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "That report could not be deleted.");
    }

    router.push("/garage");
    router.refresh();
  }

  if (editing) {
    return (
      <Card className="mt-4">
        <h2 className="text-headline font-semibold mb-1">Edit your report</h2>
        <p className="text-footnote text-secondary mb-4">
          {minutes}:{String(seconds).padStart(2, "0")} left to make changes.
        </p>

        <form action={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Total price">
              {({ id }) => (
                <TextInput id={id} name="totalPrice" type="number" min={0} step="0.01" required
                  defaultValue={initial.totalPrice} inputMode="decimal" />
              )}
            </Field>
            <Field label="Parts cost">
              {({ id }) => (
                <TextInput id={id} name="partsCost" type="number" min={0} step="0.01"
                  defaultValue={initial.partsCost ?? ""} placeholder="Optional" inputMode="decimal" />
              )}
            </Field>
            <Field label="Labor cost">
              {({ id }) => (
                <TextInput id={id} name="laborCost" type="number" min={0} step="0.01"
                  defaultValue={initial.laborCost ?? ""} placeholder="Optional" inputMode="decimal" />
              )}
            </Field>
          </div>

          <Field label="Review">
            {({ id }) => (
              <TextArea id={id} name="reviewText" rows={4} maxLength={5000}
                defaultValue={initial.reviewText ?? ""} />
            )}
          </Field>

          {error && <ErrorText>{error}</ErrorText>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={buttonStyles.primary}>
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={pending}
              className={buttonStyles.secondary}>
              Cancel
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      {confirmingDelete ? (
        <div role="alertdialog" aria-label="Confirm deletion" className="space-y-3">
          <p className="text-subhead">
            Delete this report?{" "}
            <span className="text-secondary">
              It will stop counting toward this shop&rsquo;s pricing. This cannot be undone.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={remove} disabled={pending} className={buttonStyles.destructive}>
              {pending ? "Deleting…" : "Yes, delete it"}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} disabled={pending}
              className={buttonStyles.secondary}>
              Keep it
            </button>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <button type="button" onClick={() => setEditing(true)} className={buttonStyles.secondary}>
                Edit
              </button>
              <span className="text-footnote text-secondary">
                {minutes}:{String(seconds).padStart(2, "0")} left to edit
              </span>
            </>
          ) : (
            <span className="text-footnote text-secondary">
              The edit window has closed. You can still delete this report.
            </span>
          )}

          <span className="flex-1" />

          <button type="button" onClick={() => setConfirmingDelete(true)} className={buttonStyles.plain}>
            Delete
          </button>
        </div>
      )}
    </Card>
  );
}

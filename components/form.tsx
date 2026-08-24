"use client";

import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { buttonStyles } from "@/components/ui";

/*
  Controls are 44px tall to meet the platform touch-target minimum, and keep
  their border on focus — the focus ring itself comes from :focus-visible in
  globals.css so it is identical everywhere.
*/
const FIELD =
  "w-full min-h-11 rounded-control bg-elevated text-label text-body px-3.5 py-2.5 " +
  "border border-separator placeholder:text-tertiary-label " +
  "transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--label)_25%,transparent)]";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; describedBy?: string }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-subhead font-medium text-label">
        {label}
      </label>
      {children({ id, describedBy })}
      {hint && (
        <p id={hintId} className="text-footnote text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-footnote text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={FIELD} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD} min-h-24 resize-y`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD} appearance-none pr-9 bg-no-repeat`} />;
}

/*
  Checkbox rows get a 44px target on the whole row, not just the 16px box, so
  the label is as tappable as the control.
*/
export function CheckboxRow({
  name,
  label,
  value,
  defaultChecked,
}: {
  name: string;
  label: string;
  value?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 min-h-11 text-body cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        /* 28px is the platform minimum control size; the row around it is 44px. */
        className="size-7 rounded accent-[var(--accent-fill)]"
      />
      {label}
    </label>
  );
}

export function SubmitButton({
  children,
  pending,
  variant = "primary",
  full = true,
}: {
  children: React.ReactNode;
  pending?: boolean;
  variant?: "primary" | "destructive";
  full?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`${buttonStyles[variant]} ${full ? "w-full" : ""}`}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="mr-2 size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
        />
      )}
      {pending ? "Working…" : children}
    </button>
  );
}

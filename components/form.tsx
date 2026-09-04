"use client";

import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { buttonStyles } from "@/components/ui";

/*
  Fields are ruled, not boxed.

  A form on a document has a rule under each entry rather than a rounded
  container around it. The 44px minimum height and the shared :focus-visible
  ring from globals.css are unchanged.
*/
const FIELD =
  "w-full min-h-11 bg-elevated text-label text-body px-3 py-2.5 " +
  "border-0 border-b border-separator rounded-none placeholder:text-tertiary-label " +
  "transition-[border-color] duration-150 " +
  "hover:border-[color-mix(in_srgb,var(--label)_35%,transparent)] " +
  "focus:border-accent";

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

/*
  className is merged, not replaced.

  It used to be overwritten outright, so any caller passing one had it
  silently dropped — a reveal toggle needing right padding for its button
  looked correct in the source and wrong on screen. React 19 takes ref as an
  ordinary prop, so it forwards without a wrapper.
*/
export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input {...props} className={`${FIELD} ${className}`} />;
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
        className="size-7 rounded-none accent-[var(--accent-fill)]"
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

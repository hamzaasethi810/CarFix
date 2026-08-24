import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-4 ${className}`}>{children}</div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="text-center py-10">
      <p className="font-medium">{title}</p>
      {hint && <p className="text-muted text-sm mt-1">{hint}</p>}
    </Card>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-accent">{children}</p>;
}

export function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5`} className="text-amber-500">
      {"★".repeat(value)}
      <span className="text-border">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5">
      ● Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs rounded-full bg-zinc-500/10 text-muted px-2 py-0.5">
      ○ Unverified
    </span>
  );
}

export const money = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

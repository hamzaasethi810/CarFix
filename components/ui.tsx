import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-card bg-elevated shadow-card p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    /*
      title1 rather than large-title. Every page opening at the largest size in
      the scale means nothing on the page is ever bigger than anything else,
      which is the opposite of hierarchy — the size stops meaning "important"
      and starts meaning "a page happened".
    */
    <div className="mb-6 sm:mb-8">
      <h1 className="text-title1 font-bold tracking-tight text-balance">{title}</h1>
      {subtitle && (
        <p className="text-secondary text-callout mt-1.5 max-w-prose text-pretty">{subtitle}</p>
      )}
    </div>
  );
}

/*
  A single figure with its label.

  Sentence case, not upper case. Shouting a label does not make it more
  important — weight and size already carry the hierarchy, and setting every
  label in capitals flattens it while making the words harder to scan.

  There were two copies of this, one per page, drifting apart in size and
  colour. One definition keeps the figures looking like they belong to the
  same product.
*/
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-footnote text-secondary">{label}</p>
      <p className="text-title2 font-semibold mt-0.5 tabular-nums tracking-tight">{value}</p>
      {hint && <p className="text-footnote text-secondary mt-1">{hint}</p>}
    </Card>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mt-10 mb-3">
      <h2 className="text-title3 font-semibold">{children}</h2>
      {hint && <p className="text-secondary text-subhead mt-0.5">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="text-center py-12">
      <p className="text-headline font-semibold">{title}</p>
      {hint && <p className="text-secondary text-subhead mt-1.5 max-w-sm mx-auto">{hint}</p>}
    </Card>
  );
}

/*
  Errors are announced to screen readers, not only shown. role="alert" makes the
  message reach assistive tech the moment it appears.
*/
export function ErrorText({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} role="alert" className="text-destructive text-subhead flex items-start gap-1.5">
      <span aria-hidden="true" className="mt-px">
        ⚠
      </span>
      <span>{children}</span>
    </p>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-subhead">
      <span aria-hidden="true" className="text-warning tracking-tight">
        {"★".repeat(value)}
        <span className="text-tertiary-label">{"★".repeat(5 - value)}</span>
      </span>
      {/* The rating is stated in text too, so it never depends on colour alone. */}
      <span className="sr-only">{value} out of 5</span>
    </span>
  );
}

/*
  Verification state is carried by an icon shape AND a word AND a colour, so it
  survives colour blindness and greyscale.
*/
export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-footnote font-medium rounded-full px-2 py-1 text-success bg-[color-mix(in_srgb,var(--success)_12%,transparent)]">
      <span aria-hidden="true">✓</span> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-footnote font-medium rounded-full px-2 py-1 text-secondary bg-fill">
      <span aria-hidden="true">○</span> Unverified
    </span>
  );
}

/*
  One place for number formatting so every figure on the site reads the same
  way — thousands separators throughout, and an em dash rather than a bare
  "0" or "null" when there is genuinely no value.
*/
export const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

/** Whole numbers: mileage, counts, distances. */
/*
  Dates, formatted the same on the server and in the browser.

  `toLocaleDateString()` with no arguments uses whatever locale and time zone
  the runtime happens to have. That is one thing in Node and another in a
  visitor's browser, so the server-rendered HTML and the first client render
  can disagree — which is exactly the "some attributes of the server rendered
  HTML didn't match" hydration error, and React does not patch it up.

  The zone is pinned as well as the locale. These are calendar dates: a service
  date stored at midnight UTC renders as the day before for anyone west of
  Greenwich if it is formatted in local time.
*/
export const formatDate = (value: string | Date | null | undefined) => {
  if (value === null || value === undefined) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const num = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-US");

/** Mileage always carries its unit. */
export const miles = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n.toLocaleString("en-US")} mi`;

/** Distances keep one decimal but still group thousands. */
export const distance = (n: number | null | undefined) =>
  n === null || n === undefined
    ? null
    : `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })} mi`;

/*
  Every control is at least 44px tall — the platform default touch target —
  regardless of variant.
*/
const BUTTON_BASE =
  "inline-flex items-center justify-center min-h-11 px-4 rounded-control text-headline font-semibold transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

/*
  The surface a floating menu sits on.

  Deliberately opaque. Menus open over the map and over the glass panels
  floating on it, and a translucent menu on top of those stops being a surface
  at all — the shop list's distance labels and the map's roads show straight
  through it. Glass belongs to the panels anchored to the page; anything that
  opens above them needs something solid to sit on.
*/
export const popoverSurface =
  "bg-elevated shadow-raised border border-separator";

export const buttonStyles = {
  primary: `${BUTTON_BASE} bg-accent-fill text-on-accent hover:bg-accent-hover`,
  secondary: `${BUTTON_BASE} bg-fill text-accent hover:opacity-80`,
  destructive: `${BUTTON_BASE} bg-destructive-fill text-on-destructive hover:opacity-90`,
  plain: `${BUTTON_BASE} text-accent hover:bg-fill`,
} as const;

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-md bg-fill ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/5 to-transparent motion-safe:animate-[shimmer_1.6s_infinite] dark:via-white/5" />
    </div>
  );
}

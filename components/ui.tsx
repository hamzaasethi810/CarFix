import type { ReactNode } from "react";
import Link from "next/link";
import { Ban, Check, Star } from "lucide-react";

/*
  One definition of the column frame.

  HeadRow, OperationLine and BlankForm must describe the same tracks or the
  heads stop sitting over their figures. The tracks themselves live in
  globals.css under .op-grid, because the frame restacks below 640px and an
  inline grid-template cannot carry a media query. All this does is hand the
  stylesheet the column count.
*/
const figureCount = (n: number) =>
  ({ ["--figure-count" as string]: String(n) }) as React.CSSProperties;

/*
  One head row, used by both Columns and BlankForm.

  The shared gridTemplate already keeps their tracks aligned; this keeps their
  LABELS aligned too. Two copies of a heading row is how a blank form ends up
  promising different columns than the filled one.
*/
/*
  The first column is named by its caller.

  It was hardcoded to "Operation", which is right on a repair order and wrong
  everywhere else it got reused: the garage's first column is a car, the
  profile's is a car, a docket's is a claim. A table whose heading describes a
  different table is worse than a table with no heading at all.
*/
function HeadRow({ heads, first = "Item" }: { heads: string[]; first?: string }) {
  return (
    <div
      role="row"
      className="op-grid border-b border-separator pb-2 text-caption text-tertiary-label"
      style={figureCount(heads.length)}
    >
      <span role="columnheader" className="op-label">
        {first}
      </span>
      {heads.map((h) => (
        <span key={h} role="columnheader" className="text-right">
          {h}
        </span>
      ))}
    </div>
  );
}

/*
  A ruled region, not a floating tile.

  Card is gone rather than restyled. A document separates its regions with a
  hairline and a change of stock, and thirty screens of soft drop-shadowed
  rectangles was the clearest signal that this interface had been styled
  rather than designed. Elevation now belongs only to things that genuinely
  float above the page, which is popoverSurface and nothing else.
*/
export function Sheet({
  children,
  className = "",
  as: El = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <El className={`border-t border-separator bg-elevated ${className}`}>
      {children}
    </El>
  );
}

/*
  The document header block.

  The code is set in mono and sits beside the title rather than under it,
  because on a real repair order the identifying number and the description
  share a line — the number is how the record is found, not a footnote to it.
*/
export function SheetHeader({
  title,
  code,
  meta,
  actions,
  as: Heading = "h1",
}: {
  title: string;
  code?: string;
  meta?: string;
  actions?: ReactNode;
  /*
    The heading level, because this is not always the page title.

    It is an h1 on the twenty-odd routes where it opens the page, and an h2 on
    the landing, where the page's own claim owns the h1 and this header names
    the example record beneath it. Two h1 elements on one page is a heading
    order break, and hand-writing the header on the landing to avoid it would
    reintroduce the duplication this component exists to prevent.
  */
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-separator pb-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Heading className="text-title1 font-semibold tracking-tight text-balance">{title}</Heading>
          {code && <Code>{code}</Code>}
        </div>
        {meta && <p className="text-subhead text-secondary mt-1.5 text-pretty">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** An operation code, VIN, or chassis code. Always mono, never wrapped. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <span className="tabular text-footnote text-tertiary-label uppercase whitespace-nowrap">
      {children}
    </span>
  );
}

/*
  The column frame.

  The heads are rendered once, ruled, and every OperationLine inside aligns to
  them. Figures are right-aligned in fixed-width columns so the decimal points
  stack; that stacking is most of what makes a column of money read as printed
  rather than typed.
*/
export function Columns({
  heads,
  children,
  className = "",
  label,
  first,
}: {
  heads: string[];
  children: ReactNode;
  className?: string;
  label?: string;
  /** Names the first column. Defaults to "Item"; say what it actually holds. */
  first?: string;
}) {
  return (
    <div role="table" aria-label={label} className={className}>
      <HeadRow heads={heads} first={first} />
      {children}
    </div>
  );
}

/*
  One ruled row.

  figures may contain null for a column that does not apply to this line; an
  em dash is printed instead, because a blank cell in a ruled column reads as
  a rendering fault rather than as "no charge".
*/
export function OperationLine({
  label,
  code,
  note,
  figures,
  href,
}: {
  label: string;
  code?: string;
  note?: string;
  figures: (string | null)[];
  href?: string;
}) {
  return (
    <div
      role="row"
      className={`op-line op-grid relative items-baseline border-b border-separator py-3.5 min-h-11 ${
        href
          ? "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-grouped transition-colors duration-150"
          : ""
      }`}
      style={figureCount(figures.length)}
    >
      <div role="cell" className="op-label min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          {href ? (
            /*
              A stretched link (R22): the anchor stays a real link inside its
              cell — table > row > cell stays intact — and its ::after covers
              the row (which is `relative`) so the whole row is still
              clickable. Wrapping the role="row" div in <Link> instead gave
              the row an implicit role="link" ancestor, which is the nesting
              an assistive-tech table walker cannot recover from.
            */
            <Link href={href} className="text-body after:absolute after:inset-0">
              {label}
            </Link>
          ) : (
            <span className="text-body">{label}</span>
          )}
          {code && <Code>{code}</Code>}
        </div>
        {note && <p className="text-footnote text-secondary mt-0.5">{note}</p>}
      </div>
      {figures.map((f, i) => (
        <span key={i} role="cell" className="tabular text-body text-right">
          {f ?? "—"}
        </span>
      ))}
    </div>
  );
}

/*
  A verification mark, not a rubber stamp.

  This was a rotated, double-bordered box in a reserved red — a literal stamp
  pressed onto the page. It read as a costume: document-cosplay decorating a
  fact rather than stating it, and it shouted louder than anything around it
  for a piece of information that is meant to be reassuring rather than loud.

  What a person needs here is a tick, a word, and a colour. State still travels
  three ways — icon shape, text, and colour — so it survives greyscale and
  colour blindness, which is the only part of the old mark worth keeping.
*/
export function Stamp({
  children,
  state = "verified",
}: {
  children: ReactNode;
  state?: "verified" | "void";
}) {
  const verified = state === "verified";
  const Icon = verified ? Check : Ban;
  return (
    <span
      data-state={state}
      className={`inline-flex items-center gap-1.5 text-footnote font-medium ${
        verified ? "text-accent" : "text-tertiary-label"
      }`}
    >
      <Icon aria-hidden="true" strokeWidth={2.25} className="size-4 shrink-0" />
      {children}
    </span>
  );
}

/*
  A token attached to the record, not floating near it.

  The distinction matters: a badge that sits in the flow beside a title reads
  as a label the interface applied, and a tag notched into the record's edge
  reads as something fixed to the document itself.
*/
export function Tag({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "neutral" | "gold";
}) {
  /*
    Gold is the subscription tier's own name, not decoration. The tier is
    called Gold in the product and in the billing copy, so the mark that
    denotes it is gold; a blue tag made the badge stop matching the word
    everywhere else on the site.
  */
  const ink =
    tone === "gold"
      ? "text-gold border-gold"
      : tone === "accent"
        ? "text-accent border-accent"
        : "text-secondary border-separator";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-l-2 bg-grouped px-2 py-1 text-footnote font-medium ${ink}`}
    >
      {children}
    </span>
  );
}

/*
  A value read against a printed scale.

  The marker is derived from the values, never placed by hand — the previous
  implementation hard-coded 38% for a value sitting at 23.9% of its range, a
  fourteen-point error on the only chart on a page arguing that a number on
  its own is a rumour.

  Only the rule is aria-hidden. The two amounts are the most decision-relevant
  numbers present and must reach a screen reader.
*/
export function RangeScale({
  low,
  high,
  value,
  caption,
}: {
  low: number;
  high: number;
  value: number;
  caption?: string;
}) {
  const span = high - low;
  const percent = span <= 0 ? 0 : Math.min(100, Math.max(0, ((value - low) / span) * 100));

  return (
    <div>
      <div className="relative h-px bg-separator" aria-hidden="true">
        <span className="absolute left-0 -top-1.5 h-3 w-px bg-separator" />
        <span
          className="absolute -top-2 h-4 w-0.5 bg-accent"
          style={{ left: `${percent.toFixed(1)}%` }}
        />
        <span className="absolute right-0 -top-1.5 h-3 w-px bg-separator" />
      </div>
      <p className="mt-2 flex justify-between text-caption text-tertiary-label tabular">
        <span>{money(low)}</span>
        <span>{money(high)}</span>
      </p>
      {caption && <p className="mt-1 text-caption text-tertiary-label">{caption}</p>}
    </div>
  );
}

/*
  An empty form is a real object, not an apology.

  Shops are listed and prices are not, so this is a primary surface rather
  than a fallback. It keeps its column heads: a blank ruled form tells the
  visitor exactly what would go here, which an "Add your first item" panel
  does not.
*/
/*
  An empty state that says something, rather than drawing empty rows.

  This used to print three blank ruled lines above the message — the shape of
  the missing thing. It looked like a rendering fault: a table that had failed
  to load its data rather than one that has none, and on a product where most
  tables are empty today it was the first thing a new person saw. Ruled nothing
  is still nothing.

  What is left is the message and the way out of it.
*/
export function BlankForm({
  title,
  hint,
  action,
}: {
  /** Accepted and ignored, so callers that pass table heads still compile. */
  heads?: string[];
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-t border-separator">
      <div className="py-12 text-center">
        <p className="text-headline font-semibold">{title}</p>
        {hint && <p className="text-subhead text-secondary mt-1.5 max-w-sm mx-auto text-pretty">{hint}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

/** A single figure with its label. Mono, tabular, no container. */
export function Figure({
  value,
  label,
  hint,
}: {
  /* A node, not a string: the landing's figures animate through CountUp. */
  value: ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="tabular text-title1 font-semibold leading-none">{value}</p>
      <p className="text-footnote text-secondary mt-2">{label}</p>
      {hint && <p className="text-footnote text-tertiary-label mt-0.5">{hint}</p>}
    </div>
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

/*
  The read-only counterpart to components/star-rating.tsx.

  Both draw the same icon at the same weight in the same gold, so a rating
  looks like one thing whether you are giving it or reading it. It used to be
  the "★" character set in the body face, which rendered at whatever weight and
  baseline that font happened to give it and never matched the input control.
*/
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          strokeWidth={1.5}
          style={{ width: size, height: size }}
          className={
            n <= value
              ? "fill-[var(--gold-fill)] text-[var(--gold-fill)]"
              : "fill-none text-separator"
          }
        />
      ))}
      {/* Stated in text too, so the rating never depends on colour alone. */}
      <span className="sr-only">{value} out of 5</span>
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
  "inline-flex items-center justify-center min-h-11 px-4 rounded-control text-headline " +
  "transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

/*
  Pressed things go in.

  140ms because feedback under ~160ms reads as instant and anything slower
  reads as lag. transform and opacity only, so it never touches layout.
*/
/*
  transition-transform, not transition-[transform].

  Tailwind v4 compiles scale-*, translate-* and rotate-* to the standalone
  `scale`, `translate` and `rotate` properties rather than to `transform`. The
  arbitrary form names exactly one property, `transform`, which none of them
  write to — so the press below was jumping straight to its pressed state and
  straight back, with the duration and easing here applying to nothing. The
  built-in utility expands to `transform, translate, scale, rotate` and covers
  all four. tests/motion.test.ts pins the pairing.
*/
const PRESS =
  "transition-transform duration-[140ms] ease-[var(--ease-out)] " +
  "active:translate-y-px active:scale-[0.98] " +
  "motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100";

export const buttonStyles = {
  primary: `${BUTTON_BASE} ${PRESS} bg-accent-fill text-on-accent font-semibold hover:bg-accent-hover`,
  secondary: `${BUTTON_BASE} ${PRESS} bg-elevated text-label border border-separator hover:bg-grouped`,
  /*
    A secondary button that speaks in the accent.

    Its own variant rather than `secondary` plus a text-accent class: both are
    text-colour utilities, so the winner is decided by their order in the
    generated stylesheet, not by the order they appear in a className. The
    override silently lost.
  */
  secondaryAccent: `${BUTTON_BASE} ${PRESS} bg-elevated text-accent font-medium border border-separator hover:bg-grouped`,
  /*
    A bordered button that speaks in the destructive red — for the trigger of
    a destructive action, where a solid red slab would be too loud for a
    control that only opens a confirmation. Its own variant for the same
    reason secondaryAccent is: text-colour utilities would otherwise fight the
    text-label in `secondary` on stylesheet order, not className order.
  */
  secondaryDestructive: `${BUTTON_BASE} ${PRESS} bg-elevated text-destructive font-medium border border-separator hover:bg-grouped`,
  destructive: `${BUTTON_BASE} ${PRESS} bg-destructive-fill text-on-destructive font-semibold hover:brightness-110`,
  // Text button: no material — a slab behind a link would misread as a control.
  plain: `${BUTTON_BASE} ${PRESS} text-accent hover:bg-fill`,
} as const;

/*
  The surface a floating menu sits on.

  Deliberately opaque, and now the only place in the design system that uses
  a shadow. Menus open over the map, and a translucent menu over cartography
  stops being a surface at all. tests/popover-legibility.test.ts pins this.
*/
export const popoverSurface = "bg-elevated shadow-raised border border-separator";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-md bg-fill ${className}`}
    >
      {/*
        The page has one appearance — light stock, never toggled by a `.dark`
        class or media query — so there is no separate dark-mode sweep to keep
        an alternate variant for. The sweep runs at white/60 rather than
        white/10: over this light ground a faint highlight vanishes into the
        fill instead of reading as a sweep across it.
      */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-[shimmer_1.6s_infinite]" />
    </div>
  );
}

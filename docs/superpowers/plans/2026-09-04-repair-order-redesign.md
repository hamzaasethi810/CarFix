# Repair Order Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gaari's entire visual world across all 26 routes with "The Repair Order" — a ruled-document system where every surface is a form whose lines reconcile to a total.

**Architecture:** A token layer (`app/globals.css`) and a component vocabulary (`components/ui.tsx`) land first and everything else consumes them. `Card` is deleted rather than restyled so the old floating-tile shape cannot survive anywhere. Routes convert in dependency order, grouped by treatment family. The map stack (~2,300 lines) is its own phase at the end. Design invariants are enforced by source-scanning vitest tests in the style of the existing `tests/no-nested-forms.test.ts`, so the rewrite is genuinely test-driven rather than eyeballed.

**Tech Stack:** Next.js 16.3.2 App Router, React 19.2.8, Tailwind v4, TypeScript, vitest, `next/font/google` (build-time self-hosted). No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-04-repair-order-redesign-design.md`

**Direction contract:** `.impeccable/surfaces/app-page-tsx.md` (seed `102e37bb`). Product truth: `PRODUCT.md`.

## Global Constraints

Every task's requirements implicitly include this section.

- **CSP is untouchable.** `next.config.ts` sets `script-src 'self' 'unsafe-inline'`, `font-src 'self' data:`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self' https://api.maptiler.com https://tiles.openfreemap.org`. No third-party origin for fonts, scripts, styles or images. Fonts load only via `next/font/google`, which self-hosts at build.
- **No new runtime dependencies.** Two font families at build time is the entire addition. No animation library, no component framework, no icon-library change. `lucide-react` stays.
- **Routes, slugs, nav labels, form field `name` attributes and section IDs do not change.** SEO, analytics and autofill depend on them.
- **Accessibility floors:** WCAG AA (4.5:1 body, 3:1 large text) enforced by `tests/contrast.test.ts`; 44px minimum on every interactive control; `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more` all honoured; state never carried by colour alone.
- **Ink values, verbatim:** `--bg: #FBFAF8`, `--bg-elevated: #FFFFFF`, `--bg-grouped: #F1EFEA`, `--bg-tertiary: #E6E3DC`, `--label: #101B2E`, `--label-secondary: rgba(16,27,46,0.72)`, `--label-tertiary: rgba(16,27,46,0.58)`, `--separator: rgba(16,27,46,0.18)`, `--accent`/`--accent-fill`: `#1B4FA6`, `--accent-hover: #16407F`, `--on-accent: #FFFFFF`, `--success: #1B4FA6`, `--destructive`/`--destructive-fill`: `#A32B18`, `--on-destructive: #FFFFFF`, `--stamp: #C4331D`, `--warning: #8A5A00`.
- **`--stamp` is reserved.** It may appear only on the `Stamp` component. Never a button, never a border, never decoration.
- **Every grey is the ink at opacity.** No separate grey ramp is introduced.
- **Radius:** `--radius-control: 3px` on controls only. Ruled regions are square. No `--radius-card`, no `--radius-glass`.
- **Motion:** never animate a layout property (`width`, `height`, `top`, `left`, `margin`, `padding`), and never use `transition-all`. Prefer `transform` and `opacity`; colour and `background-color` transitions are permitted for hover and state feedback. `ease-in` is never used. Nothing enters from `scale(0)`. Interactive UI stays under 320ms. Nothing keyboard-initiated or high-frequency animates at all. (Ruling R18: the original wording said only transform and opacity, which was stricter than `tests/motion.test.ts` and than the intent.)
- **Copy is preserved verbatim** unless a specific string is factually broken. No speculative rewrite.
- **After converting any file, delete its line from every array in `tests/design-pending.ts`.** The sweeps in `tests/design-system.test.ts` only guard files that are OFF the worklist, so a conversion that leaves its entry in place has not actually been verified. The worklist was derived by grepping the real tree and is the authoritative list of what still needs converting — it includes client sub-components the per-route tables below do not name.
- **Never write a literal `*/` inside a block comment.** The sequence closes the comment early and is a real parse error. It bites on glob patterns (`**/`) and on lists of Tailwind namespaces (`--color-*/--text-*`). Write those as prose instead. This cost a task once already.
- **Run `npm test` after every task.** The full suite must stay green; several existing tests (`contrast`, `popover-legibility`, `no-nested-forms`) guard things this rewrite touches.

---

## File Structure

**Created:**
- `components/reconciliation.tsx` — the signature interaction, client component, used by both the landing and the filing form.
- `components/plate.tsx` — photography bound into the document.
- `tests/design-system.test.ts` — source invariants: no `Card`, no glass, no retired tokens, stamp reserved.
- `tests/motion.test.ts` — source invariants for the motion grammar.

**Rewritten:**
- `app/globals.css` — token layer, text scale, motion tokens, accessibility media queries.
- `components/ui.tsx` — component vocabulary. `Card`/`Stat`/`PageTitle`/`EmptyState`/`VerifiedBadge` deleted, replaced.
- `app/layout.tsx` — fonts, chrome, footer.
- `components/site-header.tsx` — document header band.
- `app/page.tsx` — the landing, per the FIRST VIEWPORT block.

**Modified:** the remaining 25 route files, `components/form.tsx`, `components/experience-card.tsx`, `components/job-card.tsx`, `components/landing/reveal.tsx`, `components/landing/count-up.tsx`, and the map stack.

**Deleted:** `components/landing/car.tsx` (an illustrated car is decoration in this world), `GoldCar` from `app/shops/[id]/subscription-panel.tsx`.

---

## Phase 0 — Foundation

### Task 1: Ink layer and contrast proof

**Files:**
- Modify: `app/globals.css` (`:root` block, `@theme inline` block, `@media (prefers-contrast: more)`, `@media (prefers-reduced-transparency: reduce)`)
- Modify: `tests/contrast.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every CSS custom property in Global Constraints, plus Tailwind utilities `bg-bg`, `bg-elevated`, `bg-grouped`, `bg-tertiary`, `text-label`, `text-secondary`, `text-tertiary-label`, `border-separator`, `text-accent`, `bg-accent-fill`, `text-on-accent`, `text-destructive`, `bg-destructive-fill`, `text-stamp`, `rounded-control`, `shadow-raised`.

- [ ] **Step 1: Write the failing contrast cases**

Append to the `describe("the palette is readable")` block in `tests/contrast.test.ts`:

```ts
  it("the stamp clears AA on both stock tones", () => {
    expect(contrastRatio(t["stamp"], t["bg"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t["stamp"], t["bg-elevated"])).toBeGreaterThanOrEqual(4.5);
  });

  it("body text clears AA on the second-copy tone", () => {
    expect(contrastRatio(t["label"], t["bg-grouped"])).toBeGreaterThanOrEqual(4.5);
  });

  it("the accent clears AA as text, not just as a fill", () => {
    expect(contrastRatio(t["accent"], t["bg"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t["accent"], t["bg-elevated"])).toBeGreaterThanOrEqual(4.5);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/contrast.test.ts`
Expected: FAIL. `t["stamp"]` is currently `#B4432F` on `#F5F5F3` and `t["bg-grouped"]` is `#EBEBE8`; the accent case fails because `--accent` is the retired forest green.

- [ ] **Step 3: Replace the `:root` block**

Replace the entire `:root { … }` block in `app/globals.css` with:

```css
:root {
  color-scheme: light;

  /*
    Four inks and a stock.

    This is a repair order, so the palette is the palette of a multi-part
    form: white top copy, blue-black impact ink, process blue for the ruling
    and the structure, and one stamp red that is only ever a stamp.

    Every grey here is the ink at opacity. There is deliberately no separate
    grey ramp: a second neutral family is what turns a printed form back into
    a generic interface, and it is the first thing to reappear if anyone adds
    "just one" slate to a component.

    Every value is checked by tests/contrast.test.ts against
    lib/design/contrast.ts. Body ink measures 16.52:1 on stock.
  */
  --bg: #FBFAF8;            /* form stock */
  --bg-elevated: #FFFFFF;   /* top copy */
  --bg-grouped: #F1EFEA;    /* second copy */
  --bg-tertiary: #E6E3DC;   /* third copy */
  --fill-quaternary: rgba(16, 27, 46, 0.06);

  --label: #101B2E;
  --label-secondary: rgba(16, 27, 46, 0.72);
  --label-tertiary: rgba(16, 27, 46, 0.58);
  --separator: rgba(16, 27, 46, 0.18);

  --accent: #1B4FA6;
  --accent-fill: #1B4FA6;
  --accent-hover: #16407F;
  --on-accent: #FFFFFF;

  --destructive: #A32B18;
  --destructive-fill: #A32B18;
  --on-destructive: #FFFFFF;

  /* Confirmation is structural, so it is the same ink as the accent. */
  --success: #1B4FA6;
  --warning: #8A5A00;

  /*
    Reserved.

    The stamp is the only place this red appears. It is not a button colour,
    not a border, not an error. tests/design-system.test.ts holds it to that,
    because a reserved accent that leaks is just a fourth brand colour.
  */
  --stamp: #C4331D;

  --radius-control: 3px;

  /*
    One shadow, for things that genuinely float.

    Nothing in the document flow is raised — separation there is a hairline
    and a change of stock. A popover over a map is a different matter: it has
    to detach from cartography, and a rule alone will not do it.
  */
  --shadow-raised:
    0 1px 2px rgba(16, 27, 46, 0.10),
    0 18px 40px -18px rgba(16, 27, 46, 0.26),
    0 0 0 0.5px rgba(16, 27, 46, 0.10);

  /* Emil's curves. The CSS built-ins are too weak to read as intentional. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

- [ ] **Step 4: Rewrite the two dead accessibility blocks**

The current `prefers-contrast: more` and `prefers-reduced-transparency` blocks describe a dark forest palette that no longer exists. Replace both with:

```css
/* Increase Contrast: deepen the ink, harden the rules, remove ink opacity. */
@media (prefers-contrast: more) {
  :root {
    --label: #000914;
    --label-secondary: rgba(0, 9, 20, 0.92);
    --label-tertiary: rgba(0, 9, 20, 0.82);
    --separator: rgba(0, 9, 20, 0.44);
    --accent: #123C82;
    --accent-fill: #123C82;
    --destructive: #7E1C0C;
    --destructive-fill: #7E1C0C;
    --stamp: #9E2513;
  }
}

/*
  Reduced Transparency.

  The glass this used to thin out is gone; panels over the map are opaque
  stock now. What remains is the ink opacity, which is a legibility surface
  of its own, so it resolves to flat values here.
*/
@media (prefers-reduced-transparency: reduce) {
  :root {
    --label-secondary: #33404F;
    --label-tertiary: #4C5766;
    --separator: #C3C7CC;
    --fill-quaternary: #EFEDE8;
  }
}
```

- [ ] **Step 5: Update the `@theme inline` block**

In `@theme inline`, delete `--color-brand`, `--color-gold`, `--shadow-card`, `--shadow-glass`, `--radius-card`, `--radius-glass`, and `--font-condensed`. Keep every `--color-*` and `--text-*` mapping already present, and add:

```css
  --color-stamp: var(--stamp);
  --radius-control: var(--radius-control);
  --shadow-raised: var(--shadow-raised);
  --ease-out: var(--ease-out);
  --ease-in-out: var(--ease-in-out);
  --ease-drawer: var(--ease-drawer);
```

Leave the `--text-*` scale values unchanged in this task; Task 2 retunes them to Archivo's metrics.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/contrast.test.ts`
Expected: PASS, all cases including the three new ones.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS. Nothing else reads these token values directly.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css tests/contrast.test.ts
git commit -m "Replace the palette with the repair order's four inks"
```

---

### Task 2: Type layer

**Files:**
- Modify: `app/layout.tsx:1-30` (font imports and variables)
- Modify: `app/globals.css` (`@theme inline` font namespace, `body` rule, the `h1, .text-*` condensed rule)

**Interfaces:**
- Consumes: Task 1's tokens.
- Produces: Tailwind utilities `font-sans` and `font-mono`; CSS variables `--font-archivo` and `--font-martian` on `<html>`.

- [ ] **Step 1: Write the failing test**

First create `tests/design-pending.ts`, the conversion worklist. Ruling R2: the
source sweeps consume this list so the suite stays green at every commit while
still failing the moment an already-converted file regresses. Every array below
was derived by grepping the real tree, so it is the authoritative worklist — it
includes client sub-components the plan's per-route tables do not name.

```ts
/*
  The conversion worklist.

  Every entry is a file that still carries something the redesign retires. A
  task converts its files and DELETES their lines from this list; the sweeps in
  tests/design-system.test.ts then hold those files to the new rules forever.

  This exists because the alternative — asserting globally from the first task —
  leaves the suite red for ten tasks, which contradicts the "the full suite must
  stay green" constraint and makes every intermediate review unreadable. A
  shrinking allowlist keeps the suite green at every commit and still fails
  loudly the moment an already-converted file regresses.

  This file exports data only. Its assertions live in
  tests/design-system.test.ts, because vitest only collects test files matching
  its `include` glob, and this is not one.
*/
export const PENDING: Record<string, string[]> = {
  card: [
    "app/admin/claims/claim-row.tsx",
    "app/admin/page.tsx",
    "app/admin/verifications/verification-row.tsx",
    "app/experiences/[id]/engagement.tsx",
    "app/experiences/[id]/owner-actions.tsx",
    "app/experiences/[id]/page.tsx",
    "app/experiences/new/new-experience-form.tsx",
    "app/forgot-password/forgot-form.tsx",
    "app/forgot-password/page.tsx",
    "app/garage/loading.tsx",
    "app/join/shop/page.tsx",
    "app/join/shop/shop-signup-form.tsx",
    "app/mechanics/[id]/page.tsx",
    "app/policies/privacy/page.tsx",
    "app/policies/receipts/page.tsx",
    "app/policies/terms/page.tsx",
    "app/profile/[username]/page.tsx",
    "app/register/register-form.tsx",
    "app/reset-password/page.tsx",
    "app/reset-password/reset-form.tsx",
    "app/review/listing-row.tsx",
    "app/review/page.tsx",
    "app/settings/security/change-password.tsx",
    "app/settings/security/delete-account.tsx",
    "app/settings/security/mfa-panel.tsx",
    "app/setup-2fa/page.tsx",
    "app/shops/[id]/location-editor.tsx",
    "app/shops/[id]/price-editor.tsx",
    "app/shops/[id]/subscription-panel.tsx",
    "app/shops/add/add-shop-form.tsx",
    "app/shops/add/page.tsx",
    "app/shops/claim/claim-form.tsx",
    "app/vehicle/[id]/page.tsx",
    "components/experience-card.tsx",
    "components/ui.tsx",
  ],
  glass: [
    "app/discover.tsx",
    "components/anchored-menu.tsx",
    "components/area-picker.tsx",
    "components/document-viewer.tsx",
    "components/mechanic-map.tsx",
    "components/ui.tsx",
  ],
  retiredUtilities: [
    "app/discover.tsx",
    "app/garage/add-vehicle-sheet.tsx",
    "app/page.tsx",
    "components/area-picker.tsx",
    "components/document-viewer.tsx",
    "components/job-card.tsx",
    "components/landing/quick-filters.tsx",
    "components/session-guard.tsx",
    "components/ui.tsx",
  ],
  deletedPrimitives: [
    "app/admin/claims/page.tsx",
    "app/admin/page.tsx",
    "app/admin/verifications/page.tsx",
    "app/experiences/[id]/page.tsx",
    "app/experiences/new/page.tsx",
    "app/forgot-password/page.tsx",
    "app/join/shop/page.tsx",
    "app/mechanics/[id]/page.tsx",
    "app/policies/privacy/page.tsx",
    "app/policies/receipts/page.tsx",
    "app/policies/terms/page.tsx",
    "app/profile/[username]/page.tsx",
    "app/register/page.tsx",
    "app/reset-password/page.tsx",
    "app/review/page.tsx",
    "app/settings/security/page.tsx",
    "app/setup-2fa/page.tsx",
    "app/shops/[id]/page.tsx",
    "app/shops/add/page.tsx",
    "app/shops/claim/page.tsx",
    "app/vehicle/[id]/page.tsx",
    "components/experience-card.tsx",
    "components/ui.tsx",
  ],
};
```

Then create `tests/design-system.test.ts`. Ruling R3: every import goes at the
top of the file now, because later tasks only append `describe` blocks.

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PENDING } from "./design-pending";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/*
  Comments are stripped before matching, so a comment explaining why a rule
  exists does not itself trip that rule. tests/no-nested-forms.test.ts does the
  same thing for the same reason.
*/
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Every .ts/.tsx file under app/ and components/. */
function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(new URL(`../${dir}`, import.meta.url))) {
      const rel = join(dir, entry);
      if (statSync(new URL(`../${rel}`, import.meta.url)).isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry)) out.push(rel);
    }
  };
  ["app", "components"].forEach(walk);
  return out;
}

/** Files already converted for a given rule: everything not still on its worklist. */
const converted = (rule: string) =>
  sources().filter((f) => !PENDING[rule].includes(f));

describe("the type layer", () => {
  it("loads both faces through next/font, never a third-party origin", () => {
    const src = read("app/layout.tsx");
    expect(src).toContain("next/font/google");
    expect(src).toContain("Archivo");
    expect(src).toContain("Martian_Mono");
    // A stylesheet link to a font host would break the CSP in next.config.ts.
    expect(src).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it("retires the previous superfamily", () => {
    const src = read("app/layout.tsx");
    expect(src).not.toContain("Barlow");
  });

  it("defines no font variable in terms of itself", () => {
    /*
      Tailwind v4 builds font-* utilities from the --font-* namespace, so
      `--font-mono: var(--font-mono)` is a cycle that silently resolves to
      nothing. The next/font variables are named for their faces precisely so
      the theme mapping cannot collide with them.
    */
    const css = read("app/globals.css");
    expect(css).not.toMatch(/--font-(sans|mono):\s*var\(--font-\1\)/);
    expect(css).toContain("--font-archivo");
    expect(css).toContain("--font-martian");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/design-system.test.ts`
Expected: FAIL on the first case — `app/layout.tsx` still imports `Barlow` and `Barlow_Condensed`.

- [ ] **Step 3: Swap the faces in the layout**

Replace the font block at the top of `app/layout.tsx` with:

```tsx
import { Archivo, Martian_Mono } from "next/font/google";

/*
  Self-hosted at build time by next/font/google: no runtime request to a font
  host, so the CSP in next.config.ts stays intact and nothing about a visitor
  leaks to a third party on page load.

  Archivo carries prose and headings. Martian Mono carries every operation
  code, part number, VIN, chassis code and money figure — the impact-printer
  voice, and the thing that makes the document unmistakable.

  The variables are named for their faces, not for their roles. Tailwind v4
  derives font-* utilities from the --font-* namespace, so a variable named
  --font-mono here would be mapped to itself in @theme and resolve to nothing.
*/
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
});

const martian = Martian_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-martian",
});
```

Update the `<html>` element's className from `${body.variable} ${display.variable}` to `${archivo.variable} ${martian.variable}`, and change `themeColor` in the `viewport` export from `"#F5F5F3"` to `"#FBFAF8"`.

- [ ] **Step 4: Map the faces in the theme**

In `app/globals.css`, inside `@theme inline`, add:

```css
  --font-sans: var(--font-archivo), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: var(--font-martian), ui-monospace, "SF Mono", Menlo, monospace;
```

Replace the `body` font-family declaration with `font-family: var(--font-sans);`.

Delete the `h1, .text-large-title, .text-title1, .text-title2, .text-title3 { font-family: … }` rule entirely — Archivo carries every size, and there is no second display face to switch to.

Retune the display end of the text scale for Archivo, which is wider than Barlow Condensed at the same size:

```css
  --text-large-title: 3rem;
  --text-large-title--line-height: 3.25rem;
  --text-large-title--letter-spacing: -0.028em;
  --text-title1: 1.875rem;
  --text-title1--line-height: 2.25rem;
  --text-title1--letter-spacing: -0.022em;
```

Leave `title2` and below at their current values.

- [ ] **Step 5: Add the numeric rule**

Append to `app/globals.css`:

```css
/*
  Every figure in the product is tabular.

  Proportional numerals in a column of money is the single most common way a
  data table stops looking printed: the digits fail to align vertically and
  the column reads as ragged even though it is right-aligned.
*/
.tabular,
[data-figure] {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

- [ ] **Step 5b: Guard every CSS variable against its consumers**

Ruling R9. Task 1 deleted `--glass-*` and `--brand` while `.glass`, `.glass-clear` and `.pin` further down the same file still referenced them, and CSS drops any declaration containing an invalid `var()` — so the header, the map panels and every map pin silently lost their material. Nothing in the suite evaluates CSS, so it took a human reviewer to catch it. Tasks 5, 7 and 13 all edit this file too, so the check becomes permanent.

Create `tests/css-vars.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/*
  Every var() in globals.css must resolve to a definition in globals.css.

  An unresolved var() is not a CSS error — the browser drops the entire
  declaration containing it and carries on. That makes it the quietest possible
  regression: the rule simply stops applying, no console warning, no failing
  test, and it is only visible to whoever happens to load that page.

  Tailwind's own generated namespace is excluded. Those prefixes (tw, color,
  text, radius, shadow, ease, spacing and friends) are emitted into the utility
  layer from @theme inline rather than declared as plain custom properties in
  this file, so they are used without ever being defined here.
*/
const GENERATED = /^--(tw-|color-|text-|radius-|shadow-|ease-|spacing|container-|breakpoint-|leading-|tracking-|default-)/;

/*
  Injected onto <html> by next/font in app/layout.tsx, so they are legitimately
  used here without being declared here.

  Listed by exact name rather than excluding the whole --font-* namespace on
  purpose. This task renames the font variables, and a namespace-wide exclusion
  would hide a dangling `var(--font-body)` left behind in this very file — the
  single most likely way this task breaks. An allowlist has to be edited when
  the names change, which is the point.
*/
const INJECTED = new Set(["--font-archivo", "--font-martian"]);

describe("globals.css variables", () => {
  it("every var() reference resolves to a definition in the same file", () => {
    const defined = new Set(
      [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
    );
    const used = new Set(
      [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1]),
    );

    const unresolved = [...used].filter(
      (v) => !defined.has(v) && !GENERATED.test(v) && !INJECTED.has(v),
    );

    expect(unresolved, `unresolved var() in app/globals.css: ${unresolved.join(", ")}`).toEqual([]);
  });
});
```

- [ ] **Step 5c: Run it and confirm it is a real check**

Run: `npx vitest run tests/css-vars.test.ts`
Expected: PASS.

Then prove the test can fail, twice, because it has two exclusion paths:

1. Temporarily delete the `--separator` declaration from `:root`, re-run, and confirm it reports `unresolved var() in app/globals.css: --separator`. Restore it.
2. Temporarily change one `var(--font-archivo)` in `app/globals.css` to `var(--font-body)`, re-run, and confirm it reports `--font-body`. Restore it.

The second control is the one that matters: `--font-body` and `--font-display` are the old next/font variable names this task replaces, they are used in `globals.css` but declared in `app/layout.tsx`, and a namespace-wide `--font-` exclusion would have hidden a leftover reference to them. A guard nobody has seen fail is a guard nobody should trust.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/design-system.test.ts tests/contrast.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify the build compiles and fonts resolve**

Run: `npx next build`
Expected: build succeeds. `Barlow` no longer appears in the build output.

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/globals.css tests/design-system.test.ts tests/design-pending.ts tests/css-vars.test.ts
git commit -m "Swap Barlow for Archivo and Martian Mono"
```

---

## Phase 1 — Component vocabulary

### Task 3: Delete `Card` and build the ruled-region primitives

**Files:**
- Modify: `components/ui.tsx` (full rewrite of the component exports; formatters kept)
- Modify: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces, and every later task depends on these exact signatures:

```ts
export function Sheet(props: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}): JSX.Element;

export function SheetHeader(props: {
  title: string;
  code?: string;        // chassis code, VIN, operation code — set in mono
  meta?: string;
  actions?: ReactNode;
}): JSX.Element;

export function Columns(props: {
  heads: string[];      // e.g. ["Parts", "Labour"]
  children: ReactNode;  // OperationLine elements
  className?: string;
}): JSX.Element;

export function OperationLine(props: {
  label: string;
  code?: string;
  note?: string;
  figures: (string | null)[];  // length must equal Columns heads.length
  href?: string;               // whole row becomes a link when present
}): JSX.Element;

export function RangeScale(props: {
  low: number;
  high: number;
  value: number;
  caption?: string;
}): JSX.Element;

export function Stamp(props: {
  children: ReactNode;
  state?: "verified" | "void";
}): JSX.Element;

export function Tag(props: {
  children: ReactNode;
  tone?: "accent" | "neutral";
}): JSX.Element;

export function BlankForm(props: {
  heads: string[];
  title: string;
  hint?: string;
  action?: ReactNode;
}): JSX.Element;

export function Figure(props: {
  value: string;
  label: string;
  hint?: string;
}): JSX.Element;

export function Code(props: { children: ReactNode }): JSX.Element;

// Unchanged exports, retained verbatim:
export function SectionTitle(props: { children: ReactNode; hint?: string }): JSX.Element;
export function ErrorText(props: { children: ReactNode; id?: string }): JSX.Element;
export function Stars(props: { value: number }): JSX.Element;
export function Skeleton(props: { className?: string }): JSX.Element;
export const money: (n: number | null | undefined) => string;
export const num: (n: number | null | undefined) => string;
export const miles: (n: number | null | undefined) => string;
export const distance: (n: number | null | undefined) => string | null;
export const formatDate: (v: string | Date | null | undefined) => string;
export const buttonStyles: { primary: string; secondary: string; secondaryAccent: string; destructive: string; plain: string };
export const popoverSurface: string;

// Deleted: Card, PageTitle, Stat, EmptyState, VerifiedBadge.
```

- [ ] **Step 0: Close three silent breakages Task 1 left behind**

Rulings R11 to R13. Task 1 removed tokens whose consumers live in `.tsx` files, not in `globals.css`, so neither the contrast test nor the `css-vars` guard sees them. All three fail silently in a browser and green in CI.

**R11 — `--gold` is undefined but still used.** `app/discover.tsx:784` and `app/shops/[id]/subscription-panel.tsx:69` both use `color-mix(in srgb, var(--gold) …)`. An invalid `var()` inside `color-mix()` invalidates the whole `background` declaration. Tasks 11 and 13 convert those call sites; until then, restore an alias to `:root` in `app/globals.css`:

```css
  /*
    On death row until Task 13, exactly like the --glass-* set above.

    Two files still reach for this through color-mix(), and an undefined var()
    there silently drops the entire background declaration. The subscription
    mark becomes a blue Tag when those files convert; this alias only has to
    keep the interim coherent.
  */
  --gold: var(--warning);
```

**R12 — `font-condensed` is a dangling utility.** Task 1 deleted `--font-condensed` from `@theme inline`, which removed the `font-condensed` class. It is still applied in `app/page.tsx`, `app/not-found.tsx`, `app/garage/page.tsx` and `components/job-card.tsx`, where it now does nothing and the text quietly falls back. Add a `deletedUtilities` group to `tests/design-pending.ts` holding those four files, plus a `stampInk` group holding `components/job-card.tsx`:

```ts
  deletedUtilities: [
    "app/garage/page.tsx",
    "app/not-found.tsx",
    "app/page.tsx",
    "components/job-card.tsx",
  ],
  stampInk: [
    "components/job-card.tsx",
  ],
```

Add the matching sweep to `tests/design-system.test.ts`:

```ts
describe("no dangling utility classes", () => {
  it("no converted file applies a utility whose theme token was deleted", () => {
    /*
      A Tailwind class whose @theme token no longer exists does not error and
      does not warn. The class simply stops matching any rule, so the element
      renders unstyled and looks almost right. font-condensed and text-gold both
      died with the old world.
    */
    for (const f of converted("deletedUtilities")) {
      expect(stripComments(read(f)), f).not.toMatch(/font-condensed|text-gold|bg-gold/);
    }
  });
});
```

**R13 — the `css-vars` guard only reads `globals.css`.** Every finding above lived in a `.tsx` file. Extend `tests/css-vars.test.ts` so it also scans `app/` and `components/` for `var(--x)` inside arbitrary values and style props, resolving them against `globals.css`:

```ts
it("every var() used in a component resolves to a globals.css definition", () => {
  const defined = new Set(
    [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
  );
  const offenders: string[] = [];
  for (const f of sources()) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
      if (!defined.has(m[1])) offenders.push(`${f}: ${m[1]}`);
    }
  }
  expect(offenders, `unresolved var() in components: ${offenders.join(", ")}`).toEqual([]);
});
```

`tests/css-vars.test.ts` will need the same `sources()` walker Task 2 put in `tests/design-system.test.ts`. Export it from a small shared module rather than copying it — two copies of a directory walker is the kind of duplication that drifts.

Note while you are in these files: `app/not-found.tsx` and `components/job-card.tsx` still hardcode retired forest-palette hexes (`#20301f`, `#16210f`, `#EFE7C8`). Do NOT fix them here — Tasks 10 and 12 own those files. They are recorded in the ledger.

- [ ] **Step 1: Write the failing invariant tests**

Append to `tests/design-system.test.ts`. The helpers and imports already exist
from Task 2; these are `describe` blocks only.

```ts
describe("the document has no cards", () => {
  it("no converted file imports or renders Card", () => {
    for (const f of converted("card")) {
      expect(stripComments(read(f)), f).not.toMatch(/\bCard\b/);
    }
  });

  it("no converted file keeps a retired radius or shadow utility", () => {
    for (const f of converted("retiredUtilities")) {
      expect(stripComments(read(f)), f).not.toMatch(/rounded-card|rounded-glass|shadow-card/);
    }
  });

  it("no converted file uses a deleted primitive", () => {
    for (const f of converted("deletedPrimitives")) {
      expect(stripComments(read(f)), f).not.toMatch(/PageTitle|EmptyState|VerifiedBadge/);
    }
  });
});

describe("the stamp stays reserved", () => {
  it("no converted file outside components/ui.tsx names the stamp ink", () => {
    /*
      Gated on the worklist, because the premise this was first written on was
      wrong: components/job-card.tsx already applies var(--stamp) directly via a
      style prop. Task 10 converts it and removes it from the list, at which
      point this rule becomes absolute.
    */
    for (const f of converted("stampInk")) {
      if (f === "components/ui.tsx") continue;
      expect(stripComments(read(f)), f).not.toMatch(/--stamp|text-stamp|bg-stamp/);
    }
  });
});

describe("the conversion worklist", () => {
  /*
    Task 13 removes this .skip. Until then the worklist is the honest record of
    work outstanding, and a skipped test says so out loud — a test that returns
    early and then asserts trivially would say nothing at all.
  */
  it.skip("is empty once every task has run", () => {
    expect(Object.values(PENDING).flat()).toEqual([]);
  });
});
```

Then remove `components/ui.tsx` from all four arrays in `tests/design-pending.ts` — this task converts it.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/design-system.test.ts`
Expected: FAIL. `Card` currently appears in `components/ui.tsx`, `components/experience-card.tsx`, `app/profile/[username]/page.tsx` and others; `rounded-card` appears in 8 places.

- [ ] **Step 3: Write the new primitives**

Replace the component section of `components/ui.tsx` (keep the formatters and `buttonStyles` block; they are amended in Step 4) with:

```tsx
import type { ReactNode } from "react";
import Link from "next/link";

/*
  One definition of the column frame.

  Columns, OperationLine and BlankForm must derive the same track list or the
  heads stop sitting over their figures. Three copies of this string is exactly
  how that drifts, so there is one.
*/
const gridTemplate = (n: number) =>
  `minmax(0,1fr) repeat(${n}, minmax(5.5rem, 7rem))`;

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
}: {
  title: string;
  code?: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-separator pb-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-title1 font-semibold tracking-tight text-balance">{title}</h1>
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
}: {
  heads: string[];
  children: ReactNode;
  className?: string;
}) {
  const template = gridTemplate(heads.length);
  return (
    <div className={className} style={{ ["--cols" as string]: template }}>
      <div
        className="grid gap-x-4 sm:gap-x-8 border-b border-separator pb-2 text-caption text-tertiary-label"
        style={{ gridTemplateColumns: template }}
      >
        <span>Operation</span>
        {heads.map((h) => (
          <span key={h} className="text-right">
            {h}
          </span>
        ))}
      </div>
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
  const template = gridTemplate(figures.length);
  const body = (
    <div
      className="grid gap-x-4 sm:gap-x-8 items-baseline border-b border-separator py-3.5 min-h-11"
      style={{ gridTemplateColumns: template }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-body">{label}</span>
          {code && <Code>{code}</Code>}
        </div>
        {note && <p className="text-footnote text-secondary mt-0.5">{note}</p>}
      </div>
      {figures.map((f, i) => (
        <span key={i} className="tabular text-body text-right">
          {f ?? "—"}
        </span>
      ))}
    </div>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="block [@media(hover:hover)_and_(pointer:fine)]:hover:bg-grouped transition-colors duration-150"
    >
      {body}
    </Link>
  );
}
```

- [ ] **Step 4: Write the stamp, tag, scale, blank form and figure**

Append to `components/ui.tsx`:

```tsx
/*
  The stamp. Attests, never acts.

  This is the only place --stamp appears in the entire codebase, and
  tests/design-system.test.ts enforces that. A reserved accent that leaks into
  a button or a border stops being a stamp and becomes a fourth brand colour.

  The rotation is small and fixed rather than random: a stamp that lands at a
  different angle on every render reads as a gimmick, and a stamp that is
  perfectly square reads as a badge.
*/
export function Stamp({
  children,
  state = "verified",
}: {
  children: ReactNode;
  state?: "verified" | "void";
}) {
  return (
    <span
      data-state={state}
      className="inline-flex items-center gap-1.5 -rotate-2 border-2 border-current px-2.5 py-1 text-caption font-semibold uppercase tracking-[0.12em] text-[var(--stamp)]"
    >
      {/* Shape and word as well as colour, so the state survives greyscale. */}
      <span aria-hidden="true">{state === "verified" ? "✓" : "✕"}</span>
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
  tone?: "accent" | "neutral";
}) {
  const ink = tone === "accent" ? "text-accent border-accent" : "text-secondary border-separator";
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
export function BlankForm({
  heads,
  title,
  hint,
  action,
}: {
  heads: string[];
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  const template = gridTemplate(heads.length);
  return (
    <div>
      <div
        className="grid gap-x-4 sm:gap-x-8 border-b border-separator pb-2 text-caption text-tertiary-label"
        style={{ gridTemplateColumns: template }}
      >
        <span>Operation</span>
        {heads.map((h) => (
          <span key={h} className="text-right">
            {h}
          </span>
        ))}
      </div>
      {/* Three ruled but empty lines: the shape of the thing that is missing. */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-11 border-b border-separator" aria-hidden="true" />
      ))}
      <div className="pt-8 text-center">
        <p className="text-headline font-semibold">{title}</p>
        {hint && <p className="text-subhead text-secondary mt-1.5 max-w-sm mx-auto text-pretty">{hint}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

/** A single figure with its label. Mono, tabular, no container. */
export function Figure({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div>
      <p className="tabular text-title1 font-semibold leading-none">{value}</p>
      <p className="text-footnote text-secondary mt-2">{label}</p>
      {hint && <p className="text-footnote text-tertiary-label mt-0.5">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Retune `buttonStyles` and `popoverSurface`**

In `components/ui.tsx`, replace the `buttonStyles` object's shadow strings so no button carries a simulated lit edge (the ground is flat stock now), and change `rounded-control` usage to the new 3px radius automatically via the token. Replace the object with:

```tsx
const BUTTON_BASE =
  "inline-flex items-center justify-center min-h-11 px-4 rounded-control text-headline " +
  "transition-[background-color,opacity] duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

/*
  Pressed things go in.

  140ms because feedback under ~160ms reads as instant and anything slower
  reads as lag. transform and opacity only, so it never touches layout.
*/
const PRESS =
  "transition-[transform] duration-[140ms] ease-[var(--ease-out)] " +
  "active:translate-y-px active:scale-[0.98] " +
  "motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100";

export const buttonStyles = {
  primary: `${BUTTON_BASE} ${PRESS} bg-accent-fill text-on-accent font-semibold hover:bg-accent-hover`,
  secondary: `${BUTTON_BASE} ${PRESS} bg-elevated text-label border border-separator hover:bg-grouped`,
  secondaryAccent: `${BUTTON_BASE} ${PRESS} bg-elevated text-accent font-medium border border-separator hover:bg-grouped`,
  destructive: `${BUTTON_BASE} ${PRESS} bg-destructive-fill text-on-destructive font-semibold hover:brightness-110`,
  plain: `${BUTTON_BASE} ${PRESS} text-accent hover:bg-fill`,
} as const;

/*
  The surface a floating menu sits on.

  Deliberately opaque, and now the only place in the design system that uses
  a shadow. Menus open over the map, and a translucent menu over cartography
  stops being a surface at all. tests/popover-legibility.test.ts pins this.
*/
export const popoverSurface = "bg-elevated shadow-raised border border-separator";
```

Also fix `Skeleton`: replace its stale `dark:`-era comment and change the sweep from `via-white/10` to `via-white/60`, which is what reads as a highlight over light stock.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/design-system.test.ts`
Expected: PASS. `components/ui.tsx` is converted and off the worklist, and every file still on the worklist is excluded by `converted()`. Per ruling R2 the suite is green at every commit; the worklist, not a red test, is what records the remaining work.

- [ ] **Step 7: Verify types compile for the new module in isolation**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "components/ui.tsx" || echo "ui.tsx clean"`
Expected: `ui.tsx clean`. Errors in *consumer* files are expected at this point.

- [ ] **Step 8: Commit**

```bash
git add components/ui.tsx tests/design-system.test.ts
git commit -m "Replace Card with the ruled-document primitives"
```

---

### Task 4: The reconciliation

**Files:**
- Create: `components/reconciliation.tsx`
- Create: `tests/motion.test.ts`

**Interfaces:**
- Consumes: `Stamp`, `money` from `components/ui.tsx`.
- Produces:

```ts
"use client";
export function Reconciliation(props: {
  lines: { label: string; amount: number }[];
  total: number;
  /** true = validate live as the owner types. false = animate once on scroll-in. */
  live?: boolean;
  className?: string;
}): JSX.Element;
```

- [ ] **Step 1: Write the failing motion invariants**

Create `tests/motion.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(new URL(`../${dir}`, import.meta.url))) {
      const rel = join(dir, entry);
      if (statSync(new URL(`../${rel}`, import.meta.url)).isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry)) out.push(rel);
    }
  };
  ["app", "components"].forEach(walk);
  return out;
}

describe("the motion grammar", () => {
  it("never uses ease-in, which reads as sluggish on entry", () => {
    for (const f of sources()) {
      const src = stripComments(read(f));
      // ease-in-out is fine; bare ease-in is not.
      expect(src, f).not.toMatch(/ease-in(?!-out)[\s"'`\]]/);
    }
  });

  it("never animates a layout property", () => {
    for (const f of sources()) {
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/transition-\[(?:[^\]]*\b(?:width|height|top|left|margin|padding)\b)/);
    }
  });

  it("never uses transition-all", () => {
    for (const f of sources()) {
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/transition-all|transition:\s*all/);
    }
  });

  it("nothing enters from scale(0)", () => {
    for (const f of sources()) {
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/scale\(0\)|scale-0[\s"'`]/);
    }
  });
});

describe("the reconciliation", () => {
  it("honours reduced motion", () => {
    expect(read("components/reconciliation.tsx")).toMatch(/prefers-reduced-motion|motion-reduce/);
  });

  it("is the same component on the landing and the filing form", () => {
    expect(read("app/page.tsx")).toContain("Reconciliation");
    expect(read("app/experiences/new/new-experience-form.tsx")).toContain("Reconciliation");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/motion.test.ts`
Expected: FAIL — `components/reconciliation.tsx` does not exist.

- [ ] **Step 3: Write the component**

Create `components/reconciliation.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Stamp, money } from "@/components/ui";

/*
  The signature interaction, and the only one on the site.

  One component in two places, which is the entire argument. On the landing
  page it runs once on scroll-in and demonstrates the mechanism. On the filing
  form it runs live as the owner types and is a real validation: the stamp
  lands only when parts plus labour plus tax equals the total they entered.

  A marketing animation that is also the product's validation cannot be a lie,
  which is what makes it worth animating at all.
*/
export function Reconciliation({
  lines,
  total,
  live = false,
  className = "",
}: {
  lines: { label: string; amount: number }[];
  total: number;
  live?: boolean;
  className?: string;
}) {
  const sum = lines.reduce((n, l) => n + l.amount, 0);
  /* Money in cents would be exact; these are dollars, so allow a cent of float drift. */
  const reconciles = Math.abs(sum - total) < 0.005;

  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(live);

  useEffect(() => {
    if (live) return;
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [live]);

  return (
    <div ref={ref} className={className}>
      <dl>
        {lines.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline justify-between border-b border-separator py-2.5"
          >
            <dt className="text-subhead text-secondary">{l.label}</dt>
            <dd className="tabular text-body">{money(l.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-baseline justify-between border-b-2 border-label pt-3 pb-2.5">
        <span className="text-headline font-semibold">Total</span>
        <span className="tabular text-title2 font-semibold">{money(total)}</span>
      </div>

      {/*
        The stamp lands when the figures reconcile.

        scale(0.97) rather than scale(0): nothing in the real world appears
        from nothing, and a stamp coming out of a point reads as a UI trick
        instead of an object making contact. The blur clears over the same
        140ms, which is what sells the contact.
      */}
      <div className="mt-5 flex justify-end min-h-9" aria-live={live ? "polite" : undefined}>
        <div
          data-shown={shown && reconciles ? "" : undefined}
          className={
            "transition-[opacity,transform,filter] duration-[140ms] ease-[var(--ease-out)] " +
            "opacity-0 scale-[0.97] blur-[2px] " +
            "data-shown:opacity-100 data-shown:scale-100 data-shown:blur-0 " +
            "motion-reduce:transition-[opacity] motion-reduce:duration-200 " +
            "motion-reduce:scale-100 motion-reduce:blur-0"
          }
        >
          <Stamp>Reconciled</Stamp>
        </div>
      </div>

      {live && !reconciles && (
        <p role="status" className="mt-2 text-right text-footnote text-secondary">
          Parts and labour do not add up to the total yet.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/motion.test.ts`
Expected: the four grammar cases PASS and the reduced-motion case PASSES. The "same component in both places" case still FAILS — `app/page.tsx` and the filing form are wired in Tasks 6 and 9.

- [ ] **Step 5: Commit**

```bash
git add components/reconciliation.tsx tests/motion.test.ts
git commit -m "Add the reconciliation, the one interaction the product proves"
```

---

### Task 5: Photography, reveal, and the form controls

**Files:**
- Create: `components/plate.tsx`
- Modify: `components/landing/reveal.tsx`
- Modify: `components/form.tsx` (the `FIELD` constant and `CheckboxRow`)
- Delete: `components/landing/car.tsx`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces:

```ts
export function Plate(props: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  caption?: string;
  priority?: boolean;
  className?: string;
}): JSX.Element;
```

- [ ] **Step 0: Give the ruled columns real table semantics**

Rulings R16 and R17, both raised by the Task 3 review and both in `components/ui.tsx`.

**R16 — the columns are unreadable to a screen reader.** `Columns`, `OperationLine` and `BlankForm` render the heads as bare `<span>`s inside a CSS grid, so nothing associates a figure with the head above it. This is tabular price data — operation, parts, labour, total — and it is the primary content of the whole redesign. The markup it replaced used real `<dl>` and `<ul>` elements, so shipping unassociated `<div>`s is a regression, not a missing nicety.

Add ARIA table semantics without changing the layout: `role="table"` on the `Columns` frame, `role="row"` on the head row and on each `OperationLine`, `role="columnheader"` on each head, and `role="cell"` on the operation label and each figure. The grid tracks stay exactly as they are.

Give `Columns` an optional `label` prop (`label?: string`) applied as `aria-label` on the frame, so a page with two tables can distinguish them, and pass it through from any caller that has a natural name for the table.

**R17 — the head row is duplicated.** `Columns` and `BlankForm` each build the same head-row JSX and each hardcode the literal `"Operation"`. The shared `gridTemplate` keeps their tracks aligned, but the labels can still drift, and a blank form whose heads disagree with the filled form's heads is exactly the tell this design cannot afford. Extract one non-exported `HeadRow` component used by both:

```tsx
/*
  One head row, used by both Columns and BlankForm.

  The shared gridTemplate already keeps their tracks aligned; this keeps their
  LABELS aligned too. Two copies of a heading row is how a blank form ends up
  promising different columns than the filled one.
*/
function HeadRow({ heads }: { heads: string[] }) {
  return (
    <div
      role="row"
      className="grid gap-x-4 sm:gap-x-8 border-b border-separator pb-2 text-caption text-tertiary-label"
      style={{ gridTemplateColumns: gridTemplate(heads.length) }}
    >
      <span role="columnheader">Operation</span>
      {heads.map((h) => (
        <span key={h} role="columnheader" className="text-right">
          {h}
        </span>
      ))}
    </div>
  );
}
```

While you are here, delete the `--cols` custom property that `Columns` sets on its wrapper. Nothing reads it; the Task 3 review flagged it as dead.

- [ ] **Step 0b: Prove the semantics landed**

Append to `tests/design-system.test.ts`:

```ts
describe("the ruled columns are a table", () => {
  const ui = () => read("components/ui.tsx");

  it("exposes table, row, columnheader and cell roles", () => {
    /*
      A CSS grid of divs carries no relationship between a figure and the head
      above it. This is the product's primary content, and PRODUCT.md makes the
      accessibility guarantees binding, so the roles are not optional.
    */
    for (const role of ['role="table"', 'role="row"', 'role="columnheader"', 'role="cell"']) {
      expect(ui()).toContain(role);
    }
  });

  it("builds the head row in exactly one place", () => {
    // Two copies drift; the blank form then promises different columns.
    expect(ui().match(/role="columnheader"/g)?.length).toBe(2);
  });
});
```

Run: `npx vitest run tests/design-system.test.ts`
Expected: PASS.

- [ ] **Step 1: Write the failing test**

Append to `tests/design-system.test.ts`:

```ts
describe("photography", () => {
  it("the illustrated car is gone", () => {
    expect(() => read("components/landing/car.tsx")).toThrow();
  });
});

describe("the reveal", () => {
  it("renders its content without JavaScript", () => {
    /*
      The last critique's top finding: 17 reveal elements sat at opacity 0 and
      none ever received data-shown, so the whole page was invisible with JS
      disabled or the observer unsupported. The revealed state must therefore
      be the CSS default, with the observer removing a class rather than
      adding one.
    */
    const css = read("app/globals.css");
    expect(css).toMatch(/\.reveal\[data-pending\]/);
    expect(css).not.toMatch(/\.reveal\s*\{[^}]*opacity:\s*0/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/design-system.test.ts -t "photography"`
Expected: FAIL — `components/landing/car.tsx` still exists.

- [ ] **Step 3: Write the Plate**

Create `components/plate.tsx`:

```tsx
import Image from "next/image";

/*
  A photograph bound into the document.

  This is the only place imagery appears in the system, and it is deliberately
  framed rather than bled: a photograph run to the viewport edge reads as
  pasted onto a document, and one given a ruled frame and a margin caption
  reads as a plate bound into it.

  The frame is square, like every other ruled region. The caption sits outside
  the image, never overlaid on it.
*/
export function Plate({
  src,
  alt,
  width,
  height,
  sizes,
  caption,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  caption?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="border border-separator bg-grouped p-1.5">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className="w-full object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-caption text-tertiary-label">{caption}</figcaption>
      )}
    </figure>
  );
}
```

- [ ] **Step 4: Fix the reveal so it degrades**

Replace the body of `components/landing/reveal.tsx` so the element starts *visible* and the observer removes a pending flag:

```tsx
"use client";

import { useEffect, useRef } from "react";

/*
  Reveal on arrival, and visible without JavaScript.

  The previous implementation started every element at opacity 0 and waited
  for an observer to add data-shown. With scripting unavailable, an
  unsupported observer, or a hydration failure, all seventeen elements on the
  landing page stayed invisible — the top finding of the last critique, and a
  page that renders nothing is a far worse failure than a page that does not
  animate.

  The revealed state is now the CSS default. This component adds
  data-pending on mount (which only ever runs with JS available) and removes
  it on intersection, so the animation is purely additive.
*/
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    node.setAttribute("data-pending", "");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.removeAttribute("data-pending");
        io.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? ({ ["--reveal-delay" as string]: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
```

Add to `app/globals.css`:

```css
/*
  Additive only: the resting state is visible, and data-pending is what the
  observer removes. See components/landing/reveal.tsx.
*/
.reveal {
  transition:
    opacity 420ms var(--ease-out) var(--reveal-delay, 0ms),
    transform 420ms var(--ease-out) var(--reveal-delay, 0ms);
}

.reveal[data-pending] {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .reveal[data-pending] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

- [ ] **Step 5: Square the form controls**

In `components/form.tsx`, replace the `FIELD` constant:

```tsx
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
```

In `CheckboxRow`, change `className="size-7 rounded accent-[var(--accent-fill)]"` to `className="size-7 rounded-none accent-[var(--accent-fill)]"`.

- [ ] **Step 6: Delete the illustrated car**

```bash
git rm components/landing/car.tsx
```

Then confirm nothing imports it: `grep -rn "landing/car" app components || echo "no references"`. Expected: `no references`.

Also remove `"components/landing/car.tsx"` from the `glass` and `layoutTransitions` arrays in `tests/design-pending.ts`. A worklist entry for a file that no longer exists would fail Task 13's empty-array assertion for no reason.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run tests/design-system.test.ts tests/motion.test.ts`
Expected: the photography and reveal cases PASS. The `Card` sweep still fails on unconverted routes.

- [ ] **Step 8: Commit**

```bash
git add -A components/plate.tsx components/landing/reveal.tsx components/form.tsx app/globals.css tests/design-system.test.ts
git commit -m "Add the Plate, fix the reveal's no-JS failure, rule the form fields"
```

---

## Phase 2 — Chrome

### Task 6: Layout and header

**Files:**
- Modify: `app/layout.tsx` (body, main, footer)
- Modify: `components/site-header.tsx`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces: the document band that every route renders inside.

- [ ] **Step 1: Write the failing test**

Append to `tests/design-system.test.ts`:

```ts
describe("the chrome", () => {
  it("the header does not animate: it is on every page and touched constantly", () => {
    const src = stripComments(read("components/site-header.tsx"));
    expect(src).not.toMatch(/transition-\[transform\]|animate-/);
  });

  it("footer policy links meet the 44px target", () => {
    // The critique found them at 16px. min-h-11 is the 44px floor.
    expect(read("app/layout.tsx")).toMatch(/min-h-11/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/design-system.test.ts -t "chrome"`
Expected: FAIL on the header case — `navLink` currently carries `transition-colors`, which is fine, but the header's `backdrop-blur-md` and translucent ground must go with glass.

- [ ] **Step 3: Rewrite the header**

In `components/site-header.tsx`, replace the `<header>` element's className with an opaque band and a rule:

```tsx
    <header className="sticky top-0 z-50 border-b border-separator bg-elevated">
```

Replace `navLink` with:

```tsx
const navLink =
  "inline-flex items-center min-h-11 px-3 -mx-1 rounded-control text-subhead text-secondary " +
  "[@media(hover:hover)_and_(pointer:fine)]:hover:text-label " +
  "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-fill " +
  "transition-[color,background-color] duration-150";
```

Replace the plate logo `<Image>` with the wordmark, since the licence-plate PNG belongs to the retired world and the user released it.

The wordmark stands alone. An earlier draft of this plan set a small mono `R.O.` beside it as a "record number" flourish; that is the `Brand - No. 01` sub-eyebrow tell, it means nothing to a visitor, and a document world earns its identity from the ruling and the figures rather than from a cryptic label in the masthead (ruling R24).

```tsx
        <Link href="/" className="inline-flex items-baseline min-h-11 pr-2 sm:pr-4">
          <span className="text-title3 font-bold tracking-tight">Gaari</span>
        </Link>
```

- [ ] **Step 4: Rewrite the layout body and footer**

In `app/layout.tsx`, change `<body className="min-h-full flex flex-col bg-grouped">` to `bg-bg`. Change the `<main>` className to give the document its measure:

```tsx
        <main
          id="main"
          className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
```

Replace the `policyLink` constant so the links carry a real 44px target:

```tsx
const policyLink =
  "text-accent inline-flex items-center min-h-11 py-2 align-baseline " +
  "[@media(hover:hover)_and_(pointer:fine)]:hover:underline underline-offset-4";
```

Change the footer wrapper from `<div className="max-w-5xl mx-auto px-4 py-6 text-footnote text-secondary">` to `<div className="max-w-5xl mx-auto px-4 py-6 text-footnote text-secondary flex flex-wrap items-center gap-x-2 gap-y-1">` so the 44px links sit on a line without breaking the sentence.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/design-system.test.ts -t "chrome"`
Expected: PASS.

- [ ] **Step 6: Verify no reference to the retired logo remains**

Run: `grep -rn "gaari-logo" app components || echo "clean"`
Expected: `clean`.

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx components/site-header.tsx tests/design-system.test.ts
git commit -m "Make the chrome an opaque document band"
```

---

## Phase 3 — The landing

### Task 7: Rebuild `app/page.tsx` to the FIRST VIEWPORT block

**Files:**
- Modify: `app/page.tsx` (full rewrite)
- Modify: `app/globals.css` (remove the scroll-snap chapter rules)

**Interfaces:**
- Consumes: `Sheet`, `SheetHeader`, `Columns`, `OperationLine`, `RangeScale`, `Stamp`, `Figure`, `buttonStyles`, `money` from `ui.tsx`; `Reconciliation`; `Plate`; `Reveal`; `CountUp`; `QuickFilters`.
- Produces: nothing consumed downstream.

**Composition, from the direction contract:** one record at document scale fills the first viewport. Header block carries the generation and chassis code. Ruled operation lines fill the left with PARTS and LABOUR columns right-aligned beside them. Reconciliation total bottom right, `RangeScale` with its caption bottom left, stamp landing on reconcile. The primary action sits at the signature line, bottom right. No car photograph above the fold.

- [ ] **Step 1: Write the failing test**

Append to `tests/design-system.test.ts`:

```ts
describe("the landing", () => {
  const src = () => stripComments(read("app/page.tsx"));

  it("has no scroll-snap chapters", () => {
    expect(src()).not.toMatch(/snap-|chapter/);
    expect(stripComments(read("app/globals.css"))).not.toMatch(/scroll-snap/);
  });

  it("leads with the record, not a photograph", () => {
    // The hero Image was the first element in the old composition.
    const first = src().indexOf("Reconciliation");
    const plate = src().indexOf("Plate");
    expect(first).toBeGreaterThan(-1);
    if (plate > -1) expect(first).toBeLessThan(plate);
  });

  it("states one action per intent", () => {
    /*
      The critique found four CTA labels for two destinations, three of them
      pointing at /register. One label per intent.
    */
    const labels = [...src().matchAll(/button:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/design-system.test.ts -t "landing"`
Expected: FAIL — `chapter` and `snap-` are all over the current file.

- [ ] **Step 3: Remove the scroll-snap rules**

Delete the `.home-root { scroll-snap-type: … }` and `.chapter { scroll-snap-align: …; scroll-snap-stop: always }` rules from `app/globals.css`. Snap plus a long record fights the reader, and removing the snap container also removes its layout cost.

- [ ] **Step 4: Rewrite the page**

Rewrite `app/page.tsx`. Keep the `COPY` block pattern (all strings in one object at the top) and keep every existing string verbatim except the CTA labels, which collapse to one per intent. Structure:

1. `<section>` — the record, `min-h-[100dvh]` less the header, laid out as
   `SheetHeader` (title `COPY.hero.heading`, code `C190`, meta `COPY.hero.body`),
   then `Columns heads={["Parts", "Labour"]}` holding four `OperationLine`s from
   the example, then a two-column foot: `RangeScale` left, `Reconciliation` right
   with `live={false}`, then the primary `Link` to `/register` at the bottom right.
2. `<section>` — `QuickFilters` beside the "start with the car you own" copy.
3. `<section>` — the three trades as `OperationLine`s with `Plate` thumbnails.
4. `<section>` — the proof paragraph beside a `Plate` of the supplied GT3 RS shot.
5. `<section>` — the `Figure` counts, rendered only when non-zero, and the closing action.

Every example figure keeps its existing "An example, to show the shape of a report. Not a real price." caption, because prices are not real yet and `PRODUCT.md` forbids claiming otherwise.

Fix the `sizes` attribute on every image: the critique found a 331KB hero served into a ~1049px slot. Use `sizes="(max-width: 1024px) 92vw, 46rem"` on the largest plate and scale the others to their real slots.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/design-system.test.ts tests/motion.test.ts`
Expected: the landing cases PASS, and `tests/motion.test.ts`'s "same component in both places" now half-passes (`app/page.tsx` contains `Reconciliation`).

- [ ] **Step 6: Verify it renders and measure**

Run: `npm run dev`, open `/`, and confirm: the record fills the first viewport, the stamp lands on scroll-in, no horizontal overflow at 1440 / 390 / 844, and the page is fully readable with JavaScript disabled.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/globals.css tests/design-system.test.ts
git commit -m "Rebuild the landing as one repair order"
```

---

## Phase 4 — Persuade forms

### Task 8: Auth and submission forms

**Files:**
- Modify: `app/login/page.tsx`, `app/register/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/verify/page.tsx`, `app/join/shop/page.tsx`, `app/shops/add/page.tsx`, `app/shops/claim/page.tsx`
- Modify: `app/policies/terms/page.tsx`, `app/policies/privacy/page.tsx`, `app/policies/receipts/page.tsx`

**Interfaces:**
- Consumes: `SheetHeader`, `Sheet`, `buttonStyles` from `ui.tsx`; the ruled `FIELD` from Task 5.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Convert the eight form pages**

Each currently opens with either a bare `<h1>` plus `<p>` or a `PageTitle`. Replace both shapes with `SheetHeader`, keeping every existing string verbatim:

```tsx
import { SheetHeader } from "@/components/ui";

// app/login/page.tsx, inside the wrapper div:
<SheetHeader title="Welcome back" meta="Sign in to your garage." />
```

Change each page's wrapper measure from `max-w-sm` / `max-w-md` to `max-w-md` uniformly, and drop any `mx-auto` centring on `/join/shop` and `/shops/add`, which are longer forms and read better left-aligned against the document's measure.

Delete every `PageTitle` import. `PageTitle` no longer exists.

- [ ] **Step 2: Convert the three policy pages**

These are Read mode. Replace `PageTitle` with `SheetHeader`, set the prose measure to `max-w-[68ch]`, and replace any `Card` wrapper with a `Sheet`. Add `SectionTitle` between clauses where the pages currently use bare `<h2>`.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run`
Expected: the `Card` sweep in `tests/design-system.test.ts` now names fewer files. `tests/no-nested-forms.test.ts` must still PASS — do not restructure any `<form>` element.

- [ ] **Step 4: Verify each route renders**

Run `npm run dev` and load all eleven routes. Confirm labels sit above inputs, error text below, and every control is at least 44px.

- [ ] **Step 5: Commit**

```bash
git add app/login app/register app/forgot-password app/reset-password app/verify app/join app/shops/add app/shops/claim app/policies
git commit -m "Convert the auth, submission and policy pages to the document"
```

---

## Phase 5 — Operate core

### Task 9: The filing form and the live reconciliation

**Files:**
- Modify: `app/experiences/new/page.tsx`, `app/experiences/new/new-experience-form.tsx`
- Modify: `app/experiences/[id]/page.tsx`

**Interfaces:**
- Consumes: `Reconciliation` with `live`; `SheetHeader`, `Columns`, `OperationLine`, `RangeScale`, `Stamp`, `Tag`.
- Produces: nothing consumed downstream.

This is the most important screen in the product: it is where the only real content gets created.

- [ ] **Step 1: Wire the live reconciliation**

In `app/experiences/new/new-experience-form.tsx`, hold the parts, labour, tax and total fields in state, and render below them:

```tsx
<Reconciliation
  live
  lines={[
    { label: "Parts", amount: Number(parts) || 0 },
    { label: "Labour", amount: Number(labour) || 0 },
    { label: "Tax", amount: Number(tax) || 0 },
  ]}
  total={Number(total) || 0}
  className="mt-8"
/>
```

Do not change any `name` attribute on any input. Analytics and autofill depend on them.

- [ ] **Step 2: Convert the filed-record view**

In `app/experiences/[id]/page.tsx`, render the record as `SheetHeader` (title = the service, code = the generation, meta = the shop and date), then `Columns` with the operation lines, then `RangeScale`, then the receipt state as a `Tag` when unverified and a `Stamp` when verified.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run tests/motion.test.ts`
Expected: PASS, including "is the same component on the landing and the filing form".

- [ ] **Step 4: Verify the validation is real**

Run `npm run dev`, open `/experiences/new`, enter parts 100, labour 50, tax 10, total 160. Expected: the stamp lands. Change total to 200. Expected: the stamp leaves and the status line appears.

- [ ] **Step 5: Commit**

```bash
git add app/experiences
git commit -m "Make the reconciliation a real validation on the filing form"
```

---

### Task 10: Garage, vehicle and profile

**Files:**
- Modify: `app/garage/page.tsx`, `app/garage/loading.tsx`, `app/garage/add-vehicle-sheet.tsx`
- Modify: `app/vehicle/[id]/page.tsx`
- Modify: `app/profile/[username]/page.tsx`
- Modify: `components/experience-card.tsx`, `components/job-card.tsx`

**Interfaces:**
- Consumes: `Sheet`, `SheetHeader`, `Columns`, `OperationLine`, `Figure`, `BlankForm`, `Tag`, `money`, `miles`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Convert the garage to a ledger**

`app/garage/page.tsx` is already closest to the target. Replace the summary `<dl>` with three `Figure`s, and replace the per-car rows with `Columns heads={["Services", "Spent"]}` holding one `OperationLine` per car (`label` = nickname or year/make/model, `code` = the generation, `href` = `/vehicle/${id}`). Replace the empty branch with `BlankForm`.

- [ ] **Step 2: Convert the vehicle record**

`app/vehicle/[id]/page.tsx` becomes the car's own record: `SheetHeader` with the VIN as `code`, spec behind the existing disclosure, then `Columns` of filed services, then a `Reconciliation` of total spend with `live={false}`.

- [ ] **Step 3: Convert the profile**

`app/profile/[username]/page.tsx` is currently 48 lines of grey boxes and is the weakest page on the site. Replace `PageTitle` with `SheetHeader`, delete the `Card`-wrapped `<ul>`, and render the cars as `Columns heads={["Generation"]}` with one `OperationLine` each. Replace `EmptyState` with `BlankForm`.

- [ ] **Step 4: Convert the two card components**

`components/experience-card.tsx` and `components/job-card.tsx` both render `Card`. Convert each to a `Sheet` with a top rule, and move any verification badge to `Stamp` or `Tag`.

- [ ] **Step 5: Retune the skeleton**

`app/garage/loading.tsx` must match the ledger's rule positions, not generic blocks: three `Figure`-height bars across the top, then five `h-11` ruled rows.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: the `Card` sweep passes for these files.

- [ ] **Step 7: Commit**

```bash
git add app/garage app/vehicle app/profile components/experience-card.tsx components/job-card.tsx
git commit -m "Convert the garage, vehicle and profile to ledgers"
```

---

### Task 11: Shop pages and the subscription tag

**Files:**
- Modify: `app/mechanics/[id]/page.tsx`, `app/shops/[id]/page.tsx`
- Modify: `app/shops/[id]/subscription-panel.tsx` (delete `GoldCar`), `app/shops/[id]/price-editor.tsx`, `app/shops/[id]/location-editor.tsx`

**Interfaces:**
- Consumes: `Sheet`, `SheetHeader`, `Columns`, `OperationLine`, `Tag`, `Stamp`.
- Produces: nothing consumed downstream. The `GoldCar` export deliberately stays alive until Task 13 (ruling R6) so every commit in between still compiles.

- [ ] **Step 1: Replace the subscription mark, but leave the export standing**

In `app/shops/[id]/subscription-panel.tsx`, replace the gold "Subscribed" chip with:

```tsx
<Tag>Subscribed</Tag>
```

An illustrated car icon is decoration in this world, and `--gold` no longer exists, so the chip would render unstyled otherwise.

Leave the `GoldCar` function itself exported and untouched. `app/discover.tsx` still imports it and Task 13 deletes it there, in the same commit that fixes its three call sites. Deleting it here would leave the app failing `tsc` across two whole tasks.

- [ ] **Step 2: Update the two non-map call sites**

In `app/mechanics/[id]/page.tsx`, remove the `GoldCar` import and replace `{mechanic.subscribed && <GoldCar className="size-7 shrink-0" />}` with `{mechanic.subscribed && <Tag>Subscribed</Tag>}`.

`app/discover.tsx` has three further call sites and is handled in Task 13. Because the export stays alive (ruling R6), the app compiles cleanly throughout.

- [ ] **Step 3: Convert the shop pages**

`app/mechanics/[id]/page.tsx` becomes the shop's operations sheet: `SheetHeader` with the shop name and its claim state, then `Columns heads={["Typical", "Filed"]}` of published rates.

`app/shops/[id]/page.tsx` is the owner console: the same sheet, editable, with the subscription state as a stamped region.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: both clean. Nothing is left half-deleted.

- [ ] **Step 5: Commit**

```bash
git add app/mechanics app/shops
git commit -m "Convert the shop sheets and retire the gold subscription mark"
```

---

## Phase 6 — Secondary surfaces

### Task 12: Settings, MFA and the dockets

**Files:**
- Modify: `app/settings/security/page.tsx` and its three panels, `app/setup-2fa/page.tsx`
- Modify: `app/review/page.tsx`, `app/review/listing-row.tsx`
- Modify: `app/admin/page.tsx`, `app/admin/claims/page.tsx`, `app/admin/claims/claim-row.tsx`, `app/admin/verifications/page.tsx`, `app/admin/verifications/verification-row.tsx`
- Modify: `app/not-found.tsx`

**Interfaces:**
- Consumes: `SheetHeader`, `Columns`, `OperationLine`, `Stamp`, `Tag`, `Figure`, `BlankForm`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Convert the settings and MFA pages**

Replace `PageTitle` with `SheetHeader` and every `Card` with `Sheet` across `app/settings/security/*` and `app/setup-2fa/page.tsx`. The 2FA QR code is content, not decoration, so it keeps its own framed region using `Plate`-style rules.

- [ ] **Step 2: Convert the four queues to dockets**

`app/review/page.tsx` and the three `app/admin/*` pages are dense queues. Render each as `Columns` with mono IDs via `Code`, `Stamp` for approved items and `Tag` for pending. Replace `EmptyState` with `BlankForm` in each.

- [ ] **Step 3: Convert not-found**

`app/not-found.tsx` becomes a form stamped void:

```tsx
<Stamp state="void">No such record</Stamp>
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: PASS. `tests/authorization.test.ts` must remain green — do not touch any guard.

- [ ] **Step 5: Commit**

```bash
git add app/settings app/setup-2fa app/review app/admin app/not-found.tsx
git commit -m "Convert settings, MFA and the review queues"
```

---

## Phase 7 — The map stack

### Task 13: Replace glass with opaque form panels

**Files:**
- Modify: `app/discover.tsx` (1,209 lines — the filter bar, results panel and detail panel)
- Modify: `components/mechanic-map.tsx`, `components/document-viewer.tsx`, `components/area-picker.tsx`, `components/anchored-menu.tsx`
- Modify: `app/globals.css` (delete the `.glass` class and every `--glass-*` token)

**Interfaces:**
- Consumes: `popoverSurface`, `Sheet`, `Columns`, `OperationLine`, `Tag`, `Code` from `ui.tsx`.
- Produces: nothing consumed downstream.

This is the largest single unit of work in the build and is deliberately last: it is the only phase that can leave the app uncompilable mid-task.

- [ ] **Step 1: Write the failing test**

Append to `tests/design-system.test.ts`:

```ts
describe("the map panels", () => {
  it("no glass survives anywhere", () => {
    for (const f of sources()) {
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/(?<![-\w])glass(?![-\w])/);
    }
    expect(stripComments(read("app/globals.css"))).not.toMatch(/--glass-|\.glass\b/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/design-system.test.ts -t "map panels"`
Expected: FAIL, naming `app/discover.tsx`, `components/document-viewer.tsx`, `components/area-picker.tsx` and `app/globals.css`.

- [ ] **Step 3: Replace the three panels in discover.tsx**

Replace `className="glass rounded-glass …"` on the filter bar (line ~649), the results panel (~870) and the detail panel (~1124) with an opaque form panel:

```tsx
className="bg-elevated border border-separator shadow-raised …"
```

Keep every layout class already on those elements (`max-h-*`, `overflow-y-auto`, `overscroll-contain`, `flex flex-col`) exactly as-is; only the material changes.

- [ ] **Step 4: Fix the three GoldCar call sites**

Remove the `GoldCar` import from `app/discover.tsx` and replace all three usages (lines ~788, ~1051, ~1128) with `<Tag>Subscribed</Tag>`. Replace the gold chip class at line ~784 with the `Tag` component. Then delete the `GoldCar` function itself from `app/shops/[id]/subscription-panel.tsx` — this is its last call site, and per ruling R6 the deletion and the call-site fixes land in one commit so nothing is ever left uncompilable.

- [ ] **Step 5: Convert the results list to operation lines**

The results panel renders shop rows. Convert them to `OperationLine` with `label` = shop name, `code` = distance, `figures` = the filed-price count. Keep the existing selection and keyboard behaviour untouched.

- [ ] **Step 6: Delete the glass tokens**

Remove `--glass-regular-bg`, `--glass-regular-blur`, `--glass-clear-bg`, `--glass-clear-blur`, `--glass-saturate`, `--glass-border`, `--glass-shadow`, the `.glass` class definition and `--radius-glass` from `app/globals.css`.

- [ ] **Step 7: Update `components/mechanic-map.tsx`**

Its comment at line ~116 explains that glass panels need a dark map style. That reasoning is now inverted: opaque light panels sit over the light map style. Update the comment and confirm the chosen map style still contrasts against `--bg-elevated`.

- [ ] **Step 8: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: both clean. `tests/popover-legibility.test.ts` must still PASS — `area-picker.tsx` keeps `popoverSurface`, which is what that test asserts.

- [ ] **Step 9: Verify the map page**

Run `npm run dev`, open `/search`. Confirm the panels are legible over cartography, the menus open opaque, and there is no `backdrop-filter` left on any scrolling container.

- [ ] **Step 10: Empty the worklist and arm the gate**

Every array in `tests/design-pending.ts` must now be empty. Remove the `.skip` from the `"is empty once every task has run"` test in `tests/design-system.test.ts` so the sweeps become unconditional from here on:

```ts
  it("is empty once every task has run", () => {
    expect(Object.values(PENDING).flat()).toEqual([]);
  });
```

Run: `npx vitest run tests/design-system.test.ts`
Expected: PASS with nothing skipped. If any array is non-empty, that file was never converted — convert it now rather than deleting its line.

- [ ] **Step 11: Commit**

```bash
git add app/discover.tsx components/mechanic-map.tsx components/document-viewer.tsx components/area-picker.tsx components/anchored-menu.tsx app/shops/\[id\]/subscription-panel.tsx app/globals.css tests/design-system.test.ts tests/design-pending.ts
git commit -m "Replace the map's glass with opaque form panels and close the worklist"
```

---

## Phase 8 — Finish

### Task 14: Responsive pass and the mechanical detector

**Files:**
- Modify: whichever files the detector and the responsive check name.

- [ ] **Step 1: Run the mechanical detector**

Run: `node /Users/hamzasethi/.claude/skills/impeccable/scripts/detect.mjs --json app components`
Expected: zero findings. Fix everything it names in one batch.

- [ ] **Step 2: Check every route at three widths**

Run `npm run dev` and check 1440, 768 and 390 on all 26 routes. Confirm: no horizontal overflow, `Columns` restacks rather than shrinking its figures (the BLAST raise), and every touch target is at least 44px.

- [ ] **Step 3: Check the three accessibility modes**

Toggle `prefers-reduced-motion`, `prefers-contrast: more` and `prefers-reduced-transparency` in devtools. Confirm the page stays legible and no information is lost in any of them.

- [ ] **Step 4: Run the whole suite plus lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Fix everything the detector and the responsive pass found"
```

---

### Task 15: Finish review and DESIGN.md

**Files:**
- Create: `DESIGN.md`
- Modify: `.impeccable/surfaces/app-page-tsx.md` (discharge the FINISH line)

The direction contract's exit condition is verbatim: *unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.*

- [ ] **Step 1: Run the finish review**

Load `reference/finish.md` from the impeccable skill and follow it. Audit the built site against the direction contract's FIRST VIEWPORT block and its named signature interaction, since this was a code-led build and behaviour is what the reviewer checks.

- [ ] **Step 2: Write DESIGN.md from the built world**

Document what was actually built, not what was planned: the four inks and their roles, the reserved stamp rule, the type pairing and where mono is mandatory, the ruled-region vocabulary with each component's job, the motion grammar with its durations and curves, and the accessibility contract.

- [ ] **Step 3: Record raster provenance**

Every shipping image in `public/img/` gets its source recorded. The supplied GT3 RS and GT-R photographs are the user's; note that. Anything without known provenance is replaced or removed.

- [ ] **Step 4: Close the build phase**

Run: `node /Users/hamzasethi/.claude/skills/impeccable/scripts/build-phase.mjs finish --disposition shipped`

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md .impeccable
git commit -m "Finish review, verdict and DESIGN.md"
```

---

## Self-Review

**Spec coverage.** Section 1 (what is replaced) → Tasks 1-13. Section 2 (ink system) → Task 1; the `--gold` retirement → Tasks 11 and 13; glass → Task 13; `--shadow-raised` kept → Task 3 Step 5. Section 3 (type) → Task 2. Section 4 (component vocabulary) → Tasks 3, 4, 5; every named component has a signature in a Produces block. Section 5 (motion) → Tasks 4 and 5, enforced by `tests/motion.test.ts`. Section 6 (per-route) → Tasks 7-13; all 26 routes appear. Section 7 (dependencies) → Global Constraints; 21st.dev vendoring is deliberately not a task, because the spec scopes it to case-by-case evaluation and no case is known in advance. Section 8 (accessibility) → Tasks 1, 6, 14. Section 9 (risks) → risk 1 audited in Task 15, risk 2 in Task 14, risk 3 is the phasing itself, risk 4 is a Global Constraint.

**Placeholder scan.** No TBD, no "handle edge cases", no "similar to Task N". Every code step carries real code. Task 7 Step 4 and Task 12 Step 2 specify composition rather than full markup, because the component API they consume is fully defined in Task 3's Produces block and the page content already exists verbatim in the repo; the engineer is recomposing known content with known components, not inventing an interface.

**Type consistency.** `Sheet`, `SheetHeader`, `Columns`, `OperationLine`, `RangeScale`, `Stamp`, `Tag`, `BlankForm`, `Figure`, `Code`, `Plate`, `Reconciliation` are each defined once in a Produces block and used with those exact names and props throughout. `Stamp` takes `state?: "verified" | "void"` in Task 3 and is used with `state="void"` in Task 12. `Reconciliation` takes `live?: boolean` in Task 4, used as `live={false}` in Tasks 7 and 10 and bare `live` in Task 9. `Columns` and `OperationLine` and `BlankForm` all derive the same grid template from `heads.length` / `figures.length`; a mismatch between the two is the one runtime trap and is called out in `OperationLine`'s prop comment.

**No intermediate breakage.** An earlier draft deleted `GoldCar` in Task 11 while `app/discover.tsx` still imported it, leaving the app failing `tsc` across two tasks. Ruling R6 defers the deletion to Task 13, where it lands in the same commit as its call-site fixes, so every commit on the branch compiles and the suite stays green throughout.

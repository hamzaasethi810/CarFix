# Gaari full-site redesign: The Repair Order

Direction locked 2026-09-04. Seed `102e37bb`, candidate 3 of 7, kind `assigned`.
The durable direction contract lives in `.impeccable/surfaces/app-page-tsx.md`
and is not duplicated here. Product truth lives in `PRODUCT.md`.

This document is the implementation spec: tokens, type, components, motion,
per-route treatment, dependencies and the accessibility contract.

## 1. What is being replaced, and what is not

Replaced: the entire visual world. Palette, type, component vocabulary, motion,
page composition on all 26 routes. The wordmark and copy voice are in scope; the
user released both.

Not replaced, and binding:

- Every route slug, nav label, form field name and section ID.
- The accessibility guarantees: `tests/contrast.test.ts`, 44px minimum targets,
  `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`,
  non-colour redundancy for state.
- The CSP in `next.config.ts`. Nothing is loaded from a third-party origin.
  Fonts self-host through `next/font/google` at build time.
- All server logic, auth, rate limiting, BotID, Prisma access and API routes.

## 2. Ink system

Four inks and a stock. Every grey is an ink at opacity; there is no separate
grey ramp. This is the "total ink commitment" raise and it is what stops the
document reading as an unstyled table.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FBFAF8` | Form stock. The page. |
| `--bg-elevated` | `#FFFFFF` | Top copy. The record itself. |
| `--bg-grouped` | `#F1EFEA` | Second copy. Recessed regions, table zebra. |
| `--bg-tertiary` | `#E6E3DC` | Third copy. Disabled fields, rule fills. |
| `--label` | `#101B2E` | Impact ink. Body and figures. |
| `--label-secondary` | `rgba(16,27,46,0.72)` | Secondary prose. |
| `--label-tertiary` | `rgba(16,27,46,0.58)` | Captions, column heads. |
| `--separator` | `rgba(16,27,46,0.18)` | Hairline column rules. |
| `--accent`, `--accent-fill` | `#1B4FA6` | Process blue. Structure, links, primary action, verified. |
| `--accent-hover` | `#16407F` | |
| `--on-accent` | `#FFFFFF` | |
| `--success` | `#1B4FA6` | Same ink as accent. Confirmation is structural, not a new colour. |
| `--destructive`, `--destructive-fill` | `#A32B18` | Correction ink. Errors and destroy actions. |
| `--on-destructive` | `#FFFFFF` | |
| `--stamp` | `#C4331D` | **Reserved.** The reconciliation / verified stamp only. Never a control, never decoration. |
| `--warning` | `#8A5A00` | Retained for the existing `Stars` component. |

`--shadow-raised` is **kept**, retuned to the ink, because a popover or dialog
genuinely floats above the page and needs separation the rules cannot give it.
`--shadow-card` is retired: nothing in the flow is raised.

Verified against `lib/design/contrast.ts`. All fourteen pairs pass, body ink at
16.52:1 on stock, the tightest pair (stamp on stock) at 5.24:1 against a 4.5
floor. `tests/contrast.test.ts` gains cases for `stamp` and for `label` on
`bg-grouped`.

Retired: `--brand` (verified unused outside `globals.css`), `--shadow-card`,
`--radius-card`, and every `--glass-*` token plus the `.glass` class and
`rounded-glass` utility. A document has no glass.

Two retirements have real call sites and are not free:

- **`--gold` is in use**, carrying the `GoldCar` mark and the "Subscribed" chip
  across `app/discover.tsx` (3 sites), `app/mechanics/[id]/page.tsx` and
  `app/shops/[id]/subscription-panel.tsx`. It is retired and the subscription
  mark becomes a `Tag` reading "Subscribed" in process blue, attached to the
  record edge. `GoldCar` is deleted; an illustrated car icon is decoration in
  this world. Four call sites change.
- **Glass is load-bearing on the map page.** `.glass` and `rounded-glass` are
  used by the filter bar, the results panel and the detail panel in
  `app/discover.tsx`, plus `components/document-viewer.tsx` and
  `components/area-picker.tsx`. Panels floating over a map still need to be
  legible against it, so they become opaque form panels: stock fill, hairline
  rule, `--shadow-raised`. This reads better over cartography than translucency
  did and removes a `backdrop-filter` cost on every scroll frame.

### Rules, not radii and not shadows

Separation comes from hairline rules and stock tone. Radius collapses to a
single value, `--radius-control: 3px`, applied to controls only; ruled regions
are square. This is the Shape Consistency Lock, and it is what makes the world
recognisable with all content removed.

The `prefers-contrast: more` block currently describes a dark forest palette
that no longer exists and is dead code. It is rewritten to deepen the ink,
darken the rules and raise `--label-tertiary` to full opacity.

## 3. Type

Both faces self-host through `next/font/google`; verified present in the
installed Next 16.3.2 font metadata.

- **Archivo** (variable, 400/500/600/700) — prose, headings, labels. A US
  grotesk built for both headline and small-text performance, with true tabular
  figures. Carries the form's printed-label register without novelty.
- **Martian Mono** (variable, 300/400/600) — operation codes, part numbers, VINs,
  chassis codes, every money figure and every total. This is the impact-printer
  voice and it is where the document is unmistakable.

Neither face appears on impeccable's exhausted-defaults list, and Barlow /
Barlow Condensed are retired with the old world.

Every numeric in the product sets `font-variant-numeric: tabular-nums`. Money
and codes additionally set Martian Mono. The existing text-style scale
(`--text-large-title` through `--text-caption`) is kept as a scale but retuned
to Archivo's metrics.

## 4. Component vocabulary

`components/ui.tsx` is rewritten. `Card` is deleted, not restyled: a document
has ruled regions, not floating tiles, and keeping `Card` would guarantee the
old shape survives in thirty places.

| New | Replaces | What it is |
|---|---|---|
| `Record` | `Card` | A ruled region. Hairline top rule, optional header band, square corners, no shadow. |
| `RecordHeader` | `PageTitle` | The document header block: title, chassis/generation code in mono, meta row. |
| `OperationLine` | ad-hoc list rows | One ruled row: description left, code in mono, right-aligned figure columns. |
| `Columns` | — | The PARTS / LABOR / TOTAL column frame with its rules and column heads. |
| `Reconciliation` | — | The signature interaction. Sums its lines and lands the stamp when they reconcile. |
| `RangeScale` | inline markup in `app/page.tsx` | Low/high scale with a derived marker and a drawn leader line to the governing rule. |
| `Stamp` | `VerifiedBadge` | The reserved-red stamp. Shape plus word plus colour, so it survives greyscale. |
| `Tag` | — | The verification token, rendered attached to the record edge, not floating near it. |
| `Plate` | — | A photograph bound into the document: ruled frame, caption in the margin. The only place imagery appears. |
| `BlankForm` | `EmptyState` | An empty ruled form with its column heads intact and a single instruction. |
| `Docket` | ad-hoc admin lists | Dense ruled index for admin and review queues. |
| `Figure`, `Code` | `Stat` | Mono numerics with correct tabular alignment. |

`money`, `num`, `miles`, `distance`, `formatDate`, `Stars`, `ErrorText`,
`Skeleton`, `buttonStyles` and `popoverSurface` are retained. `Skeleton` loses
its dead `dark:` comment and its shimmer is retuned to the stock tone.

## 5. Motion grammar

No animation library. Everything is CSS transitions, `@starting-style`,
IntersectionObserver and WAAPI where a programmatic timeline is genuinely
needed. This is the single biggest contributor to the "fast" requirement: the
motion layer adds no runtime dependency and no main-thread animation loop.

Easing tokens, because the CSS built-ins are too weak:

```
--ease-out:      cubic-bezier(0.23, 1, 0.32, 1)
--ease-in-out:   cubic-bezier(0.77, 0, 0.175, 1)
--ease-drawer:   cubic-bezier(0.32, 0.72, 0, 1)
```

Durations: press 140ms, tooltip 150ms, dropdown 200ms, sheet 320ms, page reveal
420ms, reconciliation 900ms. Nothing in the interactive UI exceeds 320ms.

Rules, applied without exception:

- Only `transform` and `opacity` animate. Never `width`, `height`, `top`, `left`.
- `ease-in` is never used. Entering and exiting use `--ease-out`.
- Nothing entering starts from `scale(0)`. Minimum `scale(0.97)` with opacity.
- Popovers scale from `var(--transform-origin)`; modals stay centred.
- Hover motion is gated behind `@media (hover: hover) and (pointer: fine)`.
- **No animation on anything keyboard-initiated or high-frequency**: the header
  nav, the search filter controls, the make/model/generation pickers, tab
  changes. These are touched constantly and motion makes them feel slow.
- `prefers-reduced-motion` degrades to opacity only. It does not merely shorten
  durations, and it never removes the information the motion carried.

### The signature interaction

`Reconciliation` is one component used in two places, which is the whole point.

1. On the landing page it runs once on scroll-in: PARTS and LABOR figures count
   into place over 900ms, the total resolves, and the stamp lands with a 140ms
   `--ease-out` scale from 0.97 with a 2px blur that clears. Reduced motion
   shows the settled state with a 200ms opacity fade.
2. On `/experiences/new` the same component runs live as the owner types. The
   stamp lands only when parts + labour + tax equals the total they entered.
   That is a real validation, not a decoration, and it is the mechanism the
   landing page is claiming.

Scroll reveals use one IntersectionObserver, `once: true`, opacity plus 8px
translate, 60ms stagger. The current `Reveal` component's failure mode — 17
elements stuck at `opacity: 0` with JavaScript disabled, the top finding in the
last critique — is fixed by making the revealed state the CSS default and having
the observer remove a class rather than add one.

## 6. Per-route treatment

All 26 routes. Mode drives the treatment; expression never obscures task on an
Operate surface.

### Persuade

| Route | Treatment |
|---|---|
| `/` | Rebuilt to the FIRST VIEWPORT block. One record at document scale, no car-photo hero, primary action at the signature line. Scroll chapters retained as document sections but the snap is dropped; snap plus a long record fights the reader. Retires the four-CTA-for-two-destinations problem the critique found. |
| `/register`, `/login`, `/join/shop` | The document being opened. Ruled field rows, labels above, mono for codes. Google button first, as now. |
| `/shops/add`, `/shops/claim` | A submission form with its column heads visible before anything is filled in. |
| `/policies/*` | Read mode. Single measure, ruled section breaks, no cards. |

### Operate

| Route | Treatment |
|---|---|
| `/garage` | Service-history ledger. One ruled line per car, totals reconciling at the foot. Closest existing page to the target already. |
| `/vehicle/[id]` | That car's record: header block with generation and VIN, service lines, spend reconciliation. |
| `/search` | Ruled index left, map as a bound `Plate` right. Filters get no motion. **Largest single unit of work in the build:** the route is a thin wrapper over `app/discover.tsx` at 1,209 lines, which owns the filter bar, results panel, detail panel and all three glass surfaces. Sequenced last among Operate routes and treated as its own phase. |
| `/mechanics/[id]` | The shop's operations sheet: published rates as ruled lines, claim state as a `Tag`. |
| `/shops/[id]` | Owner console. Same sheet, editable, with subscription state as a stamped region. |
| `/experiences/[id]` | A filed record with the receipt `Tag` attached and the `RangeScale` showing where it sits. |
| `/experiences/new` | The filing form. Hosts the live `Reconciliation`. The most important screen in the product. |
| `/profile/[username]` | Currently 48 lines of grey boxes. Becomes an owner's index: their cars as ruled lines, filings count, no cards. |
| `/settings/security`, `/setup-2fa`, `/verify`, `/forgot-password`, `/reset-password` | Form document treatment, consistent field rows. |
| `/review`, `/admin`, `/admin/claims`, `/admin/verifications` | `Docket`. Dense ruled queues, mono IDs, stamp for approved. |
| `/garage/loading` | Skeleton in stock tone matching the ledger's rule positions. |
| `/not-found` | A form stamped VOID. |

Empty states across every Operate route use `BlankForm`. Given shops exist and
prices do not, these are load-bearing, not decoration.

## 7. Dependencies and budget

**No new runtime dependencies.** Two font families are added at build time and
self-hosted. No animation library, no component framework, no icon library
change. `lucide-react` is already a dependency and stays.

21st.dev is used as a **source**, never as a CDN. Its catalog is a shadcn
component registry, so its value here is narrower than a full visual world: the
project already hand-rolls its combobox, sheet, anchored menu and pickers, and
those stay. Components will be pulled and vendored into the repo only where a
21st implementation is genuinely better than what exists, evaluated per case at
build time against the ink system and the CSP. Anything vendored is rewritten to
the token system; nothing ships in default shadcn state.

Performance targets: LCP < 2.5s, INP < 200ms, CLS < 0.1. The current landing
serves a 331KB hero into roughly a 1049px slot; `sizes` is corrected. The
scroll-snap container is removed, which also removes its layout cost.

## 8. Accessibility contract

Unchanged and re-verified after the repaint:

- `tests/contrast.test.ts` extended with `stamp` and `bg-grouped` cases.
- 44px minimum on every control, including the footer policy links the critique
  found at 16px.
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`.
- State never carried by colour alone: `Stamp` and `Tag` carry shape and word.
- The `RangeScale` fix from the critique is preserved: the rule is
  `aria-hidden`, the two amounts are not, and the marker position is derived.
- Heading order, focus indicators and keyboard reachability re-checked per route.

## 9. Risks

1. **Cold reading.** A document world can feel bureaucratic, and cold suppresses
   signup. Mitigation: `Plate` gives photography a real structural home, and the
   reconciliation gives the landing a moment of genuine satisfaction. Audited at
   the finish review.
2. **Ruling precision.** If hairlines, column alignment and tabular figures are
   not exact, the whole thing reads as an unstyled table. This is the direction's
   named risk and it is mostly an execution problem, not a design one.
3. **Scope.** 26 routes plus a token rewrite plus a component rewrite is large,
   and roughly 2,300 lines of it sits in the map stack alone (`discover.tsx`,
   `mechanic-map.tsx`, `document-viewer.tsx`, `area-picker.tsx`,
   `anchored-menu.tsx`). The implementation plan sequences it so the site is
   never half-repainted: tokens and `ui.tsx` land first, then routes in
   dependency order, with the map stack as its own phase at the end.
4. **Copy.** Voice was released but not commissioned. Existing copy is preserved
   verbatim unless a specific string is broken; no speculative rewrite.

## 10. Exit condition

Per the direction contract: unreviewed and undocumented is unfinished. This
build ends with the finish review, the verdict, `DESIGN.md` written from the
built world, and every shipping raster carrying its provenance.

# A landing page that explains itself, and a light interior

**Status:** design, approved in chat 2026-08-30
**Supersedes:** the "hero treatments appear once" framing in
`2026-08-30-design-cleanup-plan.md`. That plan assumed the landing
composition was finished. It is not: a hero with nothing behind it is the
problem, not a hero applied too widely.

## The diagnosis, in the owner's words

- the dark scheme is murky
- the roads look procedurally generated, because they are
- the front page is bare: no scroll, no explanation, no vehicle
- the same background is on every page

The first plan addressed only the last point. The others are more important:
a visitor lands, sees a globe and a filter bar, and cannot tell what the site
is for.

## Decisions taken

| Decision | Choice |
|---|---|
| Hero | A car drives in, spins, wordmark and slogan arrive. Light background. |
| Globe | Deleted entirely. |
| Car asset | Pre-rendered sprite sequence, not WebGL. |
| Palette | Light hero and light interior; dark reserved for the map view. |
| Landing content | How it works, proof numbers, real reported prices, trust. |

**On the palette conflict.** The palette answer said "dark hero, light
interior"; the hero description said "light coloured background". The hero
description is the more specific intent and wins. Dark survives only where it
earns its place — behind a street map, where a dark basemap is genuinely
better.

## What gets deleted

The globe and everything built to serve it. This is roughly 1.2MB of assets
and ~950 lines of code and tests:

`components/globe.tsx`, `lib/map/globe-fit.ts`, `lib/map/descent.ts`,
`scripts/verify-globe-fit.mjs`, `scripts/generate-roads.mjs`,
`scripts/reproject-earth.mjs`, `public/roads.svg`, `public/earth-dark.jpg`,
`public/earth-dark-mercator.jpg`, `tests/globe-fit.test.ts`,
`tests/descent.test.ts`, and the globe-related rules in `app/globals.css`.

Deleting the descent means the map opens at street level for the searched
area rather than flying there. That is a simplification, not a loss: the
flight existed to justify the globe.

**The tile-cost argument survives the deletion.** The landing page made zero
tile requests because it drew a globe instead of a map. The new landing page
makes zero tile requests because it shows a car and some text. The map is
still only loaded when someone searches.

## Blocking input: the car

A sprite sequence has to be rendered from a source, and that source needs a
licence the project holds. This is the one thing that cannot start without
the owner:

1. **A licensed 3D model** (CGTrader, TurboSquid, Sketchfab) — check the
   licence permits rendering to 2D and commercial use.
2. **A real photoshoot on a turntable** — most authentic, most effort.
3. **A generic silhouette** commissioned or drawn — no licensing risk, less
   impact.

Nothing in Phase 2 can start until this lands. Everything else can.

## Phase 1 — Light theme

`app/globals.css` forces `color-scheme: dark` and the comment there states the
page has one appearance, never toggled. So this is not adding a light mode; it
is changing which single appearance exists, and then keeping dark as a scoped
exception for the map.

- Redefine the token block for light: surfaces, labels, separators, fills.
- Keep the green accent; it works on light and is the brand.
- The map view keeps dark tokens, scoped to that route.
- `.machined` needs re-tuning: alloy lit for a dark page reads as grey mush on
  a light one. Its gradient stops are built for a dark ground.
- Contrast: every pairing re-checked against 4.5:1. There is an existing
  `tests/contrast.test.ts` — it must be updated to the new palette and pass,
  not deleted.

**Verification:** the breakpoint audit at all six viewports, plus the contrast
suite.

## Phase 2 — The hero

- Render the spin once, offline, to 48 frames at three widths; ship WebP.
- Play: the car enters from the left, decelerates to centre, then rotates.
  Entrance is `cubic-bezier(0.23, 1, 0.32, 1)` over ~700ms; the spin is linear
  and continuous, because constant motion should not ease.
- The wordmark and slogan arrive after the car settles, 45ms apart.
- `prefers-reduced-motion`: no drive-in, no spin — one still frame, wordmark
  and slogan already in place.
- Total sprite budget: **under 400KB** at the largest size. Preload the first
  frame only; the rest load after first paint so they never block it.

Slogan candidates, to pick from rather than invent later:
- "Know what it should cost."
- "What your mechanic charged, from people who paid it."
- "Real prices, from real owners."

## Phase 3 — The rest of the page

Four sections, in this order, each earning the scroll:

1. **How it works** — report what you paid, see what others paid, find a fair
   shop. Three steps, illustrated with the product's own UI, not stock icons.
2. **Real reported prices** — a live sample of actual jobs: vehicle,
   service, what it cost, where. This is the most convincing thing the
   product owns and it is currently invisible to anyone not signed in.
3. **Proof numbers** — verified experiences, garages, vehicle generations.
   The reference art has this panel and the current build dropped it. Read
   from the database, not hardcoded.
4. **Trust** — owner-reported not quoted, receipts scanned then deleted,
   moderation. Answers "why should I believe this?"

Scroll motion: each section fades and rises 12px as it enters, once, via
`IntersectionObserver` with `{ once: true }`. 240ms, ease-out, 0 delay —
sections are far enough apart that a stagger between them would only feel
slow. Never re-animates on scroll back up.

## Phase 4 — Interior consistency

As in the superseded plan, and unchanged by any of the above: one `PageShell`,
`MACHINED` reserved for `primary`, cards leading with vehicle rather than shop
name, condensed numerals on prices.

## Sequencing

Phase 1 is independent and blocks the others, since everything is drawn on it.
Phase 3 can proceed in parallel with Phase 2 once Phase 1 lands, because the
sections do not depend on the hero. Phase 2 is blocked on the car asset.

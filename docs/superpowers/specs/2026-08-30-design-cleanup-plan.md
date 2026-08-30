# Making Gaari look like it is about cars

**Status:** plan, awaiting approval
**Date:** 2026-08-30

## The diagnosis

Two complaints, one root cause: **the landing page's hero treatment is applied
to the entire application.**

`app/globals.css` puts the road plane on `body`, so every page gets it. That
plane is a perspective projection with a vanishing point — a composition
designed to sit behind one specific object, the globe. On `/login` there is no
globe, so the perspective converges on nothing, and a two-field form floats in
front of what reads as a screensaver. The form occupies about a quarter of the
window; the rest is decoration that means nothing.

The same over-application happens in `components/ui.tsx`. `primary`,
`secondary` and `destructive` all carry `MACHINED`. Every button on the site is
milled aluminium, so the material stops signalling anything: a hero material
used everywhere is just a texture. Variant survives only as a coloured rim,
which is far too quiet to carry hierarchy.

**Nothing in the interior says "cars."** The only automotive signal anywhere is
the number-plate wordmark. The background is a blue-on-navy network that would
suit a crypto dashboard or a network-monitoring tool. Nothing in the type,
iconography, colour, or texture says garage, service, or vehicle — on a site
whose entire purpose is what a mechanic charged you.

## Three principles

1. **Hero treatments appear once.** The road plane and the machined alloy are
   for the landing view and for primary actions. Everywhere else earns
   attention by being quiet. This single change fixes most of what reads as
   "vibe coded", because "vibe coded" here means "every surface shouting".

2. **The automotive signal belongs in the substance, not the wallpaper.** Not
   more chrome and carbon fibre — that is the same mistake in a different
   costume. It belongs in what the product actually shows: the vehicle a job
   was done on, the service performed, what it cost. A page that leads with a
   generation badge and a service name reads automotive without a single
   texture.

3. **Motion explains, it does not perform.** Every animation answers "what
   changed?" Nothing animates that a person sees dozens of times a day.

## Phase 1 — Calm the surfaces

*The largest visible win, and almost entirely subtraction.*

- Move the road plane off `body` and onto the landing view only. Interior
  pages get a near-flat ground: the base colour, one very soft radial lift
  behind content, and nothing else.
- Reserve `MACHINED` for `primary`. `secondary` becomes a bordered surface
  button, `destructive` a tinted one. Hierarchy then reads at a glance
  instead of depending on a rim colour.
- Adopt one spacing rhythm for page shells: a single `PageShell` with a max
  width, consistent vertical padding, and a heading block. `/login`,
  `/register`, `/shops/add` and the policy pages currently each improvise.

**Test:** the breakpoint audit at all six viewports, plus a check that no
interior page paints `roads.svg`.

## Phase 2 — Make it read automotive

- **Type**: the condensed face already loaded (`--font-display`) goes on
  numbers that matter — prices, mileage, year ranges. Condensed numerals over
  a data table is the single strongest automotive cue available, and it costs
  nothing to ship because the font is already there.
- **The vehicle is the subject.** Every experience, shop card and search result
  leads with make / model / generation, styled as a plate-like badge reusing
  the wordmark's shape language at small size. Today they lead with a shop
  name and a distance, which could be any local-listings site.
- **Service iconography**: one consistent set for the service taxonomy (brakes,
  oil, tyres, diagnostics). Line icons, drawn to the same grid, used in the
  filter bar and on cards. This is what makes a list of jobs scannable *and*
  automotive at the same time.
- **Colour**: the green stays as the accent, but gains a warm signal colour for
  money — prices are the emotional centre of this product and currently render
  in the same grey as everything else.

## Phase 3 — Motion, applied by the framework

Each item below states its frequency, purpose, curve and duration, so the
decision is auditable rather than a matter of taste.

| What | Frequency | Purpose | Motion |
|---|---|---|---|
| Route change | Occasional | Explains that the page changed rather than reloaded | Content fades and rises 8px, 220ms, `cubic-bezier(0.23, 1, 0.32, 1)` |
| Search results arriving | Occasional | Distinguishes "new results" from "same list" | Stagger 45ms, capped at row 8, 200ms each |
| Any pressable | Constant | Feedback: confirms the press was heard | `scale(0.97)`, 140ms — no entrance animation, ever |
| Filter panel expand | Tens/day | Prevents a jarring reflow | Height + opacity, 200ms ease-out |
| Price reveal on a shop page | Rare | The payoff of the whole product | Count-up 400ms, once, `prefers-reduced-motion` shows the final value |
| Number-plate wordmark | First visit only | Delight, once | Subtle sheen sweep on first paint only, never on navigation |

**Explicitly not animated:** filter dropdowns, tab switches, the sort control,
anything keyboard-driven. These are used repeatedly, and animation there is
lag with extra steps.

## What this does not touch

The globe, the descent, and the landing composition are finished and are the
one place the hero treatment belongs. This plan is about everything behind
them.

## Sequencing

Phase 1 is independent and worth shipping alone — it is mostly deletion and
carries the biggest visible change. Phase 2 depends on Phase 1's `PageShell`.
Phase 3 depends on Phase 2's components existing, since several of the
animations attach to them.

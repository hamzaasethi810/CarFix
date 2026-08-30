# The job card, and the car

**Status:** design, approved in chat 2026-08-30
**Supersedes:** `2026-08-30-design-cleanup-plan.md` and
`2026-08-30-landing-and-light-theme.md`. Both are superseded in full.

## The decision that settles the rest

**The globe goes, on product grounds rather than taste.** It does not show
shops. No pin has ever been rendered on it. It is spectacle carrying no
information, sitting in the most valuable space on the site, and every second
a visitor spends on it is a second not spent learning what Gaari is.

That argument also retires the descent, whose entire job was to justify the
globe by flying you off it.

**The tile-cost argument survives.** The landing page cost zero tile requests
because it drew a globe instead of a map. It will now cost zero because it
shows a car, some cards, and text. The map still loads only on search.

## The governing object: a workshop job card

Skeuomorphism fails when it is textures without an object — which is what the
site has now: machined buttons, a plate logo, glass panels and a road plane,
four materials with no relationship. It works when the interface *is* a
specific thing and every material serves it.

Gaari's core record already is a physical object: a service job card. Vehicle,
work done, who did it, what it cost.

Four rules, and they are the whole system:

| Rule | Here |
|---|---|
| One governing object | The job card |
| One light source | Above and slightly left. Top edges catch light, shadows fall down, always |
| Materials have jobs | Card stock = read. Metal = grip. Ink = attest. Green = act |
| Depth is earned | Cards lift ~1px; pressables press *in* on `:active` |

Metal appears **once per component**, doing a metal job — the clip on a card,
never as a page-wide texture and never as the face of every button. That
single change is most of what currently reads as "vibe coded".

## Palette: warm light, designed light

A light spike was tried by swapping tokens on the existing dark page and
looked bad: the glass filter bar became a grey slab, the machined buttons
disappeared into a near-metal ground, and the globe kept a heavy black rim
built for near-black. **That is evidence a token swap is not a theme, not
evidence against light.** The job-card mock is also light and reads well,
because it was designed light.

- Ground: warm paper (`#EFEAE0`-ish), not white. Clinical white is what makes
  light UIs read as a settings screen.
- Cards: near-white with a real edge and a soft shadow.
- One accent (the existing green), one attest colour (stamp red), and nothing
  else.
- Contrast: `tests/contrast.test.ts` must be updated to the new palette and
  **passing**, not deleted.

## The hero: a car

Pre-rendered sprite sequence, not WebGL. It drives in from the left,
decelerates to centre, then turns slowly. Wordmark and slogan arrive after it
settles.

- Entrance `cubic-bezier(0.23, 1, 0.32, 1)`, ~700ms. The rotation is linear,
  because constant motion should not ease.
- Wordmark then slogan, 45ms apart.
- `prefers-reduced-motion`: one still frame, text already in place.
- **Budget: under 400KB** for the largest size. First frame preloaded, the
  rest after first paint so they never block it.

**Blocking input — the car asset.** A sprite has to be rendered from
something, and that something needs a licence the project holds: a purchased
3D model, a turntable shoot, or a commissioned silhouette. Nothing else in
this plan is blocked.

## The page

1. **Hero** — car, wordmark, slogan, one action.
2. **How it works** — report what you paid, see what others paid, find a fair
   shop. Illustrated with real job cards, not stock icons.
3. **Real reported prices** — live sample of actual jobs. The most convincing
   thing the product owns, and currently invisible to signed-out visitors.
4. **Proof numbers** — experiences, garages, generations. From the database.
5. **Trust** — owner-reported not quoted, receipts scanned then deleted,
   moderation.

Scroll motion: sections fade and rise 12px on entry, once, `IntersectionObserver`
with `{ once: true }`, 240ms ease-out. Never re-animates on scroll back.

## Deletions

`components/globe.tsx`, `lib/map/globe-fit.ts`, `lib/map/descent.ts`,
`scripts/verify-globe-fit.mjs`, `scripts/generate-roads.mjs`,
`scripts/reproject-earth.mjs`, `public/roads.svg`, `public/earth-dark*.jpg`,
`tests/globe-fit.test.ts`, `tests/descent.test.ts`, and the globe and road
rules in `app/globals.css`. Roughly 1.2MB of assets and ~950 lines.

## Sequencing

1. **Theme and the card component.** Warm light tokens, the `JobCard`, metal
   demoted to controls. Unblocked, and the largest visible change.
2. **Page sections.** Depends on the card. Unblocked by the car.
3. **Hero.** Blocked on the car asset.
4. **Delete the globe.** Last, so the landing page is never without a hero.

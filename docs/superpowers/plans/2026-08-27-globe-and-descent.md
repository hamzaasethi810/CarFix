# Globe and Descent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Leaflet map with a MapLibre GL globe that a visitor descends from orbit into their own city, at a tile cost the free tier can absorb.

**Architecture:** Leaflet cannot do globe projection, so the first task is a library migration — MapLibre GL, carrying the marker clustering, the area-select control and the pin interactions with it. The globe then sits on the existing textured ground with a grounding shadow, and **Nearby** flies the camera down over a static NASA texture, touching street tiles only in the last second of the descent.

**Tech Stack:** MapLibre GL JS, Next.js 16 App Router, Tailwind v4, Vitest, puppeteer-core.

**Spec:** `docs/superpowers/specs/2026-08-26-gaari-globe-redesign-design.md` — Part 2 (The landing), plus the tile-budget guardrail and the globe-grounding requirement in Part 3.

**This is plan 2 of 3.** Materials is done. Motion — the arrival stagger, the shop popout and the responsive rails — follows this one.

## Global Constraints

- **The descent must never stream through zoom levels.** A naive `flyTo` from orbit requests 200–400 tiles. MapTiler's free tier is 100,000 requests a month and **service pauses until the 1st** when exhausted. The whole descent happens over the static NASA texture; street tiles load only once the camera has arrived. Budget 20–30 tiles per visit.
- **The tile source is one config value**, so it can be switched without touching component code. MapTiler is the default when a key is present; OpenFreeMap is the fallback, used both when there is no key and when MapTiler stops serving. Neither is hardcoded at a call site.
- **Running out of tiles must degrade, not break.** MapTiler pauses service when the monthly quota is spent. The map must notice and fall back to OpenFreeMap by itself rather than going blank — a blank map on the landing page is the worst possible failure, and it would arrive silently on the 1st of a busy month.
- **The map style must be dark.** The ground is `#0E1F16` with a brushed texture; light raster tiles fight it and reduce the redesign to a header strip on the one page every visitor sees first.
- **The globe must sit in the scene, not on it.** It carries a grounding shadow — ambient occlusion pooling beneath it, darkest at contact — rendered behind the globe element on the page, not drawn into the tile. Squint: globe and ground should read as one photograph.
- **Usability is not traded for looks.** Every interactive target at least 44pt, keyboard focus always visible, body text at WCAG AA. `tests/contrast.test.ts` enforces the last of these.
- **No bubbles.** Radii stay at the tokens set in Materials: card 10px, control 6px, glass 12px.
- **Guardrails from the spec, all of which are requirements, not niceties:** `prefers-reduced-motion` disables the descent; a slow connection skips the globe and lands on the map; a returning visitor goes straight to their remembered area rather than watching a cinematic on their fourth price check.
- All existing tests must keep passing. Baseline is **305 passed, 1 skipped** — the skip is a pre-existing conditional OCR test.

---

### Task 1: Migrate the map from Leaflet to MapLibre GL

**Files:**
- Modify: `components/mechanic-map.tsx` (170 lines, the whole Leaflet wrapper)
- Modify: `package.json` (drop `leaflet`, `leaflet.markercluster` and their types; add `maplibre-gl`)
- Create: `lib/map/style.ts`
- Modify: `lib/env.ts` (optional MapTiler key)
- Modify: `.env.example`
- Test: `tests/map-style.test.ts`

**Interfaces:**
- Produces: `mapStyleUrl(): string` from `lib/map/style.ts` — the single config value the whole app reads for its tile source.

This task changes the library and nothing else. The globe comes next; at the end of this task the map still looks and behaves as it does today, only rendered by MapLibre.

- [ ] **Step 1: Write the failing test**

Create `tests/map-style.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fallbackStyleUrl, isQuotaFailure, mapStyleUrl } from "../lib/map/style";

describe("mapStyleUrl", () => {
  it("falls back to a keyless source when no MapTiler key is set", () => {
    expect(mapStyleUrl(undefined)).toContain("openfreemap");
  });

  it("uses MapTiler when a key is present", () => {
    const url = mapStyleUrl("abc123");
    expect(url).toContain("maptiler");
    expect(url).toContain("abc123");
  });

  it("only treats payment and rate-limit failures as quota exhaustion", () => {
    // A 404 or a one-off network blip must not discard a working paid source
    // for the rest of the session.
    expect(isQuotaFailure(402)).toBe(true);
    expect(isQuotaFailure(429)).toBe(true);
    for (const status of [200, 404, 500, 503]) {
      expect(isQuotaFailure(status), String(status)).toBe(false);
    }
  });

  it("falls back to a keyless source", () => {
    expect(fallbackStyleUrl()).toContain("openfreemap");
  });

  it("asks for a dark style either way", () => {
    /*
      The ground is near-black forest green; a light basemap fights it and
      reduces the redesign to a header strip. Assert "dark" specifically —
      an earlier draft of this plan allowed "positron", which is CARTO's
      LIGHT theme, so the test would have passed the exact bug it exists
      to prevent.
    */
    expect(mapStyleUrl(undefined).toLowerCase()).toContain("dark");
    expect(mapStyleUrl("abc123").toLowerCase()).toContain("dark");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/map-style.test.ts`
Expected: FAIL — `lib/map/style` does not resolve.

- [ ] **Step 3: Write the style resolver**

Create `lib/map/style.ts`:

```ts
/*
  Where the map's tiles come from — one value, so the source can be swapped
  without touching a component.

  MapTiler is the preferred source and needs a key. OpenFreeMap needs none and
  is the fallback, so the site works for anyone who clones it without an
  account. It runs on donated infrastructure with no uptime guarantee, which is
  acceptable as a fallback and not as the default.

  Both are dark. A light basemap on this ground reduces the whole redesign to a
  header strip.
*/

// Verified 200 on 2026-08-27. Note: their "positron" style is LIGHT — not this one.
const OPENFREEMAP_DARK = "https://tiles.openfreemap.org/styles/dark";

export function mapStyleUrl(maptilerKey: string | undefined): string {
  if (!maptilerKey) return OPENFREEMAP_DARK;
  return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${maptilerKey}`;
}

/** The source to use once MapTiler has stopped serving. Always keyless. */
export function fallbackStyleUrl(): string {
  return OPENFREEMAP_DARK;
}

/*
  Whether a tile failure means "MapTiler is out" rather than "one tile
  glitched". 402 is payment required and 429 is rate limited; both mean the
  quota is spent and every subsequent request will fail the same way. A 404 or
  a network blip is not that, and must not throw away a working paid source.
*/
export function isQuotaFailure(status: number): boolean {
  return status === 402 || status === 429;
}
```

- [ ] **Step 4: Add the optional key**

In `lib/env.ts`, add `NEXT_PUBLIC_MAPTILER_KEY` as an **optional** string. It is
`NEXT_PUBLIC_` because the browser makes the tile requests. A MapTiler key is
domain-restricted rather than secret, but say so in a comment — the next reader
will otherwise assume it leaked by mistake.

Add it to `.env.example` with a comment noting the site works without it.

- [ ] **Step 5: Fall back when MapTiler stops serving**

In `components/mechanic-map.tsx`, listen for MapLibre's `error` event. When a
tile request fails with a status `isQuotaFailure` recognises, switch the map to
`fallbackStyleUrl()` and remember the switch for the rest of the session
(`sessionStorage`) so every subsequent tile does not retry the dead source
first.

Three things to get right:

- **Switch once.** A quota failure produces one error per tile in flight, so
  guard the swap or it will fire a dozen times.
- **Do not persist forever.** The quota resets on the 1st. `sessionStorage`
  forgets when the tab closes, which is the right lifetime — `localStorage`
  would keep a visitor on the fallback for weeks after service resumed.
- **Say nothing to the visitor.** This is an operational event, not a user
  error. The map keeps working and looks the same; a toast explaining a billing
  limit helps nobody.

- [ ] **Step 6: Rewrite the map component**

Rewrite `components/mechanic-map.tsx` on MapLibre GL. Keep its existing props
and exported types **exactly** — `app/discover.tsx` is 1066 lines and consumes
this component; changing its interface turns a library swap into a rewrite of
the page.

What must survive the migration:

- marker clustering (MapLibre does this natively with a GeoJSON source and
  `cluster: true`, so `leaflet.markercluster` goes rather than being replaced)
- the pin click behaviour and whatever the current component emits upward
- the area-select interaction
- attribution, which is a licence requirement, not a decoration

Read the existing file first and enumerate every behaviour before you delete it.

- [ ] **Step 7: Remove Leaflet**

```bash
npm uninstall leaflet leaflet.markercluster @types/leaflet @types/leaflet.markercluster
npm install maplibre-gl
grep -rn "leaflet" app components lib   # must return nothing
```

The last command is the check. A leftover `leaflet/dist/leaflet.css` import
will not fail the build but will ship dead CSS.

- [ ] **Step 8: Verify it still works**

```bash
npm run dev
node scripts/screenshot-pages.mjs
```

Open the shots. The map must render, pins must cluster, and the audit must
report no console errors. Compare against the current behaviour — this task is
a migration, so anything that worked before and does not now is a regression.

- [ ] **Step 9: Commit**

```bash
git add components/mechanic-map.tsx lib/map/style.ts lib/env.ts .env.example \
  package.json package-lock.json tests/map-style.test.ts
git commit -m "Move the map from Leaflet to MapLibre GL"
```

---

### Task 2: The globe

**Files:**
- Create: `components/globe.tsx`
- Create: `public/earth-dark.jpg` (NASA Blue Marble, downloaded)
- Modify: `app/globals.css` (the grounding shadow)

**Interfaces:**
- Consumes: `mapStyleUrl` (Task 1).
- Produces: `<Globe onNearby={() => void} />` — the landing view.

- [ ] **Step 1: Get the texture**

NASA's Blue Marble imagery is public domain. Fetch a night-lights or dark
variant sized for the web — 2048px wide is enough for a globe that occupies at
most half the viewport, and 8192px is a 12MB download nobody should wait for.

Record where you got it and its licence in a comment in `components/globe.tsx`.
Public domain still deserves attribution.

- [ ] **Step 2: Build the globe**

Create `components/globe.tsx`: a MapLibre map with `projection: "globe"`, the
NASA texture as a raster source, no interactivity beyond drag-to-spin with
momentum, and no street tiles at all. This view must make **zero** requests to
MapTiler or OpenFreeMap — verify in the network tab, not by reading the code.

Over it: the wordmark and one control, **Nearby**. No filter bar, no cards.

- [ ] **Step 3: Ground it**

The globe must not read as a sticker on a flat page. In `app/globals.css`:

```css
/*
  What stops the globe reading as a sticker. A photoreal sphere on a flat page
  has no relationship to the surface behind it; the shadow gives it one. It
  belongs to the page rather than the map canvas, so it sits behind the globe
  element and does not scale with the projection.
*/
.globe-ground {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0.28) 45%,
    rgba(0, 0, 0, 0) 72%
  );
}
```

Size and position it so the darkest part pools just beneath the sphere and
falls off outward. Add a faint rim light on the lit edge.

Then squint at it. The globe and the ground should read as one photograph. If
the sphere still looks pasted on, the shadow is too tight or too faint — widen
it before moving on. This is the check the user asked for by name.

- [ ] **Step 4: Verify the tile cost**

```bash
npm run dev
```

Load the landing page with the network tab filtered to the tile host. Expected:
**zero** requests. If the globe is streaming tiles, the descent will too, and
the month's budget goes in an afternoon.

- [ ] **Step 5: Commit**

```bash
git add components/globe.tsx public/earth-dark.jpg app/globals.css
git commit -m "A globe that sits on the ground rather than on top of it"
```

---

### Task 3: The descent

**Files:**
- Modify: `components/globe.tsx`
- Create: `lib/map/descent.ts`
- Test: `tests/descent.test.ts`

**Interfaces:**
- Produces: `descentPlan(from, to)` — the camera keyframes, as a pure function so the tile behaviour can be tested without a browser.

- [ ] **Step 1: Write the failing test**

The property that matters is testable without rendering anything: the descent
must not linger in the zoom levels that trigger tile loads.

Create `tests/descent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { descentPlan, STREET_ZOOM_FLOOR } from "../lib/map/descent";

describe("descentPlan", () => {
  const plan = descentPlan({ lat: 38.88, lng: -77.09, zoom: 12 });

  it("arrives at the zoom it was asked for", () => {
    expect(plan.at(-1)!.zoom).toBe(12);
  });

  it("stays above the street-tile floor until the final leg", () => {
    // This is the whole cost argument. Every intermediate keyframe that sits
    // below the floor is a band of tiles the browser will request on the way
    // down, and there are 200-400 of them across a naive flight.
    for (const step of plan.slice(0, -1)) {
      expect(step.zoom, `intermediate zoom ${step.zoom}`).toBeLessThan(STREET_ZOOM_FLOOR);
    }
  });

  it("descends monotonically, so the camera never doubles back", () => {
    const zooms = plan.map((s) => s.zoom);
    expect([...zooms].sort((a, b) => a - b)).toEqual(zooms);
  });

  it("keeps the flight short enough to sit through", () => {
    const total = plan.reduce((n, s) => n + s.durationMs, 0);
    expect(total).toBeLessThanOrEqual(4000);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/descent.test.ts`
Expected: FAIL — `lib/map/descent` does not resolve.

- [ ] **Step 3: Write the descent**

Create `lib/map/descent.ts`. Export `STREET_ZOOM_FLOOR` — the zoom below which
the basemap starts requesting street tiles — and `descentPlan`, which returns
keyframes:

```ts
export type DescentStep = { lat: number; lng: number; zoom: number; durationMs: number };
```

The camera crosses the world at orbital zoom, arrives above the target, and
only then drops through the street levels in a single final leg. The street
source is added to the map when that last leg begins, not before.

Do not reach for a naive `flyTo` from z0 to z12. That interpolates through
every intermediate zoom with tiles attached, which is exactly the 200-400
request flight this plan exists to avoid.

- [ ] **Step 4: Wire Nearby**

`Nearby` asks for geolocation. Granted, it flies to the visitor's city. Refused,
the globe stays and the area picker opens instead; naming a town flies there
the same way.

Under `prefers-reduced-motion`, there is no flight: the map simply arrives.

- [ ] **Step 5: Measure the real tile count**

Run the descent with the network tab open and count requests to the tile host.
Expected: 20–30. Report the actual number.

If it is in the hundreds, the descent is streaming and Step 3 is wrong — fix it
rather than accepting the number.

- [ ] **Step 6: Commit**

```bash
git add lib/map/descent.ts tests/descent.test.ts components/globe.tsx
git commit -m "Fly down over the texture rather than through the tiles"
```

---

### Task 4: The lock, and the guardrails

**Files:**
- Modify: `components/globe.tsx`, `app/discover.tsx`
- Create: `lib/map/should-show-globe.ts`
- Test: `tests/should-show-globe.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/should-show-globe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shouldShowGlobe } from "../lib/map/should-show-globe";

const base = { firstVisit: true, saveData: false, effectiveType: "4g", reducedMotion: false };

describe("shouldShowGlobe", () => {
  it("shows the globe to a first-time visitor on a good connection", () => {
    expect(shouldShowGlobe(base)).toEqual({ globe: true, descend: true });
  });

  it("sends a returning visitor straight to their area", () => {
    // Nobody wants a cinematic on their fourth price check.
    expect(shouldShowGlobe({ ...base, firstVisit: false }).globe).toBe(false);
  });

  it("skips the globe on a slow connection", () => {
    for (const effectiveType of ["slow-2g", "2g"]) {
      expect(shouldShowGlobe({ ...base, effectiveType }).globe, effectiveType).toBe(false);
    }
  });

  it("skips the globe when the visitor asked to save data", () => {
    expect(shouldShowGlobe({ ...base, saveData: true }).globe).toBe(false);
  });

  it("keeps the globe but drops the flight under reduced motion", () => {
    // The guardrail is about motion, not about hiding things: nothing
    // becomes unreachable, it simply appears.
    expect(shouldShowGlobe({ ...base, reducedMotion: true })).toEqual({
      globe: true,
      descend: false,
    });
  });

  it("treats an unknown connection as good rather than assuming the worst", () => {
    // navigator.connection is absent in Safari; defaulting to "slow" there
    // would deny the globe to every iPhone visitor.
    expect(shouldShowGlobe({ ...base, effectiveType: undefined }).globe).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/should-show-globe.test.ts`
Expected: FAIL — `lib/map/should-show-globe` does not resolve.

- [ ] **Step 3: Implement it**

Create `lib/map/should-show-globe.ts` as a pure function taking the shape the
test uses and returning `{ globe: boolean; descend: boolean }`. Keep it pure —
the caller reads `navigator.connection`, `matchMedia` and the stored last area,
so the decision itself stays testable without a browser.

Note the two cases the tests pin down, because both are easy to get backwards:
reduced motion keeps the globe and drops only the flight, and an unknown
connection counts as good rather than as slow.

- [ ] **Step 4: Lock the map on arrival**

Bound the map to the searched radius. Panning rubber-bands at the edge rather
than stopping dead. Moving elsewhere goes through Nearby or the area picker,
which re-centres and re-locks.

This is a cost control as much as an interaction: an unbounded map lets one
curious visitor drag across the country and spend the month's tiles.

- [ ] **Step 5: Remove the zoom buttons**

The `+`/`−` controls go, as the user asked. They are also the only remaining
sub-44px targets the screenshot audit reports, so
`node scripts/screenshot-pages.mjs` should come back completely clean after
this — that is the check.

- [ ] **Step 6: Verify every guardrail in a browser**

Each of these is a real check, not a code read:

- throttle the network to Slow 3G and confirm the globe is skipped
- set `prefers-reduced-motion: reduce` and confirm arrival is instant
- load twice and confirm the second visit skips the cinematic
- drag hard at the boundary and confirm it rubber-bands rather than escaping

- [ ] **Step 7: Commit**

---

### Task 5: The whole thing, at every breakpoint

**Files:**
- Modify: `scripts/screenshot-pages.mjs` (capture the globe state too)

- [ ] **Step 1: Extend the capture**

The script currently captures the landing page after it settles. Add a capture
of the globe before any interaction, and one after a descent, so both states
are reviewed at all four viewports.

- [ ] **Step 2: Run it and look at the shots**

```bash
npm run dev
node scripts/screenshot-pages.mjs
```

The audit must report zero problems. Then open the PNGs and check:

- the globe is centred and reads as sitting on the ground, not on top of it
- nothing is clipped at 844×390, the landscape phone that has broken this site
  twice
- the dark basemap sits with the ground rather than fighting it
- no control is unreachable at any size

- [ ] **Step 3: Fix what the shots show, then commit**

Expect to find things. Say in your report which issues the screenshots caught —
that is the evidence this task did its job.

# Match the Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing page match `gaari_inspo.png` — a larger centred globe over a straight-segment road network lit blue, with green light bloom scattered behind it — and clear two loose ends: a wrench favicon and a database SSL warning.

**Architecture:** The road generator is rewritten around straight segments meeting at shared junctions, with the green moved off the lines and into separate bloom patches behind them. Everything else is a targeted change: globe sizing, button spacing, favicon, and a connection-string normaliser.

**Tech Stack:** SVG generation in Node, Tailwind v4, Next.js 16 App Router, `@prisma/adapter-pg`, Vitest, puppeteer-core.

**Spec:** `gaari_inspo.png` in the repository root is the reference, and it is the authority for every visual question in this plan. Read it before starting. `docs/superpowers/specs/2026-08-26-gaari-globe-redesign-design.md` still governs behaviour (tile budget, guardrails, materials).

## What the reference actually shows

Written down because "make it look like the image" is not a specification, and three previous attempts at the roads each failed on a different one of these:

- **Segments are straight.** Junction to junction, dead straight, no bow. The current generator bows every link, which is what makes it read as contour lines.
- **Junctions are shared.** Segments terminate on common points and enclose irregular cells of widely varying size — small dense clusters, then large open ground.
- **The lines are BLUE**, roughly `#4a90c2` to `#7fc4e8`, thin and glowing.
- **The green is not on the lines.** It comes from soft, diffuse bloom patches lying *behind* the network, like light pollution over towns. The current generator has this backwards: green lines, no bloom.
- **Bright points sit at some junctions**, small and near-white.
- **The plane recedes.** Perspective toward a horizon near the top, which the current generator already does correctly and must keep.
- **No pin.** The reference has a green location pin with pulsing rings on the
  globe. The user has asked for it to be left out — and none was ever built, so
  this is a thing NOT to add rather than a thing to remove. Do not go looking
  for one to delete.

## Global Constraints

- The landing view must continue to make **zero** MapTiler or OpenFreeMap tile requests. Verify by counting network requests in a browser, not by reading code.
- Roads are generated, never fetched — real road data on the landing page would break the zero-request rule.
- The road SVG is committed, and the generator is deterministic from a fixed seed so the file does not churn in diffs.
- Usability is not traded for looks: every interactive target at least 44pt, keyboard focus always visible, body text at WCAG AA. `tests/contrast.test.ts` enforces the last of these.
- No bubbles. Radii stay at card 10px, control 6px, glass 12px.
- All existing tests must keep passing. Baseline is **321 passed, 1 skipped** — the skip is a pre-existing conditional OCR test.
- `node scripts/screenshot-pages.mjs` must finish clean: no horizontal overflow, no undersized targets, no console errors.

---

### Task 1: Roads as straight segments with shared junctions

**Files:**
- Modify: `scripts/generate-roads.mjs`
- Modify: `public/roads.svg` (regenerated output, committed)

**Interfaces:**
- Produces: `public/roads.svg` — consumed by `body`'s `background-image` in `app/globals.css`. The file name and dimensions (1600×1000 viewBox) must not change, or that rule needs updating too.

- [ ] **Step 1: Straighten the segments**

In `scripts/generate-roads.mjs`, the `link` function currently emits a quadratic
curve. Replace its body so a road is a straight line between two junctions:

```js
function link(a, b, big) {
  const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  (big ? arterial : local).push(d);
}
```

Delete the `mx`/`my` control-point lines entirely. The bow was added to stop an
earlier version looking like a wireframe; with perspective and varied cell sizes
doing that job, it is now the thing making the network read as contour lines
rather than streets.

- [ ] **Step 2: Vary the cell sizes**

A uniform grid gives uniform cells. The reference has dense clusters against
open ground. After the `grid` is built and before the links are drawn, pull a
handful of junctions toward nearby "town centres" so density varies:

```js
/*
  Towns. Without these the grid is evenly dense everywhere, which reads as
  graph paper however much each point is jittered — the reference's character
  comes from tight clusters separated by open ground.
*/
const TOWNS = 14;
const towns = Array.from({ length: TOWNS }, () => ({
  x: rand() * W,
  y: HORIZON + rand() * (H - HORIZON),
  pull: 0.25 + rand() * 0.45,
  reach: 90 + rand() * 190,
}));

for (const row of grid) {
  for (const p of row) {
    for (const t of towns) {
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > t.reach || d === 0) continue;
      // Falls off with distance, so a town tugs its own streets tight and
      // leaves the ground between towns open.
      const k = (1 - d / t.reach) * t.pull;
      p.x += dx * k;
      p.y += dy * k;
    }
  }
}
```

- [ ] **Step 3: Turn the lines blue and move the green off them**

Change the stroke colours so the network is lit blue, matching the reference:

```js
${local.map((d) => `    <path d="${d}" stroke="#4a90c2" stroke-opacity="0.30" stroke-width="0.4"/>`).join("\n")}
```

```js
${arterial.map((d) => `    <path d="${d}" stroke="#7fc4e8" stroke-opacity="0.5" stroke-width="0.8"/>`).join("\n")}
```

And the junction glow, which stays cool and near-white:

```js
<stop offset="0%" stop-color="#bfe8ff" stop-opacity="0.9"/>
<stop offset="100%" stop-color="#bfe8ff" stop-opacity="0"/>
```

- [ ] **Step 4: Add the green bloom behind the network**

This is where the green comes from. Add before the road groups so it paints
underneath, and define its gradient alongside the existing `hub` one:

```js
<radialGradient id="bloom">
  <stop offset="0%" stop-color="#3ddc84" stop-opacity="0.22"/>
  <stop offset="60%" stop-color="#2aa862" stop-opacity="0.07"/>
  <stop offset="100%" stop-color="#1c7a46" stop-opacity="0"/>
</radialGradient>
```

```js
${towns.map((t) => `  <ellipse cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" rx="${(t.reach * 1.5).toFixed(0)}" ry="${(t.reach * 0.55).toFixed(0)}" fill="url(#bloom)"/>`).join("\n")}
```

Ellipses rather than circles, wider than tall, because the ground is seen in
perspective and a circular pool of light on that plane projects as an ellipse.

- [ ] **Step 5: Regenerate and look at it**

```bash
node scripts/generate-roads.mjs
npm run dev
```

Screenshot the landing page and open the PNG. Check against
`gaari_inspo.png` side by side:

- segments are straight, and meet at shared points
- cells vary from tight clusters to open ground
- the lines are blue and the green is a soft glow behind them, not on them
- the plane still recedes toward a horizon near the top

If the bloom reads as green fog rather than distinct patches, lower its
opacity before widening it — an even wash is what the old flat background
already looked like.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-roads.mjs public/roads.svg
git commit -m "Straight roads, shared junctions, and green bloom behind them"
```

---

### Task 2: A larger globe, higher up, with the buttons spaced

**Files:**
- Modify: `app/globals.css` (`.globe-stage`)
- Modify: `components/globe.tsx` (button row, stage alignment)

- [ ] **Step 1: Grow the globe**

In `app/globals.css`, `.globe-stage` is `min(38vmin, 480px)`. The reference's
sphere is noticeably larger relative to the frame. Raise it:

```css
  width: min(52vmin, 620px);
```

The comment above that rule explains why the value is capped by `vmin` rather
than a viewport width — a landscape phone is only 390px tall. Leave that
reasoning in place and update the number it quotes.

- [ ] **Step 2: Check the landscape phone immediately**

That constraint has broken this page twice. Before going further:

```bash
node scripts/screenshot-pages.mjs
```

Open `tmp/shots/home-phone-landscape.png`. The globe must not touch the
buttons above it or the filter bar below it at 844×390. If it does, step the
`vmin` figure down until it clears both — the cap exists for exactly this.

- [ ] **Step 3: Lift it toward the middle**

The globe is centred in a box that runs from under the header to the bottom of
the window, so with the filter bar occupying the lower third it sits visually
low. In `components/globe.tsx` the stage's wrapper centres it:

```tsx
      <div className="absolute inset-0 flex items-center justify-center p-4">
```

Give it a bottom bias so the optical centre lands above the bar rather than
behind it:

```tsx
      {/*
        Biased upward, not centred.

        The stage box runs the full height under the header, but the bottom
        third of that is the filter bar. Centring in the box puts the globe
        low, half of it behind the panel; the padding lifts the optical centre
        into the space that is actually visible. Kept as padding rather than a
        translate so it still shrinks correctly at short viewports.
      */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pb-32 sm:pb-40">
```

- [ ] **Step 4: Space the two buttons**

In `components/globe.tsx` the row uses `gap-3`. Widen it so the two actions
read as separate choices rather than a segmented control:

```tsx
<div className="absolute top-0 inset-x-0 pt-6 sm:pt-10 flex justify-center gap-6 sm:gap-10 pointer-events-none">
```

- [ ] **Step 5: Verify and commit**

Re-run the breakpoint audit before committing — Steps 1 and 3 both change how
much vertical room the globe takes, and 844×390 is where that goes wrong.

```bash
npx vitest run && npx tsc --noEmit && npm run lint
node scripts/screenshot-pages.mjs
git add app/globals.css components/globe.tsx
git commit -m "A larger globe, lifted off the filter bar, with room between the actions"
```

---

### Task 3: A wrench favicon, and none in the filter bar

**Files:**
- Create: `app/icon.tsx`
- Delete: `app/icon.svg`
- Modify: `app/discover.tsx` (remove the `WrenchMark` from the filter bar)

**Interfaces:**
- Consumes: `WrenchMark` from `components/wrench-mark.tsx` stays in the codebase; only the filter-bar usage goes.

- [ ] **Step 1: Replace the icon**

Next.js generates a favicon from `app/icon.tsx`. Delete `app/icon.svg` and
create `app/icon.tsx`:

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/*
  The tab icon: the same diagonal wrench as the mark, redrawn flat.

  Not the WrenchMark component itself — that carries gradients and inset
  highlights that vanish at 32px and only muddy the silhouette. At favicon
  size the only thing that survives is shape, so this is one solid colour on
  the site's ground.
*/
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050A14",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 64 64">
          <g transform="rotate(-38 32 32)" fill="#dfe4e1">
            <rect x="27.5" y="13" width="9" height="37" rx="4.5" />
            <path d="M21.5 15 L21.5 6.5 L26.5 3 L26.5 11.5 L37.5 11.5 L37.5 3 L42.5 6.5 L42.5 15 C42.5 19.8 38.5 22.5 32 22.5 C25.5 22.5 21.5 19.8 21.5 15 Z" />
            <circle cx="32" cy="49.5" r="11" />
            <circle cx="32" cy="49.5" r="5.4" fill="#050A14" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 2: Take the wrench out of the filter bar**

In `app/discover.tsx`, the drag-handle row carries a `<WrenchMark />`. Remove
the icon and restore the row to the handle alone:

```tsx
              {/* Says the panel moves, and gives the thumb something to aim at. */}
              <div className="col-span-2 lg:col-span-5 -mt-1 mb-0.5 flex justify-center">
                <span aria-hidden="true" className="h-1 w-9 rounded-control bg-white/15" />
              </div>
```

Then remove the now-unused `WrenchMark` import from that file. `npm run lint`
will tell you if you miss it.

- [ ] **Step 3: Verify the tab icon renders**

```bash
npm run dev
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3000/icon
```

Expected: `200 image/png`. A 404 means the file is misnamed; Next.js is strict
that it must be `app/icon.tsx`.

- [ ] **Step 4: Commit**

```bash
git add app/icon.tsx app/discover.tsx
git rm app/icon.svg
git commit -m "A wrench in the tab, and none in the filter bar"
```

---

### Task 4: Keep the strong SSL mode explicitly

**Files:**
- Create: `lib/db-url.ts`
- Test: `tests/db-url.test.ts`
- Modify: `lib/db.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `withStrictSsl(url: string): string`

The driver warns:

> The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for
> 'verify-full'. In the next major version these modes will adopt standard libpq
> semantics, which have weaker security guarantees.

So the connection is verified today and would **silently stop being verified**
on a routine dependency bump. Fixing it in code rather than in one `.env` file
matters because production's URL comes from Neon's integration, where nobody
here chose the `sslmode` at all.

- [ ] **Step 1: Write the failing test**

Create `tests/db-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { withStrictSsl } from "../lib/db-url";

describe("withStrictSsl", () => {
  it("upgrades the modes pg is about to weaken", () => {
    for (const weak of ["require", "prefer", "verify-ca"]) {
      const out = withStrictSsl(`postgres://u:p@h/db?sslmode=${weak}`);
      expect(out, weak).toContain("sslmode=verify-full");
      expect(out, weak).not.toContain(`sslmode=${weak}`);
    }
  });

  it("leaves an already-strict URL alone", () => {
    const url = "postgres://u:p@h/db?sslmode=verify-full";
    expect(withStrictSsl(url)).toBe(url);
  });

  it("leaves a deliberate opt-out alone", () => {
    // sslmode=disable is somebody saying they know; not ours to override.
    const url = "postgres://u:p@h/db?sslmode=disable";
    expect(withStrictSsl(url)).toBe(url);
  });

  it("adds nothing when no sslmode was given", () => {
    // The driver's own default applies; inventing one here would change
    // behaviour for local sockets that never wanted TLS.
    const url = "postgres://u:p@h/db";
    expect(withStrictSsl(url)).toBe(url);
  });

  it("keeps every other parameter and the rest of the URL intact", () => {
    const out = withStrictSsl(
      "postgres://u:p@h.example.com:5432/db?sslmode=require&application_name=gaari&pool_timeout=15",
    );
    expect(out).toContain("application_name=gaari");
    expect(out).toContain("pool_timeout=15");
    expect(out).toContain("h.example.com:5432");
  });

  it("returns anything unparseable untouched rather than throwing", () => {
    // A bad URL should fail at connect time with the driver's own message,
    // not here with a URL parse error that hides it.
    expect(withStrictSsl("not a url")).toBe("not a url");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/db-url.test.ts`
Expected: FAIL — `lib/db-url` does not resolve.

- [ ] **Step 3: Write the module**

Create `lib/db-url.ts`:

```ts
/*
  Pins the connection to a verified TLS mode.

  node-postgres currently treats `require`, `prefer` and `verify-ca` as
  aliases for `verify-full`, and warns that its next major version will adopt
  libpq semantics instead — under which those modes do NOT verify the server's
  certificate. So a routine dependency bump would quietly downgrade every
  connection from verified to unverified, with nothing failing and nothing to
  notice.

  Saying `verify-full` explicitly means the behaviour is stated rather than
  inherited, and the upgrade changes nothing.

  Done here rather than in a .env file because production's URL comes from
  Neon's integration, where nobody in this repository chose the mode at all.
*/

const WEAKENED = new Set(["require", "prefer", "verify-ca"]);

export function withStrictSsl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not ours to diagnose — let the driver fail with its own message.
    return url;
  }

  const mode = parsed.searchParams.get("sslmode");
  // No mode at all means the driver's default applies, and `disable` is a
  // deliberate choice. Neither is ours to override.
  if (!mode || !WEAKENED.has(mode)) return url;

  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/db-url.test.ts`
Expected: PASS, all six.

- [ ] **Step 5: Use it**

In `lib/db.ts`:

```ts
import { withStrictSsl } from "./db-url";
```

```ts
    adapter: new PrismaPg({ connectionString: withStrictSsl(env.DATABASE_URL) }),
```

Apply the same wrapping anywhere else a `connectionString` is built from an
environment variable. Find them:

```bash
grep -rn "connectionString" lib scripts prisma --include=*.ts
```

- [ ] **Step 6: Confirm the warning is gone**

```bash
npm run dev
```

Load the home page and check the dev server output. The
`SECURITY WARNING: The SSL modes...` line must not appear. If it still does,
a connection is being opened from a path Step 5 missed.

- [ ] **Step 7: Note it for whoever sets production up**

In `.env.example`, next to `DATABASE_URL`, record why the mode matters:

```
# Postgres. If the URL carries sslmode=require, prefer or verify-ca, the app
# upgrades it to verify-full at connect time (see lib/db-url.ts) — those modes
# stop verifying certificates in the next major pg release, and a dependency
# bump should not quietly downgrade a production connection.
```

- [ ] **Step 8: Commit**

```bash
git add lib/db-url.ts lib/db.ts tests/db-url.test.ts .env.example
git commit -m "Say verify-full explicitly, before pg stops meaning it"
```

---

### Task 5: Check the whole thing against the reference

**Files:** none created; this task is verification and whatever it turns up.

- [ ] **Step 1: Capture every breakpoint**

```bash
npm run dev
node scripts/screenshot-pages.mjs
```

The audit must report no problems.

- [ ] **Step 2: Confirm the landing view still costs nothing**

Open the landing page with the network tab filtered to `maptiler` and
`openfreemap`. Expected: **zero** requests. The globe draws a local texture;
anything else means a tile source has crept into this view, and the descent's
whole budget argument rests on it.

- [ ] **Step 3: Compare against the reference, honestly**

Open `gaari_inspo.png` and `tmp/shots/home-desktop.png` side by side and write
down, in your report, where they still differ. Do not claim a match you cannot
see. The three things most likely to be off:

- road density and how the clusters sit against open ground
- how green the bloom reads at normal viewing distance
- the globe's size relative to the frame

- [ ] **Step 4: Fix what the comparison shows, then commit**

Report which differences you closed and which you judged close enough, with
your reasoning for each.

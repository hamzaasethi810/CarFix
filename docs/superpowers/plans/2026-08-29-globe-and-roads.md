# Globe and Roads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tiling road background with a single non-repeating Voronoi composition, and make the globe's rendered sphere fill its container at every viewport.

**Architecture:** The road SVG becomes one 2560x1440 composition drawn with `background-size: cover`, so there is no second tile to seam against the first. The globe's zoom stops being a constant and is solved at runtime by bisection against `map.project()`, corrected by a measured ratio, so the sphere tracks its container instead of agreeing with it at one width.

**Tech Stack:** Next.js 16, MapLibre GL 6.6.0, vitest, puppeteer-core, d3-delaunay (new devDependency)

**Spec:** `docs/superpowers/specs/2026-08-29-globe-and-roads-design.md`

## Global Constraints

- **Palette: navy ground, blue road lights, green bloom.** Where this plan and `gaari_inspo.png` disagree on colour, this wins.
- **Calmer than the reference.** Density is the first thing to cut when the ground competes with the globe, buttons, or filter bar. It is not a fidelity target.
- **The landing view must cost zero map tile requests.** No task may introduce a network request to a tile server on `/`.
- **`d3-delaunay` is a devDependency only.** It runs in `scripts/`, which commits an SVG. Nothing may import it from `app/`, `components/`, or `lib/`.
- **Every comment explains WHY, not what.** This codebase's comments carry the measurements and failures behind each decision; match that.
- Run `npm run lint` and `npm test` before every commit. Both must be clean.

---

### Task 1: Rebuild the road network as one non-tiling composition

**Files:**
- Modify: `scripts/generate-roads.mjs` (full rewrite)
- Modify: `app/globals.css:231-233` (background-size / repeat)
- Modify: `scripts/screenshot-pages.mjs` (add the 2560x1440 viewport)
- Modify: `package.json` (add d3-delaunay devDependency)
- Regenerate: `public/roads.svg`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `public/roads.svg` with a `viewBox="0 0 2560 1440"`. Later tasks do not read it.

**Why this task exists.** `app/globals.css` repeats `roads.svg` at a fixed `1600px 1000px` with `background-position: center`. The generator projects onto a ground plane with a horizon at 16% height, so every tile carries a blank strip across its top. The tile does not wrap, so on a 2560x1440 window the tile grid centres at (1280, 720) and the seams land at **x = 480 and 2080, y = 220 and 1220** — exactly the box edges visible on screen. Any window larger than 1600x1000 shows it.

- [ ] **Step 1: Add the audit viewport that can see the bug**

In `scripts/screenshot-pages.mjs`, add to the `VIEWPORTS` array after the `laptop` entry:

```js
  /*
    Larger than the road composition itself.

    Every other viewport here is smaller than the background art, so a
    background that tiles, seams, or runs out looks perfect in all of them.
    That is not a hypothetical: roads.svg used to repeat at 1600x1000 and
    showed hard rectangular seams on any window bigger than that, invisible
    to this audit for exactly this reason. This row is the one that looks.
  */
  { name: "wide", width: 2560, height: 1440 },
```

- [ ] **Step 2: Run the audit and SEE the seams before fixing them**

```bash
npm run dev &   # if not already running
node scripts/screenshot-pages.mjs
```

Open `tmp/shots/home-wide.png`. Expected: visible hard vertical edges near x=480 and x=2080 and horizontal edges near y=220 and y=1220. **If you cannot see them, stop and report** — the rest of this task assumes that defect is real and reproducible.

- [ ] **Step 3: Install the geometry dependency**

```bash
npm install --save-dev d3-delaunay
```

Verify it landed in `devDependencies`, not `dependencies`:

```bash
node -e "const p=require('./package.json'); if(p.dependencies?.['d3-delaunay']) throw new Error('must be a devDependency'); console.log('devDep ok:', p.devDependencies['d3-delaunay'])"
```

- [ ] **Step 4: Rewrite the generator**

Replace the entire contents of `scripts/generate-roads.mjs` with:

```js
/*
  Generates the road network that lies under the globe.

  ONE composition, not a tile. The previous version emitted a 1600x1000 image
  that the CSS repeated, and it did not wrap: the perspective projection put a
  blank strip across the top of every tile and a dark band below it, so on any
  window larger than the tile those discontinuities became hard rectangular
  seams. On a 2560x1440 window they landed at x=480/2080 and y=220/1220, which
  read as a box drawn around the globe. Emitting a single frame drawn with
  `background-size: cover` removes them by construction: there is no second
  tile to disagree with the first.

  The reference art (gaari_inspo.png) is two tiers with a large contrast ratio
  between them — a dim fine mesh of irregular cells that reads as texture, and
  a few bright cyan arterials that carry the whole look. A single-weight
  network, which is what the old warped grid produced, reads as a fishing net
  instead.

  Deliberately calmer than the reference: that is a static hero image, while
  this ground sits under a globe, a button row and a filter bar. Cells here
  run ~90px against the reference's 20-40px.

  Deterministic: fixed seed, so the committed SVG never churns in a diff.

    node scripts/generate-roads.mjs

  Writes public/roads.svg.
*/

import { writeFile } from "node:fs/promises";
import { Delaunay } from "d3-delaunay";

const W = 2560;
const H = 1440;

/*
  Site count sets cell size, and cell size is the whole "busy or calm" dial.
  420 sites over 2560x1440 gives roughly 8800px^2 per cell — about 90px
  across. The reference sits nearer 20-40px; this is deliberately sparser.
*/
const SITES = 420;
const LLOYD_PASSES = 2;
const ARTERIALS = 10;

/* Mulberry32 — small, seeded, and good enough for scattering points. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260829);

/*
  Lloyd relaxation: replace each site with its cell's centroid, twice.

  Raw uniform-random sites clump, leaving some cells tiny and others huge,
  which reads as noise rather than as a street network. Two passes is enough
  to even the cells out while keeping them irregular; more passes march the
  whole thing toward a hexagonal grid, which is the regularity we are trying
  to avoid.
*/
let points = new Float64Array(SITES * 2);
for (let i = 0; i < SITES; i++) {
  points[2 * i] = rand() * W;
  points[2 * i + 1] = rand() * H;
}

for (let pass = 0; pass < LLOYD_PASSES; pass++) {
  const d = new Delaunay(points);
  const v = d.voronoi([0, 0, W, H]);
  const next = new Float64Array(SITES * 2);
  for (let i = 0; i < SITES; i++) {
    const poly = v.cellPolygon(i);
    if (!poly) {
      next[2 * i] = points[2 * i];
      next[2 * i + 1] = points[2 * i + 1];
      continue;
    }
    let sx = 0;
    let sy = 0;
    for (const [px, py] of poly) {
      sx += px;
      sy += py;
    }
    next[2 * i] = sx / poly.length;
    next[2 * i + 1] = sy / poly.length;
  }
  points = next;
}

const delaunay = new Delaunay(points);
const voronoi = delaunay.voronoi([0, 0, W, H]);

/*
  The Voronoi edge graph, built from the Delaunay dual.

  Each Delaunay triangle has a circumcentre, and that circumcentre is a
  Voronoi vertex. Two triangles that share a Delaunay half-edge have
  circumcentres joined by a Voronoi edge. So triangle index doubles as vertex
  id, which is what makes the arterial walk below cheap: it is a walk over
  triangle indices.
*/
const cc = voronoi.circumcenters;
const { halfedges } = delaunay;

const adjacency = new Map(); // vertex id -> vertex id[]
const edges = []; // [aId, bId]

for (let e = 0; e < halfedges.length; e++) {
  const opposite = halfedges[e];
  // -1 is a hull edge with no second cell; skip. `opposite < e` is the same
  // edge seen from the other side, so this keeps exactly one copy of each.
  if (opposite === -1 || opposite < e) continue;
  const a = Math.floor(e / 3);
  const b = Math.floor(opposite / 3);
  if (a === b) continue;
  /*
    Drop edges touching a runaway circumcentre.

    A nearly-degenerate triangle — three almost-collinear sites — has its
    circumcentre out at infinity. Those vertices are legitimate Voronoi
    geometry but they are useless here: the clip path would hide the line
    itself, while the arterial walk would happily route THROUGH such a vertex
    and emit a spike shooting across the whole frame from nowhere. Excluding
    them from the graph entirely is what keeps the walk sane.
  */
  if (!inFrame(a) || !inFrame(b)) continue;
  edges.push([a, b]);
  if (!adjacency.has(a)) adjacency.set(a, []);
  if (!adjacency.has(b)) adjacency.set(b, []);
  adjacency.get(a).push(b);
  adjacency.get(b).push(a);
}

const vx = (id) => cc[2 * id];
const vy = (id) => cc[2 * id + 1];

/* A generous margin: off-frame vertices are fine, infinite ones are not. */
const MARGIN = 400;
const inFrame = (id) => {
  const x = vx(id);
  const y = vy(id);
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x > -MARGIN &&
    x < W + MARGIN &&
    y > -MARGIN &&
    y < H + MARGIN
  );
};

/*
  An arterial is a walk that always takes the straightest available
  continuation.

  Picking neighbours at random produces a tangle that reads as cracks. Always
  turning as little as possible produces a long sweeping line that crosses the
  frame, which is what the reference's bright roads actually do.
*/
function walkArterial(startId, maxSteps = 45) {
  const seen = new Set([startId]);
  const path = [startId];
  let currentId = startId;
  let prevId = null;

  for (let step = 0; step < maxSteps; step++) {
    const neighbours = (adjacency.get(currentId) ?? []).filter((n) => !seen.has(n));
    if (neighbours.length === 0) break;

    let chosen;
    if (prevId === null) {
      chosen = neighbours[Math.floor(rand() * neighbours.length)];
    } else {
      const inX = vx(currentId) - vx(prevId);
      const inY = vy(currentId) - vy(prevId);
      const inLen = Math.hypot(inX, inY) || 1;
      let best = -Infinity;
      for (const n of neighbours) {
        const outX = vx(n) - vx(currentId);
        const outY = vy(n) - vy(currentId);
        const outLen = Math.hypot(outX, outY) || 1;
        // cosine of the turn angle; 1 is dead straight
        const dot = (inX * outX + inY * outY) / (inLen * outLen);
        if (dot > best) {
          best = dot;
          chosen = n;
        }
      }
    }
    if (chosen === undefined) break;
    path.push(chosen);
    seen.add(chosen);
    prevId = currentId;
    currentId = chosen;
  }
  return path;
}

// adjacency only ever received in-frame vertices, so no further filtering.
const vertexIds = [...adjacency.keys()];

const arterialPaths = [];
const arterialVertexUse = new Map(); // vertex id -> how many arterials touch it

for (let i = 0; i < ARTERIALS; i++) {
  const start = vertexIds[Math.floor(rand() * vertexIds.length)];
  const path = walkArterial(start);
  if (path.length < 8) continue; // too short to read as a road
  arterialPaths.push(path);
  for (const id of path) {
    arterialVertexUse.set(id, (arterialVertexUse.get(id) ?? 0) + 1);
  }
}

/* Nodes: where two arterials meet. These are the bright spots in the reference. */
const nodes = [...arterialVertexUse.entries()]
  .filter(([, count]) => count > 1)
  .map(([id]) => [vx(id), vy(id)]);

/* Green bloom, scattered rather than banded. */
const BLOOMS = 7;
const blooms = Array.from({ length: BLOOMS }, () => ({
  x: rand() * W,
  y: rand() * H,
  rx: 220 + rand() * 380,
  ry: 140 + rand() * 240,
  o: 0.05 + rand() * 0.07,
}));

const num = (n) => n.toFixed(1);
const pathFor = (ids) =>
  ids.map((id, i) => `${i === 0 ? "M" : "L"}${num(vx(id))} ${num(vy(id))}`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <clipPath id="frame"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
    <filter id="arterial-glow" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="node">
      <stop offset="0%" stop-color="#dcf2ff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#7fc4e8" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#7fc4e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bloom">
      <stop offset="0%" stop-color="#3ddc84" stop-opacity="1"/>
      <stop offset="55%" stop-color="#2aa862" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#1c7a46" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g clip-path="url(#frame)">
${blooms.map((b) => `    <ellipse cx="${num(b.x)}" cy="${num(b.y)}" rx="${num(b.rx)}" ry="${num(b.ry)}" fill="url(#bloom)" opacity="${b.o.toFixed(3)}"/>`).join("\n")}
    <g fill="none" stroke="#5c7f9e" stroke-opacity="0.16" stroke-width="0.6" stroke-linecap="round">
${edges.map(([a, b]) => `      <path d="M${num(vx(a))} ${num(vy(a))}L${num(vx(b))} ${num(vy(b))}"/>`).join("\n")}
    </g>
    <g fill="none" stroke="#63c8ff" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#arterial-glow)">
${arterialPaths.map((p) => `      <path d="${pathFor(p)}"/>`).join("\n")}
    </g>
${nodes.map(([x, y]) => `    <circle cx="${num(x)}" cy="${num(y)}" r="14" fill="url(#node)"/>`).join("\n")}
  </g>
</svg>
`;

await writeFile("public/roads.svg", svg, "utf8");
console.log(
  `wrote public/roads.svg — ${edges.length} cell edges, ` +
    `${arterialPaths.length} arterials, ${nodes.length} nodes`,
);
```

- [ ] **Step 5: Generate the SVG**

```bash
node scripts/generate-roads.mjs
```

Expected: a line like `wrote public/roads.svg — 1230 cell edges, 10 arterials, 6 nodes`. Exact counts will differ; what matters is that arterials is close to 10 and cell edges is in the high hundreds to low thousands. **If arterials is 0, stop** — the walk found no path of 8+ vertices, which means the edge graph is empty and the Delaunay dual was read wrong.

- [ ] **Step 6: Stop the CSS from tiling it**

In `app/globals.css`, replace these three lines (currently at 231-233):

```css
  background-size: cover, 1600px 1000px, cover;
  background-position: center, center, center;
  background-repeat: no-repeat, repeat, no-repeat;
```

with:

```css
  /*
    `cover`, not a pixel size, and never `repeat`.

    roads.svg is a single composition with a definite frame, not a swatch. It
    used to be repeated at 1600x1000, and it does not wrap — so every window
    larger than that showed the tile's own edges as hard rectangular seams
    around the globe. Scaling one copy to cover means there is no second tile
    to disagree with the first. On very tall or very narrow windows `cover`
    crops the composition, which is correct: it is a background, and losing
    its edges costs nothing.
  */
  background-size: cover, cover, cover;
  background-position: center, center, center;
  background-repeat: no-repeat, no-repeat, no-repeat;
```

- [ ] **Step 7: Verify the seams are gone**

```bash
node scripts/screenshot-pages.mjs
```

Expected: the script prints `no overflow, undersized targets, or console errors`, and `tmp/shots/home-wide.png` has **no** straight vertical or horizontal edges crossing the background. Compare against the shot from Step 2.

Also confirm the ground reads as calmer than `gaari_inspo.png` — sparser cells, fewer bright lines. If it looks busier, reduce `SITES`, not the opacities: cell count is the dial that matters.

- [ ] **Step 8: Commit**

```bash
npm run lint && npm test
git add scripts/generate-roads.mjs scripts/screenshot-pages.mjs app/globals.css public/roads.svg package.json package-lock.json
git commit -m "One road composition, not a tile that seams"
```

---

### Task 2: Solve globe zoom from container size (pure logic)

**Files:**
- Create: `lib/map/globe-fit.ts`
- Create: `tests/globe-fit.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `export const LIMB_SAMPLES: ReadonlyArray<{ zoom: number; ratio: number }>`
  - `export function limbRatio(zoom: number): number`
  - `export function fitZoom(projectedDiameterAt: (zoom: number) => number, targetDiameter: number, lo?: number, hi?: number, iterations?: number): number`

**Why this task exists.** `components/globe.tsx` sets a constant `zoom: 2.05`, which fixes the sphere's diameter in CSS pixels while `.globe-stage` scales with the viewport. They agree at one window width. Measured: at 2560x1440 the stage is 620px and the sphere ~520px, leaving a ~50px dead ring; at 1440x780 the stage is 406px and the sphere is cropped.

**Two wrong turns this task exists to avoid.** Both were measured, so do not re-derive them:

1. `d = k * 2^zoom` is not the relationship. Fitted against rendered pixels, `k` drifts from **139.45 at z=1.4 to 120.73 at z=2.6**. Any single constant is wrong nearly everywhere.
2. `map.project()` of a point 90 degrees of longitude from centre tracks the diameter closely but **underestimates it by 1-4%, drifting with zoom** — because a sphere's visible limb under perspective sits inside the 90-degree great-circle point, and the gap widens as the camera approaches. At a 620px stage a 4% shortfall is a ~12px ring: the exact defect being fixed.

- [ ] **Step 1: Write the failing tests**

Create `tests/globe-fit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fitZoom, LIMB_SAMPLES, limbRatio } from "../lib/map/globe-fit";

describe("limbRatio", () => {
  it("reproduces each measured sample exactly", () => {
    for (const { zoom, ratio } of LIMB_SAMPLES) {
      expect(limbRatio(zoom)).toBeCloseTo(ratio, 5);
    }
  });

  it("interpolates between samples", () => {
    const mid = limbRatio(1.55);
    expect(mid).toBeLessThan(0.991);
    expect(mid).toBeGreaterThan(0.986);
  });

  it("clamps outside the measured range rather than extrapolating", () => {
    // Extrapolating a fitted correction past its data is how a plausible
    // number becomes a wrong one silently. Clamp instead.
    expect(limbRatio(0.2)).toBeCloseTo(LIMB_SAMPLES[0].ratio, 5);
    expect(limbRatio(9)).toBeCloseTo(LIMB_SAMPLES.at(-1)!.ratio, 5);
  });
});

describe("fitZoom", () => {
  /*
    A stand-in for MapLibre that reproduces the measured curve: the projected
    diameter at each sampled zoom, linearly interpolated. Using the real
    numbers means a regression in the solver shows up as a wrong zoom for a
    real container size, not for an invented one.
  */
  const measured = [
    { zoom: 1.4, projected: 364.7 },
    { zoom: 1.7, projected: 433.8 },
    { zoom: 2.05, projected: 526.8 },
    { zoom: 2.3, projected: 601.5 },
    { zoom: 2.6, projected: 699.9 },
  ];

  const projectedDiameterAt = (z: number): number => {
    if (z <= measured[0].zoom) return measured[0].projected;
    if (z >= measured.at(-1)!.zoom) return measured.at(-1)!.projected;
    for (let i = 1; i < measured.length; i++) {
      const a = measured[i - 1];
      const b = measured[i];
      if (z <= b.zoom) {
        const t = (z - a.zoom) / (b.zoom - a.zoom);
        return a.projected + t * (b.projected - a.projected);
      }
    }
    return measured.at(-1)!.projected;
  };

  /** What the sphere actually renders at, given the measured correction. */
  const renderedAt = (z: number) => projectedDiameterAt(z) / limbRatio(z);

  it("finds a zoom whose RENDERED diameter matches the target", () => {
    for (const target of [380, 450, 540, 620, 700]) {
      const z = fitZoom(projectedDiameterAt, target);
      expect(Math.abs(renderedAt(z) - target) / target).toBeLessThan(0.01);
    }
  });

  it("corrects for the limb, so it does not simply match project()", () => {
    /*
      The bug this guards: solving against project() alone leaves the sphere
      1-4% small, which is a visible ring at a 620px stage. If someone drops
      the correction, the projected diameter will equal the target instead of
      falling short of it, and this fails.
    */
    const z = fitZoom(projectedDiameterAt, 620);
    expect(projectedDiameterAt(z)).toBeLessThan(620);
    expect(renderedAt(z)).toBeCloseTo(620, 0);
  });

  it("returns a larger zoom for a larger container", () => {
    expect(fitZoom(projectedDiameterAt, 700)).toBeGreaterThan(
      fitZoom(projectedDiameterAt, 400),
    );
  });

  it("stays inside the search bounds when the target is unreachable", () => {
    expect(fitZoom(projectedDiameterAt, 5, 0.5, 5)).toBeGreaterThanOrEqual(0.5);
    expect(fitZoom(projectedDiameterAt, 100000, 0.5, 5)).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run tests/globe-fit.test.ts
```

Expected: FAIL — cannot resolve `../lib/map/globe-fit`.

- [ ] **Step 3: Write the implementation**

Create `lib/map/globe-fit.ts`:

```ts
/*
  How big the globe renders, and what zoom makes it fill a given box.

  The globe's zoom used to be the constant 2.05, with a comment claiming the
  sphere "exactly fills .globe-stage's circle". That held at one window width.
  The stage is sized in vmin, so it scales with the viewport while a constant
  zoom does not: measured, a 2560x1440 window gave a 620px stage around a
  ~520px sphere — a 50px dead ring — while a 1440x780 window gave a 406px
  stage that cropped the sphere.

  Two models were tried and rejected against rendered pixels before this one:

    d = k * 2^zoom      k drifts 139.45 (z=1.4) -> 120.73 (z=2.6). Not a
                        constant, so no single fitted value is right.

    d = project() span  Close, but short by 1-4%, drifting with zoom. A
                        sphere's visible limb under perspective sits inside
                        the point 90 degrees of longitude away, and the gap
                        widens as the camera approaches. At a 620px stage 4%
                        is a ~12px ring: the very defect being fixed.

  So: solve numerically against project(), then divide out the measured
  shortfall below.
*/

/*
  Rendered diameter over projected diameter, measured in Chrome against
  MapLibre GL 6.6.0 with an 800px square container.

  If MapLibre changes how zoom maps to globe radius these stop being true.
  scripts/verify-globe-fit.mjs is what catches that: it renders the real page
  and asserts the sphere fills its stage, so a drift here fails loudly instead
  of quietly detaching the globe from its shadow again.
*/
export const LIMB_SAMPLES: ReadonlyArray<{ zoom: number; ratio: number }> = [
  { zoom: 1.4, ratio: 0.991 },
  { zoom: 1.7, ratio: 0.986 },
  { zoom: 2.05, ratio: 0.975 },
  { zoom: 2.3, ratio: 0.967 },
  { zoom: 2.6, ratio: 0.956 },
];

/**
 * The correction at a given zoom, linearly interpolated between samples.
 *
 * Clamped outside the measured range rather than extrapolated: past the data
 * an extrapolated ratio is a plausible-looking number with nothing behind it,
 * and the failure it would cause (a slightly wrong globe size) is exactly the
 * kind that survives review.
 */
export function limbRatio(zoom: number): number {
  const first = LIMB_SAMPLES[0];
  const last = LIMB_SAMPLES[LIMB_SAMPLES.length - 1];
  if (zoom <= first.zoom) return first.ratio;
  if (zoom >= last.zoom) return last.ratio;

  for (let i = 1; i < LIMB_SAMPLES.length; i++) {
    const a = LIMB_SAMPLES[i - 1];
    const b = LIMB_SAMPLES[i];
    if (zoom <= b.zoom) {
      const t = (zoom - a.zoom) / (b.zoom - a.zoom);
      return a.ratio + t * (b.ratio - a.ratio);
    }
  }
  return last.ratio;
}

/**
 * The zoom at which the sphere renders `targetDiameter` CSS pixels across.
 *
 * Bisection rather than an inverted formula because there is no formula worth
 * trusting here — see the header. `projectedDiameterAt` is expected to be
 * monotonically increasing in zoom, which MapLibre's is over any range this
 * is called with.
 *
 * @param projectedDiameterAt Measures the projected span at a zoom. Calling
 *   this mutates the map's zoom in the real implementation, so the caller is
 *   responsible for restoring or committing the final value.
 */
export function fitZoom(
  projectedDiameterAt: (zoom: number) => number,
  targetDiameter: number,
  lo = 0.5,
  hi = 5,
  iterations = 18,
): number {
  let low = lo;
  let high = hi;
  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2;
    const rendered = projectedDiameterAt(mid) / limbRatio(mid);
    if (rendered < targetDiameter) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/globe-fit.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm test
git add lib/map/globe-fit.ts tests/globe-fit.test.ts
git commit -m "Solve globe zoom from container size"
```

---

### Task 3: An assertion that the sphere fills its stage

**Files:**
- Create: `scripts/verify-globe-fit.mjs`

**Interfaces:**
- Consumes: nothing. Drives the running site through a browser.
- Produces: a script that exits non-zero when the sphere does not fill its stage.

**Why this task comes BEFORE the wiring.** This script must fail against the current code. That failure is the proof it can detect the defect; a check written after the fix has never been seen to fail and is worth much less. Do not skip to Task 4.

- [ ] **Step 1: Write the verification script**

Create `scripts/verify-globe-fit.mjs`:

```js
/*
  Asserts that the globe's rendered sphere fills its circular stage.

  This relationship used to be a magic constant (`zoom: 2.05`) guarded only by
  a comment reading "if the globe ever looks detached from its shadow again,
  check this first". It broke exactly as that comment feared and nothing
  caught it, because nothing rendered the page and looked.

  So this renders the page and looks. It measures the sphere by scanning the
  middle row of a screenshot of .globe-stage for pixels brighter than the
  surrounding page, and compares that span to the stage's own width.

  Needs the dev server up:

    npm run dev
    node scripts/verify-globe-fit.mjs

  Exits non-zero on any viewport where the sphere is not within TOLERANCE of
  its stage. Set CHROME_PATH if Chrome lives somewhere else.
*/

import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXECUTABLE =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/*
  1% of the stage. Tight enough to catch the 4% shortfall that solving against
  project() alone would leave, loose enough to absorb antialiasing on the limb
  and the half-pixel rounding of a fractional stage width.
*/
const TOLERANCE = 0.01;

const VIEWPORTS = [
  { name: "wide", width: 2560, height: 1440 },
  { name: "fullhd", width: 1920, height: 1080 },
  { name: "laptop", width: 1440, height: 780 },
  { name: "small-laptop", width: 1280, height: 700 },
  { name: "phone", width: 390, height: 844 },
];

const browser = await puppeteer.launch({
  executablePath: EXECUTABLE,
  headless: "new",
  args: ["--no-sandbox"],
});

const failures = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 60000 });
  // The globe fades its texture in; give it a beat to settle before measuring.
  await new Promise((r) => setTimeout(r, 5000));

  const stage = await page.$(".globe-stage");
  if (!stage) {
    failures.push(`${vp.name}: no .globe-stage on the page`);
    await page.close();
    continue;
  }

  const box = await stage.boundingBox();
  const shot = await stage.screenshot({ encoding: "base64" });

  /*
    Measured inside the page rather than with an image library: the project
    already runs Chrome for its screenshots, and a canvas 2D context decodes
    the PNG for free. Adding a native image dependency to scan one row of
    pixels is a poor trade.
  */
  const span = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = "data:image/png;base64," + src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const row = Math.floor(c.height / 2);
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < c.width; x++) {
      const i = (row * c.width + x) * 4;
      /*
        The sphere's darkest ocean sits near rgb(0,0,28) — a blue floor with
        almost no red or green. The page behind it is a dark desaturated
        navy-green. Summing the channels separates them: anything on the
        sphere clears 18, the surrounding ring does not.
      */
      if (d[i] + d[i + 1] + d[i + 2] > 18) {
        if (lo < 0) lo = x;
        hi = x;
      }
    }
    return lo < 0 ? 0 : hi - lo + 1;
  }, shot);

  const stageWidth = Math.round(box.width);
  const drift = Math.abs(span - stageWidth) / stageWidth;
  const ok = drift <= TOLERANCE;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${vp.name.padEnd(13)} ${vp.width}x${vp.height}  ` +
      `stage=${stageWidth}px sphere=${span}px  drift=${(drift * 100).toFixed(1)}%`,
  );
  if (!ok) {
    failures.push(
      `${vp.name} (${vp.width}x${vp.height}): stage ${stageWidth}px but sphere ${span}px ` +
        `— ${(drift * 100).toFixed(1)}% off, tolerance ${(TOLERANCE * 100).toFixed(0)}%`,
    );
  }
  await page.close();
}

await browser.close();

if (failures.length > 0) {
  console.error("\nThe globe does not fill its stage:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("\nthe sphere fills its stage at every viewport");
```

- [ ] **Step 2: Run it and WATCH IT FAIL**

```bash
npm run dev &   # if not already running
node scripts/verify-globe-fit.mjs
```

Expected: **exit code 1**, with `wide` and `fullhd` reporting drift well above 1% (roughly 16% and 8% — the dead ring). `laptop` may pass, because that is the width where the constant zoom happens to agree.

**If every viewport passes, stop and report.** That means the measurement is not detecting the defect that screenshots plainly show, and wiring a fix against a blind check is worse than not fixing it.

- [ ] **Step 3: Commit the failing check**

```bash
npm run lint
git add scripts/verify-globe-fit.mjs
git commit -m "Check that the sphere fills its stage (currently failing)"
```

---

### Task 4: Wire the derived zoom into the globe

**Files:**
- Modify: `components/globe.tsx` (map construction around lines 254-290; add a resize effect)

**Interfaces:**
- Consumes: `fitZoom` and `limbRatio` from `lib/map/globe-fit.ts` (Task 2).
- Produces: a globe whose zoom tracks its container. Task 5's CSS depends on the sphere filling `.globe-stage` exactly.

- [ ] **Step 1: Import the solver**

Add to the imports at the top of `components/globe.tsx`:

```ts
import { fitZoom } from "@/lib/map/globe-fit";
```

- [ ] **Step 2: Add the measuring helper**

Add above the `Globe` component (after `GLOBE_STYLE`):

```ts
/**
 * The zoom at which the sphere fills a container of `diameter` CSS pixels.
 *
 * `map.project` is synchronous and reads the transform directly, so this can
 * bisect by setting zoom repeatedly without rendering a frame in between. The
 * final `setZoom` inside the search leaves the map at the answer, which is
 * what we want anyway.
 *
 * The point 90 degrees of longitude from centre lies on the sphere's limb
 * under an orthographic view. Under MapLibre's perspective it sits slightly
 * inside the true limb — fitZoom corrects for that with measured samples.
 */
/*
  Above this, the map is no longer the decorative globe.

  fitZoom searches up to 5, and the descent lands near 11, so anything between
  the two separates "a globe that should track its container" from "a street
  map that should be left alone".
*/
const GLOBE_ZOOM_CEILING = 6;

function fitGlobeToContainer(map: MapLibreMap, diameter: number): number {
  const projectedDiameterAt = (zoom: number): number => {
    map.setZoom(zoom);
    const centre = map.getCenter();
    const origin = map.project(centre);
    const limb = map.project([centre.lng + 90, centre.lat]);
    return 2 * Math.hypot(limb.x - origin.x, limb.y - origin.y);
  };
  return fitZoom(projectedDiameterAt, diameter);
}
```

- [ ] **Step 3: Lower the zoom floor so the search can reach**

In the map constructor, replace `minZoom: 1.9,` with:

```ts
      /*
        The floor of fitZoom's search range, not a UI limit.

        This was 1.9, just under a resting zoom of 2.05 that no longer exists:
        the resting zoom is now solved per container, and a small container
        legitimately needs a zoom below 1.9. Leaving the floor above the answer
        clamped the sphere and reopened the dead ring on small windows — the
        same shape of bug as the old maxZoom: 2.5 silently clamping the
        descent. Nothing on this view can zoom by hand, so a low floor costs
        nothing.
      */
      minZoom: 0.5,
```

- [ ] **Step 4: Keep the constructor zoom, but say what it is now**

Replace the long comment block above `zoom: 2.05,` and the value itself with:

```ts
      /*
        A starting value only. The real zoom is solved from the container's
        measured size in the effect below, on mount and on every resize.

        It was a constant here, with a comment claiming it made the sphere
        "exactly fill .globe-stage's circle". That was true at one window
        width: the stage is sized in vmin and scales, a constant zoom does
        not. Measured, a 2560x1440 window left a ~50px dead ring.
      */
      zoom: 2.05,
```

- [ ] **Step 5: Recentre on the Americas**

Replace `center: [-20, 15],` with:

```ts
      // Framed like the reference art, which shows North America rather than
      // the Atlantic. An ocean-centred globe reads as a flat blue disc.
      center: [-95, 20],
```

- [ ] **Step 6: Fit on mount and on resize**

Add this effect after the existing map-construction effect. It needs `mapRef`, `containerRef` and `descendingRef`, all already defined in the component:

```tsx
  /*
    Keep the sphere the size of its stage.

    A ResizeObserver rather than a window resize listener: the stage is sized
    in vmin with a max-height override, so it can change size without the
    window firing anything the component would hear.

    Debounced because each fit runs an 18-step bisection, and a drag-resize
    fires continuously. 100ms is below the threshold where a resize feels
    laggy and far above the rate that would make the bisection cost anything.

    Skipped while descending: the descent drives the camera to street level,
    and a fit landing mid-flight would yank the zoom back out to orbit.
  */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const fit = () => {
      const map = mapRef.current;
      if (!map || descendingRef.current) return;
      /*
        Not just "while descending" — "while still a globe".

        descendingRef goes false the moment the flight LANDS, and the map is
        then a street map at zoom ~11. A resize after that (rotating a phone,
        dragging a window) would call this and haul the camera back out to
        orbit, throwing away the descent the visitor just watched. Anything
        above the globe's own range is no longer this effect's business.
      */
      if (map.getZoom() > GLOBE_ZOOM_CEILING) return;
      const { width } = container.getBoundingClientRect();
      if (width <= 0) return;
      fitGlobeToContainer(map, width);
    };

    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(fit, 100);
    });
    observer.observe(container);
    fit();

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);
```

- [ ] **Step 7: Verify the check now passes**

```bash
node scripts/verify-globe-fit.mjs
```

Expected: **exit 0**, every viewport under 1% drift. This is the same script that failed in Task 3 Step 2 — compare the output.

- [ ] **Step 8: Verify nothing else regressed**

```bash
npm run lint && npm test
node scripts/screenshot-pages.mjs
```

Expected: tests pass, audit reports `no overflow, undersized targets, or console errors`. Open `tmp/shots/home-wide.png` and confirm the globe has no dark ring and its shadow still sits under it.

- [ ] **Step 9: Commit**

```bash
git add components/globe.tsx
git commit -m "Size the globe from its container, not a constant"
```

---

### Task 5: Re-fit the CSS that assumed a fixed sphere

**Files:**
- Modify: `app/globals.css` — `.globe-stage` (from line 589), the `@media (max-height: 480px)` blocks (from line 655), `.globe-shading` (from line 806)

**Interfaces:**
- Consumes: a sphere that fills `.globe-stage` at every size (Task 4).
- Produces: no new interface.

**Why this task exists.** The halo on `.globe-stage` and the inset shading on `.globe-shading` are declared in absolute pixels, fitted to a 620px sphere. `.globe-ground` is already relative (118%/104%) and needs no change. Growing the stage without re-fitting the pixel values detaches the shadow from the globe — the exact bug this work is undoing.

- [ ] **Step 1: Give the stage a size variable and grow it**

In `.globe-stage`, replace `width: min(52vmin, 620px);` with:

```css
  /*
    One variable, because the halo and the inset shading below are both
    fractions of it. They used to be absolute pixel values fitted to a 620px
    sphere, which is fine only while the sphere is always 620px — and it no
    longer is: components/globe.tsx now solves zoom from this box's measured
    width, so the sphere is whatever this says.
  */
  --globe-d: min(62vmin, 760px);
  width: var(--globe-d);
```

Then replace the `box-shadow` on `.globe-stage` with fractions of that variable. The ratios are the old pixel values over the old 620px stage, so the halo looks the same at 620px and now scales:

```css
  box-shadow:
    0 0 0 1px rgba(126, 200, 255, 0.3),
    0 0 calc(var(--globe-d) * 0.0355) rgba(90, 170, 240, 0.5),
    0 0 calc(var(--globe-d) * 0.113) rgba(60, 140, 220, 0.3),
    0 0 calc(var(--globe-d) * 0.226) rgba(40, 110, 190, 0.18);
```

- [ ] **Step 2: Make the inset shading relative too**

Replace the `box-shadow` in `.globe-shading` with:

```css
  box-shadow:
    /* terminator: the far side falling into shadow */
    inset calc(var(--globe-d) * -0.0161) calc(var(--globe-d) * -0.0194)
      calc(var(--globe-d) * 0.0419) rgba(0, 0, 0, 0.5),
    /* the lit limb catching the light */
    inset calc(var(--globe-d) * 0.0065) calc(var(--globe-d) * 0.0081)
      calc(var(--globe-d) * 0.0129) rgba(190, 225, 255, 0.55);
```

`--globe-d` is declared on `.globe-stage`, and `.globe-shading` is inside it, so the variable inherits. No second declaration.

- [ ] **Step 3: Re-measure the landscape-phone cap**

The `@media (max-height: 480px)` rule caps the stage at `min(26vmin, 140px)`. That number was fitted against the old `min(52vmin, 620px)` base; raising the base to 62vmin invalidates it. **844x390 has broken this page twice — measure, do not guess.**

```bash
node -e "
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 844, height: 390, deviceScaleFactor: 1 });
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 4000));
  console.log(await p.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
    const stage = r('.globe-stage');
    const buttons = document.querySelectorAll('.globe-chrome ~ div button, header a');
    const bar = document.querySelector('form')?.getBoundingClientRect();
    return JSON.stringify({
      stage: stage && { top: Math.round(stage.top), bottom: Math.round(stage.bottom), size: Math.round(stage.width) },
      filterBarTop: bar && Math.round(bar.top),
      viewportH: innerHeight,
    }, null, 1);
  }));
  await b.close();
})();
"
```

Set the cap so the stage's `bottom` clears the filter bar's `top` by at least 20px and its `top` clears the button row by at least 5px. Update the value in the `@media (max-height: 480px)` block and record the measured numbers in its comment, replacing the stale figures from the previous fitting.

- [ ] **Step 4: Verify at every viewport**

```bash
node scripts/verify-globe-fit.mjs
node scripts/screenshot-pages.mjs
```

Expected: the fit check exits 0, and the audit reports no problems. Open `tmp/shots/home-phone-landscape.png` and confirm the globe overlaps neither the buttons above nor the filter bar below.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm test
git add app/globals.css
git commit -m "Scale the globe's shadows with the globe"
```

---

### Task 6: Graticule and atmosphere

**Files:**
- Modify: `components/globe.tsx` (`GLOBE_STYLE`, around lines 193-201)

**Interfaces:**
- Consumes: the globe style from earlier tasks.
- Produces: no new interface.

**Why this task is last.** It is polish. Tasks 1-5 fix defects every visitor on a large monitor can see; this closes the remaining gap to the reference, whose sphere carries a visible graticule and reads as a lit object rather than a dark disc.

- [ ] **Step 1: Add the graticule generator**

Add above `GLOBE_STYLE` in `components/globe.tsx`:

```ts
/*
  A lat/long grid drawn onto the sphere.

  The reference globe carries one, and it does a lot of work: an unmarked
  sphere lit from one side reads as a flat disc, while a grid that curves with
  the surface makes it read as round. Generated rather than fetched — a
  GeoJSON graticule is a few dozen lines of arithmetic and the landing view
  must cost zero network requests.

  Meridians every 30 degrees, parallels every 30 degrees. Denser reads as a
  wireframe rather than a planet.
*/
function graticule(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  const line = (coordinates: [number, number][]): void => {
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } });
  };

  for (let lng = -180; lng < 180; lng += 30) {
    const coords: [number, number][] = [];
    // 5-degree steps: fine enough that the curve is smooth once projected,
    // coarse enough to keep the feature count trivial.
    for (let lat = -80; lat <= 80; lat += 5) coords.push([lng, lat]);
    line(coords);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const coords: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 5) coords.push([lng, lat]);
    line(coords);
  }
  return { type: "FeatureCollection", features };
}
```

- [ ] **Step 2: Add the source and layer to the style**

In `GLOBE_STYLE`, add to `sources` after the earth source:

```ts
    graticule: { type: "geojson", data: graticule() },
```

and add to the end of the `layers` array, after the earth raster layer:

```ts
    {
      id: "graticule",
      type: "line",
      source: "graticule",
      paint: {
        // Barely there. It should register as structure, not as a grid drawn
        // over a photograph — at higher opacity it reads as a wireframe.
        "line-color": "#8fd4ff",
        "line-opacity": 0.13,
        "line-width": 0.6,
      },
    },
```

- [ ] **Step 3: Strengthen the atmosphere at the limb**

In `app/globals.css`, in `.globe-stage`'s `box-shadow`, raise the inner ring's alpha from `0.3` to `0.42` and the first glow's from `0.5` to `0.58`:

```css
  box-shadow:
    0 0 0 1px rgba(126, 200, 255, 0.42),
    0 0 calc(var(--globe-d) * 0.0355) rgba(90, 170, 240, 0.58),
    0 0 calc(var(--globe-d) * 0.113) rgba(60, 140, 220, 0.3),
    0 0 calc(var(--globe-d) * 0.226) rgba(40, 110, 190, 0.18);
```

- [ ] **Step 4: Verify**

```bash
npm run lint && npm test
node scripts/verify-globe-fit.mjs
node scripts/screenshot-pages.mjs
```

Expected: all clean. Open `tmp/shots/home-wide.png`: the sphere should read as round, with the grid curving over its surface, and no tile request should have been made (the graticule is generated in-process).

- [ ] **Step 5: Commit**

```bash
git add components/globe.tsx app/globals.css
git commit -m "A graticule, so the sphere reads as round"
```

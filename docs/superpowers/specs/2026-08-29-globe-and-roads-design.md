# Globe and Roads — Matching the Reference

**Status:** design, approved in chat 2026-08-29
**Reference art:** `gaari_inspo.png` (repo root)

## The problem

The landing page reads as "a weird box with a map inside of it" on any
reasonably large monitor. That is two independent defects compounding, both
now diagnosed with measurements rather than inspection.

### 1. The box is the road tile's own edge

`app/globals.css` repeats `roads.svg` at a fixed `1600px 1000px` with
`background-position: center`. `scripts/generate-roads.mjs` projects the
network onto a ground plane with a horizon at 16% height, so every tile
carries a blank strip across its top and a dark band below. The tile does not
wrap, so those discontinuities become hard rectangular seams.

On a 2560x1440 window the tile grid centres at (1280, 720), putting seams at
**x = 480 and 2080, y = 220 and 1220**. Those four positions are exactly the
edges visible in a render at that size. This is arithmetic, not a guess.

Any window larger than 1600x1000 shows the box. Windows smaller than that fit
inside a single tile and look correct — which is why this shipped.

### 2. The sphere does not scale with its container

`components/globe.tsx` sets a constant `zoom: 2.05`. The rendered sphere
diameter is therefore fixed in CSS pixels, while `.globe-stage` is
`min(52vmin, 620px)` and scales with the viewport. They agree at exactly one
window width.

Measured pixel profiles across the stage:

| viewport   | stage | sphere | result                        |
|------------|-------|--------|-------------------------------|
| 2560x1440  | 620px | ~520px | ~50px dead ring all around    |
| 1440x780   | 406px | 406px  | sphere cropped by the circle  |

The comment on that line claims the zoom makes the sphere "exactly fill
`.globe-stage`'s circle". True at one width, false everywhere else.

### 3. The audit cannot see either defect

`scripts/screenshot-pages.mjs` tests viewports of 1440x900 and below. Every
one of them fits inside a single road tile, so the seam is invisible to it by
construction — the same class of blind spot that hid the 150px globe.

## What the reference actually is

Enlarging the ground in `gaari_inspo.png` shows **two tiers with a large
contrast ratio between them**, which is what the current single-weight
generator misses:

- a **dim fine mesh** of thin grey-green lines enclosing small irregular
  polygonal cells — read as texture, not as roads
- a sparse set of **bright cyan arterials**, thick and glowing with real
  bloom, sweeping long distances at shallow angles, with white-hot nodes
  dropped along them at intervals

There is **no horizon and no vanishing point**. The network fills the frame
evenly. The cells are irregular polygons of varying size, not a warped grid.

## Decisions

Two forks were settled by the project owner and bind everything below:

- **Palette: navy ground, blue road lights, green bloom.** The reference has
  a green ground and blue roads; an earlier instruction asked for a navy
  ground so it blends with the globe. The resolution keeps the navy ground
  and takes the blue arterials and scattered green glow from the reference.
  Where this spec and the reference image disagree on colour, this decision
  wins.
- **Network shape: irregular cell network (Voronoi)**, not a scaled-up grid
  and not a trace of the reference art.

## Step 1 — Kill the box, rebuild the network

**Files:** `scripts/generate-roads.mjs`, `public/roads.svg`,
`app/globals.css`, `scripts/screenshot-pages.mjs`, `package.json`

Delete the perspective projection, the horizon, and the town-pull from the
generator. Emit a **single composition** at a 2560x1440 viewBox and change
the CSS to `background-size: cover` with `background-repeat: no-repeat`. The
seams go away by construction: there is no second tile to disagree with the
first.

The network is a **Lloyd-relaxed Voronoi diagram**, drawn in two tiers:

- ~1400 sites, 2 relaxation passes, for evenly-sized irregular cells
- **tier 1**: every cell edge at 0.5px in dim desaturated slate, low opacity
- **tier 2**: ~16 arterials, each a long chain walked across adjacent cell
  edges, at ~3px in bright cyan under a Gaussian glow filter
- bloom nodes where arterials cross

Green bloom becomes 8-12 scattered irregular radial patches of varying size
and opacity, replacing the current single horizontal band.

`d3-delaunay` is added as a **devDependency**. The script runs at author time
and commits an SVG, so nothing reaches the client bundle. This is preferred
over hand-rolling Bowyer-Watson: a subtly wrong diagram is hard to see and
harder to debug, and the dependency has no runtime cost.

**Testing:** add a viewport wider and taller than the composition to
`scripts/screenshot-pages.mjs` (2560x1440). Without it the fix has no test
that would catch its own regression.

## Step 2 — Make the globe fill its stage at every size

**Files:** `components/globe.tsx`, `app/globals.css`, plus a new test

Replace the constant `zoom` with a zoom **derived from the container's
measured size**, applied on mount and under a `ResizeObserver`.

The obvious model is wrong and was rejected on measurement. Fitting
`d = k * 2^zoom` against rendered pixels gives a `k` that drifts from
**139.45 at z=1.4 to 120.73 at z=2.6** — not a constant, so any single fitted
value is wrong nearly everywhere.

`map.project()` gives a better basis: projecting a point 90 degrees of
longitude from centre yields a radius that tracks the true rendered diameter
closely, but **underestimates it by 1-4%, drifting with zoom**:

| zoom | project() d | rendered d | ratio |
|------|-------------|------------|-------|
| 1.4  | 364.7       | 368        | 0.991 |
| 1.7  | 433.8       | 440        | 0.986 |
| 2.05 | 526.8       | 540        | 0.975 |
| 2.3  | 601.5       | 622        | 0.967 |
| 2.6  | 699.9       | 732        | 0.956 |

The cause is geometric: a sphere's visible limb under perspective sits
slightly inside the 90-degree great-circle point, and the gap widens as the
camera approaches. A 4% shortfall is a ~12px ring at a 620px stage — the
exact defect being fixed — so the correction must be explicit.

**Mechanism:** binary-search zoom against `project()` targeting the stage
radius, with the ratio above applied as an explicit, commented correction
carrying the measurements that produced it.

**Safety net (required, not optional):** a test that renders the page at
several viewports and asserts the sphere fills its stage to within 1%. Today
this relationship is a magic constant guarded only by a comment saying "check
this first"; if MapLibre changes how zoom maps to globe radius, that test must
fail loudly rather than the globe quietly detaching from its shadow again.

Also in this step:

- `minZoom` must move with the derived zoom; it currently sits at 1.9, just
  under a resting zoom that will no longer be fixed.
- The resize handler must be guarded against `descendingRef` so a resize
  cannot fight an in-flight descent.
- The stage may grow to `min(62vmin, 760px)` once the sphere tracks it.
- Recentre on `[-95, 20]` so the framing matches the reference, which shows
  North America rather than the Atlantic.
- **The contact shadow and rim light in `globals.css` assume a fixed sphere
  size.** They must become relative to the stage, or they will detach at the
  new sizes — reintroducing the bug this step exists to fix.

## Step 3 — Surface fidelity

**Files:** `components/globe.tsx`, `app/globals.css`

The reference sphere carries a visible graticule and bright city lights over
discernible terrain. Ours is a near-uniform dark ocean disc, which is much of
why it reads as flat.

- add a generated lat/long graticule as a line layer
- strengthen the atmosphere ring at the limb

Separate step because it is polish. It must not block Steps 1 and 2, which
fix defects visible to every visitor on a large monitor.

## Out of scope

- The 97 unpushed commits and the empty production database. Deployment is
  its own concern and is not touched here.
- Any change to the descent, the filter bar, or the moderation pipeline.

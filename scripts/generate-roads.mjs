/*
  Generates the road network that lies under the globe.

  The reference is a night-satellite view: thin lit roads running out to the
  horizon, brighter where they meet. Real road data would be the obvious
  source, but the landing page must cost zero tile requests — that is the whole
  budget argument the globe was built around — so this is drawn instead.

  Deterministic: a fixed seed, so the pattern is identical on every run and the
  committed SVG never churns in a diff for no reason.

    node scripts/generate-roads.mjs

  Writes public/roads.svg.
*/

import { writeFile } from "node:fs/promises";

const W = 1600;
const H = 1000;

/* Mulberry32 — small, seeded, and good enough for scattering lines. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260827);

/*
  Junctions first, then roads between near neighbours. Building the network
  from points rather than drawing strokes freehand is what makes it read as a
  road system: roads meet at shared nodes, and those junctions are the bright
  spots in the reference.
*/
/*
  A street network: a warped grid, not curves and not a graph.

  Three attempts got here. Nearest-neighbour graphs read as a constellation and
  then a spiderweb — such a graph triangulates, so every cell is a little
  polygon. Long branching walks read as flight paths or contour lines, because
  nothing ever closed. What a road network actually looks like from above is
  BLOCKS: roads meeting at right angles, enclosing cells, the grid bending and
  breaking up as it runs out from the centre.

  So: a grid of junctions, each shoved off its lattice point, joined to its
  right and lower neighbours. Some links are dropped so the mesh is not
  uniform, and whole rows and columns are promoted to arterials, which is what
  gives the eye a route to follow.
*/

/*
  Denser than feels necessary on paper. Compared side by side against the
  reference at 1440x900, the earlier 62x40 grid read as noticeably sparser —
  the reference's ground is packed with small cells, and cell COUNT is what
  carries that, not line weight. Raising the count and dropping the opacity a
  little keeps the same overall brightness while making the texture finer.
*/
const COLS = 94;
const ROWS = 58;
const CELL_W = W / COLS;

/*
  The grid is laid on the ground and then looked at from low down, not drawn
  flat on the page.

  This is what makes the roads run almost horizontally across the frame, the
  way they do in the reference: a ground plane seen at a shallow angle
  compresses distance toward a horizon, so lines that would head away from you
  flatten out and stack, while the ones crossing your path stay wide. Drawn
  flat, the same grid reads as a net thrown over the screen.

  Perspective, simply: a row's distance from the viewer sets its scale, and
  everything at that distance is scaled about the vanishing point.
*/
const HORIZON = H * 0.16;   // where the furthest row converges
const CAMERA = 0.55;        // how quickly distance compresses; lower is flatter

function project(u, v) {
  // v runs 0 (far) to 1 (near); depth is what shrinks with distance.
  const depth = CAMERA + (1 - CAMERA) * v;
  return {
    x: W / 2 + (u - W / 2) * (depth / 1) * 1.9,
    y: HORIZON + (H - HORIZON) * (depth - CAMERA) / (1 - CAMERA) * 1.0,
  };
}

/* Junctions, jittered off the lattice so nothing reads as graph paper. */
const grid = [];
for (let r = 0; r <= ROWS; r++) {
  const row = [];
  for (let c = 0; c <= COLS; c++) {
    const u = c * CELL_W + (rand() - 0.5) * CELL_W * 1.05;
    const v = r / ROWS + ((rand() - 0.5) * 1.05) / ROWS;
    row.push(project(u, Math.max(0, Math.min(1, v))));
  }
  grid.push(row);
}

/*
  Towns. Without these the grid is evenly dense everywhere, which reads as
  graph paper however much each point is jittered — the reference's character
  comes from tight clusters separated by open ground.
*/
const TOWNS = 20;
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

/* Every few rows and columns carries more traffic and is drawn brighter. */
const bigRow = new Set();
const bigCol = new Set();
for (let r = 0; r <= ROWS; r++) if (rand() < 0.10) bigRow.add(r);
for (let c = 0; c <= COLS; c++) if (rand() < 0.10) bigCol.add(c);

const arterial = [];
const local = [];

/*
  Straight segments. Roads meet at shared junctions; the varied cell sizes and
  the perspective already keep the network from reading as flat graph paper,
  so a bow here only makes it look like contour lines instead of streets.
*/
function link(a, b, big) {
  const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  (big ? arterial : local).push(d);
}

for (let r = 0; r <= ROWS; r++) {
  for (let c = 0; c <= COLS; c++) {
    const here = grid[r][c];
    const bigH = bigRow.has(r);
    const bigV = bigCol.has(c);
    // Arterials run unbroken; local streets drop out here and there, which is
    // what keeps the grid from reading as graph paper.
    if (c < COLS && (bigH ? rand() < 0.96 : rand() < 0.80)) link(here, grid[r][c + 1], bigH);
    if (r < ROWS && (bigV ? rand() < 0.90 : rand() < 0.55)) link(here, grid[r + 1][c], bigV);
  }
}

/* Junctions where two arterials cross: the bright spots in the reference. */
const hubs = [];
for (const r of bigRow) for (const c of bigCol) hubs.push(grid[r][c]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.1" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="hub">
      <stop offset="0%" stop-color="#bfe8ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#bfe8ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bloom">
      <stop offset="0%" stop-color="#3ddc84" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#2aa862" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#1c7a46" stop-opacity="0"/>
    </radialGradient>
  </defs>
${towns.map((t) => `  <ellipse cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" rx="${(t.reach * 1.5).toFixed(0)}" ry="${(t.reach * 0.55).toFixed(0)}" fill="url(#bloom)"/>`).join("\n")}
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
${local.map((d) => `    <path d="${d}" stroke="#4a90c2" stroke-opacity="0.34" stroke-width="0.6"/>`).join("\n")}
  </g>
  <g filter="url(#glow)" fill="none" stroke-linecap="round" stroke-linejoin="round">
${arterial.map((d) => `    <path d="${d}" stroke="#7fc4e8" stroke-opacity="0.42" stroke-width="0.7"/>`).join("\n")}
  </g>
${hubs.map((h) => `  <circle cx="${h.x.toFixed(1)}" cy="${h.y.toFixed(1)}" r="5" fill="url(#hub)"/>`).join("\n")}
</svg>
`;

await writeFile("public/roads.svg", svg, "utf8");
console.log(
  `wrote public/roads.svg — ${arterial.length} arterials, ${local.length} streets, ` +
    `${hubs.length} junctions`,
);

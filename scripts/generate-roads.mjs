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

const COLS = 62;
const ROWS = 40;
const CELL_W = W / COLS;
const CELL_H = H / ROWS;

/* Junctions, jittered off the lattice so nothing reads as graph paper. */
const grid = [];
for (let r = 0; r <= ROWS; r++) {
  const row = [];
  for (let c = 0; c <= COLS; c++) {
    row.push({
      x: c * CELL_W + (rand() - 0.5) * CELL_W * 1.05,
      y: r * CELL_H + (rand() - 0.5) * CELL_H * 1.05,
    });
  }
  grid.push(row);
}

/* Every few rows and columns carries more traffic and is drawn brighter. */
const bigRow = new Set();
const bigCol = new Set();
for (let r = 0; r <= ROWS; r++) if (rand() < 0.10) bigRow.add(r);
for (let c = 0; c <= COLS; c++) if (rand() < 0.10) bigCol.add(c);

const arterial = [];
const local = [];

/* A gentle bow on each link; dead-straight blocks look like a wireframe. */
function link(a, b, big) {
  const mx = (a.x + b.x) / 2 + (rand() - 0.5) * 5;
  const my = (a.y + b.y) / 2 + (rand() - 0.5) * 5;
  const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  (big ? arterial : local).push(d);
}

for (let r = 0; r <= ROWS; r++) {
  for (let c = 0; c <= COLS; c++) {
    const here = grid[r][c];
    const bigH = bigRow.has(r);
    const bigV = bigCol.has(c);
    // Arterials run unbroken; local streets drop out here and there, which is
    // what keeps the grid from reading as graph paper.
    if (c < COLS && (bigH ? rand() < 0.94 : rand() < 0.72)) link(here, grid[r][c + 1], bigH);
    if (r < ROWS && (bigV ? rand() < 0.94 : rand() < 0.72)) link(here, grid[r + 1][c], bigV);
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
      <stop offset="0%" stop-color="#7bf0a6" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#7bf0a6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
${local.map((d) => `    <path d="${d}" stroke="#39ad68" stroke-opacity="0.26" stroke-width="0.4"/>`).join("\n")}
  </g>
  <g filter="url(#glow)" fill="none" stroke-linecap="round" stroke-linejoin="round">
${arterial.map((d) => `    <path d="${d}" stroke="#5ce08c" stroke-opacity="0.34" stroke-width="0.7"/>`).join("\n")}
  </g>
${hubs.map((h) => `  <circle cx="${h.x.toFixed(1)}" cy="${h.y.toFixed(1)}" r="5" fill="url(#hub)"/>`).join("\n")}
</svg>
`;

await writeFile("public/roads.svg", svg, "utf8");
console.log(
  `wrote public/roads.svg — ${arterial.length} arterials, ${local.length} streets, ` +
    `${hubs.length} junctions`,
);

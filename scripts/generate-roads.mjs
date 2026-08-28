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
  Routes, not a graph.

  Two earlier versions joined scattered points to their nearest neighbours.
  Both read as a constellation or a spiderweb, and for the same reason: a
  nearest-neighbour graph on random points triangulates, so every cell is a
  little polygon and every line ends at a vertex. Roads do not look like that.
  A road is a long continuous run that holds a heading, bends gently, and
  throws off branches — and it is the branching, not the connecting, that makes
  a network read as somewhere people drive.

  So each road here is a walk: pick a start and a heading, step forward with a
  small random turn, and occasionally spawn a child walk at an angle. Trunk
  roads are long and bright, their branches shorter and dimmer, and the third
  generation dimmer still.
*/

const trunks = [];
const branches = [];
const twigs = [];

function walk(x, y, heading, steps, wander, into) {
  const pts = [[x, y]];
  let h = heading;
  for (let i = 0; i < steps; i++) {
    h += (rand() - 0.5) * wander;
    x += Math.cos(h) * 14;
    y += Math.sin(h) * 14;
    // Let routes leave the frame; roads do not stop at the edge of a picture.
    if (x < -80 || x > W + 80 || y < -80 || y > H + 80) break;
    pts.push([x, y]);
  }
  if (pts.length > 2) into.push(pts);
  return { x, y, h, pts };
}

/* Trunks: long runs crossing the whole frame. */
for (let i = 0; i < 26; i++) {
  const edge = Math.floor(rand() * 4);
  const x = edge === 0 ? 0 : edge === 1 ? W : rand() * W;
  const y = edge === 2 ? 0 : edge === 3 ? H : rand() * H;
  const toward = Math.atan2(H / 2 - y, W / 2 - x) + (rand() - 0.5) * 1.1;
  const trunk = walk(x, y, toward, 120, 0.16, trunks);

  /* Branches leave the trunk at a shallow angle, as slip roads do. */
  for (let b = 0; b < 5; b++) {
    const at = trunk.pts[Math.floor(rand() * trunk.pts.length)];
    if (!at) continue;
    const side = rand() < 0.5 ? 1 : -1;
    const br = walk(at[0], at[1], trunk.h + side * (0.5 + rand() * 0.7), 34 + rand() * 30, 0.3, branches);

    for (let t = 0; t < 3; t++) {
      const at2 = br.pts[Math.floor(rand() * br.pts.length)];
      if (!at2) continue;
      walk(at2[0], at2[1], br.h + (rand() - 0.5) * 2.2, 10 + rand() * 16, 0.5, twigs);
    }
  }
}

const toPath = (pts) => "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");

/* Junctions: where a branch leaves a trunk, which is where light pools. */
const hubs = branches.map((b) => ({ x: b[0][0], y: b[0][1] })).filter(() => rand() < 0.45);

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
${twigs.map((p) => `    <path d="${toPath(p)}" stroke="#2f8f57" stroke-opacity="0.16" stroke-width="0.35"/>`).join("\n")}
${branches.map((p) => `    <path d="${toPath(p)}" stroke="#3faeb" stroke-opacity="0.26" stroke-width="0.5"/>`).join("\n")}
  </g>
  <g filter="url(#glow)" fill="none" stroke-linecap="round" stroke-linejoin="round">
${trunks.map((p) => `    <path d="${toPath(p)}" stroke="#5ce08c" stroke-opacity="0.42" stroke-width="0.85"/>`).join("\n")}
  </g>
${hubs.map((h) => `  <circle cx="${h.x.toFixed(1)}" cy="${h.y.toFixed(1)}" r="5" fill="url(#hub)"/>`).join("\n")}
</svg>
`;

await writeFile("public/roads.svg", svg, "utf8");
console.log(
  `wrote public/roads.svg — ${trunks.length} trunks, ${branches.length} branches, ` +
    `${twigs.length} local roads, ${hubs.length} junctions`,
);

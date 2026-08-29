/*
  Generates the road network that lies under the globe.

  ONE composition, not a tile. The previous version emitted a 1600x1000 image
  that the CSS repeated, and it did not wrap: the perspective projection put a
  blank strip across the top of every tile and a dark band below it, so on any
  window larger than the tile those discontinuities became hard rectangular
  seams. Measured on a 2560x1440 window they landed at x=480/2080 and
  y=220/1220 — a pixel discontinuity 3.3x the surrounding ground — which read
  as a box drawn around the globe. Emitting a single frame drawn with
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
const ARTERIALS = 13;

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
}

/*
  Arterials are drawn ACROSS the ground, not along the cell edges.

  The first attempt walked the Voronoi graph, always taking the straightest
  available continuation. It looked like a circuit board: cell boundaries meet
  at roughly 120 degrees, so "straightest available" still turns hard at every
  junction, and the line zigzagged around cells and closed into loops instead
  of going anywhere. The reference's bright roads plainly cut across the
  terrain rather than tracing it.

  So: a heading that drifts slowly. Start off-frame, step forward, turn by a
  small random amount each step. Momentum is what makes it read as a road —
  a line that commits to a direction for a long way, bending gently, the way a
  highway does.
*/
function drawArterial() {
  // Start outside the frame so the road enters and leaves rather than
  // beginning in mid-air. A visible endpoint reads as a broken line.
  const edge = Math.floor(rand() * 4);
  const span = rand();
  let x;
  let y;
  let heading;
  if (edge === 0) {
    x = -80;
    y = span * H;
    heading = 0;
  } else if (edge === 1) {
    x = W + 80;
    y = span * H;
    heading = Math.PI;
  } else if (edge === 2) {
    x = span * W;
    y = -80;
    heading = Math.PI / 2;
  } else {
    x = span * W;
    y = H + 80;
    heading = -Math.PI / 2;
  }
  // Fan the entry angle so roads cross at shallow angles instead of all
  // running parallel to an axis.
  heading += (rand() - 0.5) * 1.5;

  const STEP = 46;
  const MAX_STEPS = 78;
  const points = [[x, y]];
  for (let i = 0; i < MAX_STEPS; i++) {
    /*
      A very small per-step turn.

      At 0.22 the roads came out as huge continuous arcs sweeping across the
      whole frame — they read as orbital light-trails rather than as anything
      lying on the ground. Roads are mostly straight, bending occasionally.
      0.085 over a 46px step is a bend you notice across the frame's width and
      not before that.
    */
    heading += (rand() - 0.5) * 0.085;
    x += Math.cos(heading) * STEP;
    y += Math.sin(heading) * STEP;
    points.push([x, y]);
    if (x < -160 || x > W + 160 || y < -160 || y > H + 160) break;
  }
  return points;
}

const arterialPaths = [];
for (let i = 0; i < ARTERIALS; i++) {
  const path = drawArterial();
  if (path.length >= 10) arterialPaths.push(path);
}

/*
  Nodes go where two arterials actually cross.

  Genuine segment intersections, not "a vertex two walks happened to share" —
  that earlier proxy produced 84 beads strung along the roads, which read as a
  circuit diagram rather than as junctions. A real crossing is rare, which is
  what makes it worth lighting up.
*/
function segmentCrossing(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}

const nodes = [];
for (let a = 0; a < arterialPaths.length; a++) {
  for (let b = a + 1; b < arterialPaths.length; b++) {
    for (let i = 0; i + 1 < arterialPaths[a].length; i++) {
      for (let j = 0; j + 1 < arterialPaths[b].length; j++) {
        const hit = segmentCrossing(
          arterialPaths[a][i],
          arterialPaths[a][i + 1],
          arterialPaths[b][j],
          arterialPaths[b][j + 1],
        );
        if (hit && hit[0] > 0 && hit[0] < W && hit[1] > 0 && hit[1] < H) nodes.push(hit);
      }
    }
  }
}

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

/*
  Midpoint-quadratic smoothing: each vertex becomes a control point and the
  curve passes through the midpoints between them. Straight `L` segments
  between 46px steps left visible kinks at every turn, which is exactly the
  faceted look this rewrite is undoing.
*/
const pathFor = (pts) => {
  if (pts.length < 3) return pts.map((p, i) => `${i === 0 ? "M" : "L"}${num(p[0])} ${num(p[1])}`).join("");
  let d = `M${num(pts[0][0])} ${num(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${num(pts[i][0])} ${num(pts[i][1])} ${num(mx)} ${num(my)}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${num(last[0])} ${num(last[1])}`;
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <clipPath id="frame"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
    <filter id="arterial-glow" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur stdDeviation="2.4" result="b"/>
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
    <g fill="none" stroke="#5c7f9e" stroke-opacity="0.22" stroke-width="0.6" stroke-linecap="round">
${edges.map(([a, b]) => `      <path d="M${num(vx(a))} ${num(vy(a))}L${num(vx(b))} ${num(vy(b))}"/>`).join("\n")}
    </g>
    <g fill="none" stroke="#63c8ff" stroke-opacity="0.38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" filter="url(#arterial-glow)">
${arterialPaths.map((p) => `      <path d="${pathFor(p)}"/>`).join("\n")}
    </g>
${nodes.map(([x, y]) => `    <circle cx="${num(x)}" cy="${num(y)}" r="12" fill="url(#node)"/>`).join("\n")}
  </g>
</svg>
`;

await writeFile("public/roads.svg", svg, "utf8");
console.log(
  `wrote public/roads.svg — ${edges.length} cell edges, ` +
    `${arterialPaths.length} arterials, ${nodes.length} nodes`,
);

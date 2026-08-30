/*
  Generates the road network the globe sits above.

  A GROUND PLANE, not a backdrop. The roads are laid out in world coordinates
  and then projected through a camera, so they spread apart as they come
  toward the viewer and bunch together as they recede to a horizon behind the
  sphere. Drawn flat, the same network reads as a wall directly behind the
  globe; projected, it reads as ground the globe is floating over, which is
  what the reference does.

  Perspective was tried once before and reverted, but the reason it failed was
  tiling, not perspective: the image was repeated at 1600x1000, and a
  projected plane cannot wrap, so every window bigger than the tile showed
  hard seams. This is ONE composition scaled to cover, so there is nothing to
  seam against.

  No cell mesh. An earlier version laid a Lloyd-relaxed Voronoi diagram under
  the roads for texture; at the sizes that read well it looked like a
  honeycomb, which is a pattern with a strong identity of its own that has
  nothing to do with roads.

  Deterministic: fixed seed, so the committed SVG never churns in a diff.

    node scripts/generate-roads.mjs

  Writes public/roads.svg.
*/

import { writeFile } from "node:fs/promises";

const W = 2560;
const H = 1440;

/*
  The camera.

  HORIZON sits high enough that the plane fills most of the frame and the
  vanishing point falls behind the globe rather than below it. T is distance
  from the viewer: T_NEAR lands at the bottom edge, T_FAR just under the
  horizon. Screen scale is T_NEAR/T, which is what makes distance compress.
*/
const HORIZON = H * 0.2;
const T_NEAR = 1.0;
const T_FAR = 9.0;
const SPREAD = W * 0.62;

/*
  The vanishing point sits right of centre, not on the axis.

  Everything receding converges here, so where it sits IS the camera angle.
  Centred, the plane is seen head-on and the roads leave as a symmetrical fan,
  which reads as a road going into the distance rather than as country the
  globe is hanging over. Pushed to 0.72 the whole plane runs away toward the
  upper right, which is the oblique view the reference has.
*/
const VANISH_X = W * 0.72;

function project(x, t) {
  const s = T_NEAR / t;
  return { x: VANISH_X + x * SPREAD * s, y: HORIZON + (H - HORIZON) * s, s };
}

/* Mulberry32 — small, seeded, and good enough for scattering points. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let a = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260830);

/*
  Two families of roads, both DIAGONAL in world space.

  The previous version had one family running across the view and one running
  away from it. Projected, the first came out horizontal and the second came
  out as spokes converging on the vanishing point — so the picture was built
  entirely from horizontals and verticals, which is exactly what the reference
  is not. Its roads cut across the ground at an angle, and the ground itself is
  seen obliquely.

  Giving every road a heading well away from both axes fixes that: none of them
  is horizontal on screen, none is a spoke, and because they are still parallel
  within a family they still converge — so the depth survives while the
  character changes completely.
*/
const ROADS = 64;

function road() {
  /*
    Two headings, roughly +32 and -36 degrees in world space, each jittered.

    Two rather than uniformly random because a road network has grain: roads
    tend to run with or across the lie of the land, and a set of headings
    scattered evenly reads as a scribble. Kept away from 0 (which projects to
    horizontal) and from +/-90 (which projects to a spoke through the
    vanishing point).
  */
  const base = rand() < 0.5 ? 0.56 : -0.63;
  const theta = base + (rand() - 0.5) * 0.42;
  const x0 = (rand() - 0.5) * 26;
  /*
    Biased toward the near ground.

    Perspective spreads the closest roads furthest apart, so a distribution
    that is uniform in DISTANCE leaves the bottom of the frame nearly bare
    while the far half packs together. Weighting toward small t puts roads
    where the plane is widest, which is where the eye has most room to notice
    they are missing.
  */
  const t0 = T_NEAR + (T_FAR - T_NEAR) * Math.pow(rand(), 1.9);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const pts = [];
  for (let u = -20; u <= 20; u += 0.22) {
    const t = t0 + u * sin;
    // Behind the camera, or so far off it contributes nothing but a stray
    // pixel at the horizon.
    if (t < T_NEAR * 0.85 || t > T_FAR * 1.8) continue;
    pts.push(project(x0 + u * cos, t));
  }
  return pts;
}

const roads = Array.from({ length: ROADS }, road).filter((r) => r.length > 3);

/*
  Intersections, found in screen space after projection.

  Doing it here rather than in world coordinates means a crossing road and a
  receding road at genuinely different distances do not light up just because
  their paths overlap on screen — the depth check below rejects those.
*/
function crossing(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const a = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const b = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (a < 0 || a > 1 || b < 0 || b > 1) return null;
  return { x: p1.x + a * (p2.x - p1.x), y: p1.y + a * (p2.y - p1.y), s: p1.s };
}

const nodes = [];
for (let i = 0; i < roads.length; i++) {
  for (let j = i + 1; j < roads.length; j++) {
    for (let a = 0; a + 1 < roads[i].length; a++) {
      for (let b = 0; b + 1 < roads[j].length; b++) {
        const hit = crossing(roads[i][a], roads[i][a + 1], roads[j][b], roads[j][b + 1]);
        if (!hit) continue;
        if (hit.x < 0 || hit.x > W || hit.y < HORIZON || hit.y > H) continue;
        nodes.push(hit);
      }
    }
  }
}

const num = (n) => n.toFixed(1);

/*
  Emitted per segment, not per road, so weight and brightness can follow
  distance.

  A road drawn at one width the whole way across is the single clearest tell
  that a picture is flat. Scaling both with the same perspective factor the
  geometry already uses costs nothing and does most of the work of making the
  plane read as receding.
*/
const segments = [];
for (const road of roads) {
  for (let i = 0; i + 1 < road.length; i++) {
    const a = road[i];
    const b = road[i + 1];
    if (a.y < HORIZON && b.y < HORIZON) continue;
    const s = (a.s + b.s) / 2;
    const width = Math.max(0.35, 2.1 * s);
    // Fades out toward the horizon rather than stopping at it, so the plane
    // dissolves into the distance instead of ending on a line.
    const opacity = Math.max(0, Math.min(0.5, 0.62 * Math.pow(s, 0.55)));
    if (opacity < 0.02) continue;
    segments.push(
      `<path d="M${num(a.x)} ${num(a.y)}L${num(b.x)} ${num(b.y)}" stroke-width="${width.toFixed(2)}" stroke-opacity="${opacity.toFixed(3)}"/>`,
    );
  }
}

/* Green bloom, sitting on the plane so it recedes with everything else. */
const blooms = Array.from({ length: 7 }, () => {
  const p = project((rand() - 0.5) * 7, T_NEAR + rand() * (T_FAR - T_NEAR) * 0.7);
  return { x: p.x, y: p.y, rx: 300 * p.s + 90, ry: 130 * p.s + 40, o: 0.05 + rand() * 0.07 };
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <clipPath id="frame"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
    <filter id="glow" x="-12%" y="-12%" width="124%" height="124%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="node">
      <stop offset="0%" stop-color="#e6f6ff" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="#9ad8ff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#9ad8ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bloom">
      <stop offset="0%" stop-color="#3ddc84" stop-opacity="1"/>
      <stop offset="55%" stop-color="#2aa862" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#1c7a46" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g clip-path="url(#frame)">
${blooms.map((b) => `    <ellipse cx="${num(b.x)}" cy="${num(b.y)}" rx="${num(b.rx)}" ry="${num(b.ry)}" fill="url(#bloom)" opacity="${b.o.toFixed(3)}"/>`).join("\n")}
    <g fill="none" stroke="#9ad8ff" stroke-linecap="round" filter="url(#glow)">
${segments.map((d) => `      ${d}`).join("\n")}
    </g>
${nodes.map((n) => `    <circle cx="${num(n.x)}" cy="${num(n.y)}" r="${Math.max(4, 15 * n.s).toFixed(1)}" fill="url(#node)"/>`).join("\n")}
  </g>
</svg>
`;

await writeFile("public/roads.svg", svg, "utf8");
console.log(
  `wrote public/roads.svg — ${roads.length} roads, ${segments.length} segments, ${nodes.length} junctions`,
);

/*
  A side-profile car, drawn rather than photographed.

  Drawn because it has to be recoloured, scaled and animated freely, and
  because a licensed photograph or 3D render is a dependency this page should
  not wait on. Side profile because that is the view that reads as "car" at
  any size — a three-quarter view needs detail to be legible, a silhouette
  from the side does not.

  One light source, from above: the roof and upper body are lighter, the
  sills and wheel arches darker. Same rule as every other surface here.
*/
export function Car({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 150" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2C7B4E" />
          <stop offset="52%" stopColor="#1E6239" />
          <stop offset="100%" stopColor="#14472A" />
        </linearGradient>
        <linearGradient id="car-glass" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#D9E6DE" />
          <stop offset="60%" stopColor="#9DB4A8" />
          <stop offset="100%" stopColor="#7C948A" />
        </linearGradient>
        <radialGradient id="wheel-hub">
          <stop offset="0%" stopColor="#E8ECE9" />
          <stop offset="55%" stopColor="#AEB6B1" />
          <stop offset="100%" stopColor="#6E7873" />
        </radialGradient>
      </defs>

      {/* contact shadow — grounds the car so it is not floating */}
      <ellipse cx="210" cy="132" rx="176" ry="9" fill="rgba(30,33,29,0.16)" />

      {/* body */}
      <path
        d="M34 112
           C24 112 16 104 16 94
           L16 84 C16 76 22 70 30 68
           L92 56 C104 40 122 30 150 27
           L246 27 C276 29 300 40 320 57
           L372 68 C390 72 402 80 402 92
           L402 96 C402 105 394 112 384 112
           Z"
        fill="url(#car-body)"
      />
      {/* the roofline highlight: the edge catching the overhead light */}
      <path
        d="M96 55 C108 39 126 30 152 28 L244 28 C272 30 296 41 316 57"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* glasshouse */}
      <path d="M112 55 C122 42 138 35 158 34 L196 34 L196 55 Z" fill="url(#car-glass)" />
      <path d="M206 34 L240 34 C262 36 280 44 296 55 L206 55 Z" fill="url(#car-glass)" />

      {/* sill shadow, so the body reads as having a bottom edge */}
      <path d="M40 108 L380 108" stroke="rgba(0,0,0,0.28)" strokeWidth="5" strokeLinecap="round" />

      {/* wheels */}
      {[124, 300].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="108" r="30" fill="#151816" />
          <circle cx={cx} cy="108" r="16" fill="url(#wheel-hub)" />
          <circle cx={cx} cy="108" r="5" fill="#4A534E" />
        </g>
      ))}
    </svg>
  );
}

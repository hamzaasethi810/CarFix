/*
  A side-profile supercar.

  Drawn rather than photographed: it has to be recoloured, scaled and animated
  freely, and a licensed photograph or render is a dependency this page should
  not wait on. Side profile because that is the view that reads as "car" at
  any size; a three-quarter view needs detail to stay legible, a silhouette
  from the side does not.

  Low and long on purpose. A supercar reads from its proportions before any of
  its details: a roofline that sits barely above the wheel tops, a long dash
  to front axle, and a cabin pushed back toward the rear wheels. Get those
  three wrong and no amount of surface detail rescues it.

  One light source, from above, like every other surface here: the upper body
  is lighter, the sills and arches fall away dark.
*/
export function Car({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 150" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0553F" />
          <stop offset="34%" stopColor="#D8331F" />
          <stop offset="72%" stopColor="#A81E10" />
          <stop offset="100%" stopColor="#6E120A" />
        </linearGradient>
        <linearGradient id="sc-glass" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor="#DCE6E8" />
          <stop offset="55%" stopColor="#8FA3AA" />
          <stop offset="100%" stopColor="#5E7178" />
        </linearGradient>
        <radialGradient id="sc-hub">
          <stop offset="0%" stopColor="#F2F4F3" />
          <stop offset="52%" stopColor="#B8C0BC" />
          <stop offset="100%" stopColor="#5F6A65" />
        </radialGradient>
      </defs>

      {/* contact shadow, so it sits on the road rather than floating over it */}
      <ellipse cx="240" cy="126" rx="200" ry="7" fill="rgba(30,33,29,0.2)" />

      {/*
        The body is a wedge.

        Proportion is the whole trick, and the first attempt got it wrong: a
        roof at a third of the overall height and a tall greenhouse read as a
        saloon however red it was. A supercar's roof sits barely above the
        wheel tops, the nose is lower than the front axle, and the cabin is
        pushed back so the dash-to-axle length dominates. Those three do the
        work; surface detail cannot rescue them.
      */}
      <path
        d="M18 100
           C10 100 6 95 8 88
           L14 78 C18 71 26 67 38 65
           L150 52
           C186 40 214 34 246 33
           L296 33 C330 35 356 42 374 52
           L448 66 C464 70 474 76 474 86
           L474 94 C474 98 470 100 464 100
           Z"
        fill="url(#sc-body)"
      />
      {/* the roofline catching the overhead light */}
      <path
        d="M152 51 C188 39 216 34 248 33 L294 33 C328 35 354 43 372 53"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* a low, raked cabin set back over the rear axle */}
      <path d="M176 50 C204 40 230 36 256 36 L282 36 L282 50 Z" fill="url(#sc-glass)" />
      <path d="M292 36 L300 36 C324 38 344 44 358 51 L292 51 Z" fill="url(#sc-glass)" />

      {/* side intake: the one detail that says the engine is behind the cabin */}
      <path d="M312 66 L360 62 L364 76 L312 78 Z" fill="rgba(0,0,0,0.36)" />

      {/* sill shadow gives the body a bottom edge */}
      <path d="M36 96 L456 96" stroke="rgba(0,0,0,0.32)" strokeWidth="5" strokeLinecap="round" />

      {/* wheels fill their arches the way a low car's do */}
      {[126, 372].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="98" r="28" fill="#14100F" />
          <circle cx={cx} cy="98" r="13.5" fill="url(#sc-hub)" />
          <circle cx={cx} cy="98" r="4" fill="#4A524E" />
        </g>
      ))}
    </svg>
  );
}

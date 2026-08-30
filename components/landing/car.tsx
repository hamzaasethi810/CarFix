/*
  A generic mid-engined exotic, in profile, that comes apart.

  Drawn rather than photographed: the sequence needs the clamshell to hinge,
  the paint to change and the exhaust to light, at any size, with no asset
  pipeline and no licence. A rendered model would look better and is a
  straight swap later — the props below are the contract, not the drawing.

  Generic on purpose. A named car lives or dies on details a flat drawing
  cannot carry, and getting them slightly wrong reads worse than not
  attempting them. An exotic reads from proportion alone: a nose lower than
  the front axle, the cabin pushed forward so the screen sits almost over the
  front wheel, a long deck behind it covering the engine, and a rear haunch
  taller than the roof. Those four are the whole silhouette.

  Lit from above, like every other surface on this site.
*/
export function Car({
  className = "",
  /** 0 shut, 1 fully raised. The bonnet hinges at its rear edge. */
  hood = 0,
  /** Body colour. Any CSS colour; the shading is derived from it. */
  paint = "#27703F",
  /** 0 off, 1 lit. The tailpipe glow, for the exhaust beat. */
  exhaust = 0,
}: {
  className?: string;
  hood?: number;
  paint?: string;
  exhaust?: number;
}) {
  return (
    <svg viewBox="0 -46 480 196" className={className} aria-hidden="true" focusable="false">
      <defs>
        {/*
          One gradient, driven by the `paint` prop.

          The light and dark stops are the same colour with a white or black
          overlay rather than three hand-picked colours: that way any paint
          value stays lit from the same direction, and a colour change cannot
          accidentally invert the shading.
        */}
        {/*
          The paint.

          Gradient stops cannot be transitioned, so a colour change would snap.
          The body is therefore painted in two layers: a flat fill that CAN
          transition, with the light-and-shade gradient laid over it as pure
          white and black. The shading never changes, only what is underneath
          it, so any colour stays lit from the same direction.
        */}
        <linearGradient id="sl-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="34%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="72%" stopColor="#000" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="sl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={paint} stopOpacity="1" />
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="38%" stopColor={paint} />
          <stop offset="78%" stopColor={paint} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="sl-paint-flat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="45%" stopColor={paint} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="sl-glass" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor="#DCE6E8" />
          <stop offset="55%" stopColor="#8FA3AA" />
          <stop offset="100%" stopColor="#5E7178" />
        </linearGradient>
        <radialGradient id="sl-hub">
          <stop offset="0%" stopColor="#F2F4F3" />
          <stop offset="52%" stopColor="#B8C0BC" />
          <stop offset="100%" stopColor="#5F6A65" />
        </radialGradient>
        <radialGradient id="sl-flame">
          <stop offset="0%" stopColor="#FFF4D6" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FFB65C" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF8A3D" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="240" cy="129" rx="196" ry="7" fill="rgba(30,33,29,0.2)" />

      {/* The bay under the clamshell, revealed as it lifts. */}
      <g
        style={{ opacity: hood, transition: "opacity 500ms ease-out" }}
      >
        <rect x="52" y="60" width="96" height="22" rx="3" fill="#2B322D" />
        <rect x="60" y="65" width="80" height="5" rx="2.5" fill="#59635C" />
        <rect x="64" y="73" width="28" height="5" rx="2.5" fill="#7C8880" />
        <rect x="100" y="73" width="36" height="5" rx="2.5" fill="#49524C" />
      </g>

      {/*
        Body, minus the front clamshell, which hinges separately.

        The nose sits below the front axle line, the screen base is barely
        behind the front wheel, and the deck runs long and flat to a high tail.
      */}
      <path
        d="M20 106
           C12 106 7 101 8 93
           L11 86 C13 79 20 75 30 74
           L104 68
           L150 48 C168 40 190 36 214 36
           L262 36 C286 38 300 46 310 60
           L330 74
           L430 82 C452 85 466 92 468 100
           L468 102 C468 105 464 106 458 106
           Z"
        fill={paint}
        style={{ transition: "fill 700ms cubic-bezier(0.23, 1, 0.32, 1)" }}
      />
      <path
        d="M20 106
           C12 106 7 101 8 93
           L11 86 C13 79 20 75 30 74
           L104 68
           L150 48 C168 40 190 36 214 36
           L262 36 C286 38 300 46 310 60
           L330 74
           L430 82 C452 85 466 92 468 100
           L468 102 C468 105 464 106 458 106
           Z"
        fill="url(#sl-shade)"
      />

      {/*
        The clamshell, hinged at its rear edge where a real one is, so raising
        it swings the nose up and leaves the scuttle in place.
      */}
      {/*
        The clamshell, hinged at its rear edge where a real one is, so raising
        it swings the nose up and leaves the scuttle in place.

        Rotated in CSS rather than via the SVG `transform` attribute, with
        `transformBox: view-box` so the origin resolves in viewBox units. That
        is what makes the lift a transition the compositor can run; the
        attribute form would snap between beats.
      */}
      <g
        style={{
          /*
            translate → rotate → translate back, rather than a bare rotate
            with `transform-origin`.

            `transform-box` decides what an SVG transform-origin is measured
            against, and browsers do not agree on the default: the first
            version set `view-box` and the panel still rotated about the
            element's own corner, swinging the bonnet down through the road
            instead of lifting it. Carrying the pivot in the transform itself
            depends on nothing.
          */
          transform: `translate(150px, 64px) rotate(${hood * 38}deg) translate(-150px, -64px)`,
          transition: "transform 700ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <path
          d="M30 74 L104 68 L150 48 L152 66 L104 74 L33 80 Z"
          fill={paint}
          style={{ transition: "fill 700ms cubic-bezier(0.23, 1, 0.32, 1)" }}
        />
        <path d="M30 74 L104 68 L150 48 L152 66 L104 74 L33 80 Z" fill="url(#sl-shade)" />
        <path d="M38 75 L146 68" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.6" />
      </g>

      {/* roofline */}
      <path
        d="M152 47 C170 39 192 35 216 35 L260 35 C284 37 298 45 308 59"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* cabin, pushed forward over the front axle */}
      <path d="M160 62 C178 45 198 39 220 38 L244 38 L244 62 Z" fill="url(#sl-glass)" />
      <path d="M252 38 L258 38 C280 40 292 47 300 58 L252 58 Z" fill="url(#sl-glass)" />

      {/* the side intake: the detail that says the engine is behind you */}
      <path d="M306 70 L352 66 L358 82 L306 84 Z" fill="rgba(0,0,0,0.4)" />
      <path d="M312 73 L348 70" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />

      {/* sill and the crease along flat flanks */}
      <path d="M44 92 L448 88" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.4" />
      <path d="M50 100 L444 97" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4.5" strokeLinecap="round" />

      {/* Titanium pipes, and their heat when the exhaust beat runs. */}
      <g>
        <circle
          cx="472"
          cy="99"
          r={10 + exhaust * 14}
          fill="url(#sl-flame)"
          style={{ opacity: exhaust, transition: "opacity 450ms ease-out, r 450ms ease-out" }}
        />
        {[95, 104].map((cy) => (
          <g key={cy}>
            <rect x="452" y={cy - 4} width="22" height="8" rx="4" fill="#9AA3A6" />
            <rect x="452" y={cy - 4} width="22" height="3" rx="1.5" fill="#D6DCDE" opacity="0.85" />
            <ellipse cx="473" cy={cy} rx="2.6" ry="3.6" fill="#3B4245" />
          </g>
        ))}
      </g>

      {[118, 372].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="100" r="29" fill="#14100F" />
          <circle cx={cx} cy="100" r="15" fill="url(#sl-hub)" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={cx + Math.cos(a) * 9.2}
                cy={100 + Math.sin(a) * 9.2}
                r="2.1"
                fill="#5A625D"
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}

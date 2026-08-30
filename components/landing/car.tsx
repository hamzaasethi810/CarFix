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
    <svg viewBox="0 -46 496 196" className={className} aria-hidden="true" focusable="false">
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

      <ellipse cx="238" cy="106" rx="196" ry="8" fill="rgba(30,33,29,0.22)" />

      {/*
        The body.

        LOW POINTED NOSE on the left, HIGH BLUNT TAIL on the right. An earlier
        version had those the other way round, which made the silhouette read
        as facing right — so the bonnet looked like it was at the back and the
        pipes at the front, even though both were on the correct ends. Which
        way a car faces is decided by this profile, not by where the details
        are hung.
      */}
      <path
        d="M14 96
           L18 85 C21 76 29 72 41 70
           L150 66
           L208 41 C219 37 230 36 242 36
           L278 36 C292 37 302 42 309 51
           L352 64
           L440 68 C458 70 468 75 470 84
           L470 96
           C470 101 466 104 458 104
           L26 104
           C18 104 13 101 14 96
           Z"
        fill={paint}
        style={{ transition: "fill 700ms cubic-bezier(0.23, 1, 0.32, 1)" }}
      />
      <path
        d="M14 96
           L18 85 C21 76 29 72 41 70
           L150 66
           L208 41 C219 37 230 36 242 36
           L278 36 C292 37 302 42 309 51
           L352 64
           L440 68 C458 70 468 75 470 84
           L470 96
           C470 101 466 104 458 104
           L26 104
           C18 104 13 101 14 96
           Z"
        fill="url(#sl-shade)"
      />

      {/*
        The bay, drawn AFTER the body and BEFORE the clamshell.

        It was painted first, which put it behind the bodywork: lifting the
        bonnet revealed more paint instead of an engine. Paint order is the
        whole mechanism here — the bay has to sit between the body it is set
        into and the panel that covers it.
      */}
      <g style={{ opacity: hood, transition: "opacity 500ms ease-out" }}>
        <path d="M46 74 L146 66 L148 80 L50 86 Z" fill="#242A26" />
        <rect x="58" y="70" width="72" height="5" rx="2.5" fill="#5C665F" />
        <rect x="62" y="78" width="26" height="5" rx="2.5" fill="#828E86" />
        <rect x="96" y="77" width="38" height="5" rx="2.5" fill="#49524C" />
      </g>


      {/*
        The clamshell, hinged at the scuttle where a real one is.

        The angle is POSITIVE: SVG's y axis points down, so a positive angle
        turns clockwise on screen, and the bonnet lies to the LEFT of its
        hinge, which makes clockwise the direction that lifts it. Negative
        swung the nose down through the road.

        translate -> rotate -> translate back, rather than a bare rotate with
        `transform-origin`: browsers disagree on what `transform-box` makes
        that origin relative to, and carrying the pivot in the transform
        depends on nothing.
      */}
      <g
        style={{
          transform: `translate(151px, 67px) rotate(${hood * 40}deg) translate(-151px, -67px)`,
          transition: "transform 700ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <path
          d="M18 85 C21 76 29 72 41 70 L150 66 L152 78 L44 84 L20 93 Z"
          fill={paint}
          style={{ transition: "fill 700ms cubic-bezier(0.23, 1, 0.32, 1)" }}
        />
        <path
          d="M18 85 C21 76 29 72 41 70 L150 66 L152 78 L44 84 L20 93 Z"
          fill="url(#sl-shade)"
        />
        {/* the shut line, and the headlight it runs into */}
        <path d="M34 78 L148 70" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" />
        <path d="M22 84 L46 80 L48 88 L24 91 Z" fill="#E9EEF0" opacity="0.85" />
      </g>

      {/* roofline catching the overhead light */}
      <path
        d="M210 40 C221 37 232 36 243 36 L277 36 C291 37 301 42 308 51"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* glasshouse, raked hard, pushed forward over the front axle */}
      <path d="M164 64 L210 42 C221 39 232 38 243 38 L248 38 L248 64 Z" fill="url(#sl-glass)" />
      <path d="M256 38 L276 38 C289 39 298 44 304 52 L310 62 L256 62 Z" fill="url(#sl-glass)" />
      {/* the pillar between them */}
      <path d="M248 38 L256 38 L256 64 L248 64 Z" fill="rgba(0,0,0,0.22)" />

      {/* side intake ahead of the rear arch: the engine is behind the cabin */}
      <path d="M312 70 L356 66 L362 82 L312 84 Z" fill="rgba(0,0,0,0.42)" />
      <path d="M318 73 L352 70" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />

      {/* door shut line and the crease down flat flanks */}
      <path d="M168 62 L172 96" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.2" />
      <path d="M40 84 L448 80" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.3" />
      <path d="M44 99 L446 96" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="4" strokeLinecap="round" />

      {/* Titanium pipes, low on the tail face, and their heat. */}
      <g>
        <circle cx="483" cy="94" r={9 + exhaust * 14} fill="url(#sl-flame)"
          style={{ opacity: exhaust, transition: "opacity 450ms ease-out, r 450ms ease-out" }} />
        {[89, 98].map((cy) => (
          <g key={cy}>
            <rect x="463" y={cy - 4} width="20" height="8" rx="4" fill="#9AA3A6" />
            <rect x="463" y={cy - 4} width="20" height="3" rx="1.5" fill="#DCE2E4" opacity="0.85" />
            <ellipse cx="482" cy={cy} rx="2.4" ry="3.4" fill="#3B4245" />
          </g>
        ))}
      </g>

      {/*
        Arch shading.

        Drawn as a thin dark arc hugging the top of each wheel, not as an
        ellipse. The first attempt used ellipses painted after the body, which
        put a dark blob ON the paint around each wheel instead of a shadow
        under the arch — the wheels looked stuck to the side of the car rather
        than sitting inside it.
      */}
      {[112, 368].map((cx) => (
        <path
          key={cx}
          d={`M${cx - 31} 100 A31 31 0 0 1 ${cx + 31} 100`}
          fill="none"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="7"
        />
      ))}

      {[112, 368].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="98" r="28" fill="#14100F" />
          <circle cx={cx} cy="98" r="21" fill="#241F1D" />
          <circle cx={cx} cy="98" r="15" fill="url(#sl-hub)" />
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <rect
                key={i}
                x={cx - 1.4}
                y={98 - 15}
                width="2.8"
                height="11"
                rx="1.4"
                fill="#8C948F"
                transform={`rotate(${(i / 10) * 360} ${cx} 98)`}
              />
            );
          })}
          <circle cx={cx} cy="98" r="4.5" fill="#5A625D" />
        </g>
      ))}

    </svg>
  );
}

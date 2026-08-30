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
        {/*
          `userSpaceOnUse`, not the default.

          SVG gradients are objectBoundingBox by default, so each element gets
          its own copy of the ramp squeezed into its own height. The bonnet is
          a short panel, so it received the entire sky-to-ground gradient
          across 25 units and came out a visibly different colour from the body
          it sits on. In user space every panel is lit by the same gradient at
          the same height, which is what "one light source" has to mean.
        */}
        <linearGradient id="sl-shade" gradientUnits="userSpaceOnUse" x1="0" y1="29" x2="0" y2="104">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="10%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="45%" stopColor="#000" stopOpacity="0.06" />
          <stop offset="47%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="52%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="72%" stopColor="#000" stopOpacity="0.14" />
          <stop offset="90%" stopColor="#000" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.62" />
        </linearGradient>
        {/*
          The horizon reflection, as a separate band.

          The single most useful thing on the whole drawing. Real bodywork is a
          mirror: the top surfaces reflect the sky and the flanks below the
          shoulder reflect the ground, and the two meet at a hard bright line
          running the length of the car. A smooth top-to-bottom ramp has no
          such line, which is why it reads as plastic no matter how many stops
          it has.
        */}
        <linearGradient id="sl-ground" gradientUnits="userSpaceOnUse" x1="0" y1="80" x2="0" y2="104">
          <stop offset="0%" stopColor="#B8AE9C" stopOpacity="0" />
          <stop offset="55%" stopColor="#B8AE9C" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#8A806E" stopOpacity="0.34" />
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
        {/*
          Glass reflects at a different angle from paint, so its light band is
          diagonal rather than horizontal. Sharing the body's gradient is what
          made the windows look like painted panels.
        */}
        <linearGradient id="sl-glass" x1="0.1" y1="0" x2="0.75" y2="1">
          <stop offset="0%" stopColor="#F2F7F8" />
          <stop offset="28%" stopColor="#C3D2D6" />
          <stop offset="30%" stopColor="#8DA2A9" />
          <stop offset="72%" stopColor="#6E838B" />
          <stop offset="100%" stopColor="#48575D" />
        </linearGradient>
        {/* A lens, not a white slab: bright at the top, deep at the bottom. */}
        <linearGradient id="sl-lens" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#FBFDFD" />
          <stop offset="45%" stopColor="#C8D6DA" />
          <stop offset="100%" stopColor="#7E9198" />
        </linearGradient>
        <linearGradient id="sl-tyre" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#3A3634" />
          <stop offset="42%" stopColor="#1B1817" />
          <stop offset="100%" stopColor="#0B0A09" />
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

      {/* What the lower flank is reflecting: warm ground, not more sky. */}
      <path
        d="M20 88 L468 84 L470 96 C470 101 466 104 458 104 L26 104 C18 104 13 101 14 96 Z"
        fill="url(#sl-ground)"
      />

      {/*
        The specular: a thin hard highlight where the top surfaces turn over.
        Paint has one; a gradient alone never produces it.
      */}
      <path
        d="M44 70 L148 65"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M214 39 C224 37 234 36 244 36 L276 36"
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinecap="round"
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
        <path d="M22 84 L46 80 L48 88 L24 91 Z" fill="url(#sl-lens)" />
        <path d="M24 85 L44 82" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round" />
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
        Arch shading: a tight dark lip, not a band.

        This was a 7-unit stroke at 45% black, which read as two stripes
        painted across the flank rather than shadow inside an arch. The tyres
        carry their own depth now, so this only has to darken the few units
        where body meets wheel.
      */}
      {[112, 368].map((cx) => (
        <path
          key={cx}
          d={`M${cx - 29} 99 A29 29 0 0 1 ${cx + 29} 99`}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="3"
        />
      ))}

      {[112, 368].map((cx) => (
        <g key={cx}>
          {/* tyre, lit from above like everything else */}
          <circle cx={cx} cy="98" r="28" fill="url(#sl-tyre)" />
          {/* the sidewall's inner edge, which is what gives a tyre depth */}
          <circle cx={cx} cy="98" r="21.5" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="2" />
          {/* brake disc, visible between the spokes */}
          <circle cx={cx} cy="98" r="17" fill="#4A4F4C" />
          <circle cx={cx} cy="98" r="17" fill="none" stroke="#2B2F2D" strokeWidth="1.4" />
          {/* caliper */}
          <path
            d={`M${cx - 4} ${98 - 16} a16 16 0 0 0 -11 9 l4 3 a12 12 0 0 1 8 -7 Z`}
            fill="#8A3B2E"
          />
          <circle cx={cx} cy="98" r="13" fill="url(#sl-hub)" />
          {Array.from({ length: 10 }).map((_, i) => (
            <rect
              key={i}
              x={cx - 1.3}
              y={98 - 13}
              width="2.6"
              height="9.5"
              rx="1.3"
              fill="#9AA29D"
              transform={`rotate(${(i / 10) * 360} ${cx} 98)`}
            />
          ))}
          <circle cx={cx} cy="98" r="4" fill="#6B736E" />
          <circle cx={cx} cy="98" r="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        </g>
      ))}

    </svg>
  );
}

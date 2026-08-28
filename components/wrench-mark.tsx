/*
  The mark: a combination wrench, laid diagonally, cut from the same alloy as
  the buttons.

  Drawn rather than imported so it takes its metal from a gradient the page
  controls, matching `.machined` — a flat PNG of a wrench would sit on this
  ground as a sticker, which is the failure the whole material system exists to
  avoid. It also scales to any header height without a second asset.

  The diagonal is the point: a wrench lying square reads as an icon in a UI
  kit, and one at an angle reads as a tool set down on a bench.
*/
export function WrenchMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      /*
        Decorative. The wordmark beside it is real text and already names the
        link; labelling this too would have a screen reader announce "Gaari"
        twice for one destination.
      */
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/*
          Lit from the upper left, like every other surface here: bright along
          the top edge, falling to a dark underside, with a returning sheen so
          it reads as round bar stock rather than a flat cut-out.
        */}
        <linearGradient id="wrench-alloy" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#f2f5f3" />
          <stop offset="30%" stopColor="#c8cecb" />
          <stop offset="52%" stopColor="#8e9490" />
          <stop offset="70%" stopColor="#b4bab6" />
          <stop offset="100%" stopColor="#6f7571" />
        </linearGradient>
        <linearGradient id="wrench-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </linearGradient>
      </defs>

      {/*
        One path, rotated. The open jaw at one end and the ring at the other
        are what make it read as a combination spanner rather than a bone.
      */}
      <g transform="rotate(-38 32 32)">
        {/* shaft */}
        <rect x="27.5" y="13" width="9" height="37" rx="4.5" fill="url(#wrench-alloy)" />

        {/* open jaw */}
        <path
          d="M21.5 15 L21.5 6.5 L26.5 3 L26.5 11.5 L37.5 11.5 L37.5 3 L42.5 6.5 L42.5 15
             C42.5 19.8 38.5 22.5 32 22.5 C25.5 22.5 21.5 19.8 21.5 15 Z"
          fill="url(#wrench-alloy)"
        />

        {/* ring end */}
        <circle cx="32" cy="49.5" r="11" fill="url(#wrench-alloy)" />
        <circle cx="32" cy="49.5" r="5.4" fill="#0A1410" />

        {/* the lit top edge, which is what sells it as metal rather than grey */}
        <rect x="27.5" y="13" width="9" height="1.6" rx="0.8" fill="url(#wrench-edge)" opacity="0.9" />
      </g>
    </svg>
  );
}

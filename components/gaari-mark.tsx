/*
  The Gaari mark: a car in forest green, with the name on its plate.

  A side profile, because that silhouette still reads as a car at favicon size.
  The plate sits on the rear overhang, clear of the wheel — the first version
  had it across the middle of the door with the wheel drawn over the top of it,
  which is not where a plate goes and cut the word in half.

  It is larger than a real plate would be in proportion. At the size a header
  logo renders, an accurate one would be a white smudge, and the word is the
  whole point of it.

  Flat fills, no gradients: gradients turn to mud below about twenty pixels.
*/
export function GaariMark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 108 40" className={className} role="img" aria-label="Gaari" fill="none">
      {/* Body: one shape from rear bumper to bonnet. */}
      <path
        fill="#1E5631"
        d="M4 32v-9.6c0-2 1.4-3.8 3.4-4.2l12.2-2.6 8.2-8A6.4 6.4 0 0 1 32.3 5.7h30.9a6.4 6.4 0 0 1 4.5 1.9l8.2 8.2 12.6 2.7c2 .4 3.5 2.2 3.5 4.2V32a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 32Z"
      />

      {/* Greenhouse, split by the B-pillar. */}
      <path
        fill="#BFD8C6"
        d="M33.4 9.6h13v7.2H26l5.9-6.6a2 2 0 0 1 1.5-.6Zm17.3 0h11.6c.6 0 1.1.2 1.5.6l6.4 7.2H50.7V9.6Z"
      />

      {/* Plate, on the rear overhang and clear of the wheel behind it. */}
      <rect x="7.5" y="22" width="20" height="8.6" rx="1.7" fill="#F4F4EF" />
      <rect x="7.5" y="22" width="20" height="8.6" rx="1.7" stroke="#143D23" strokeWidth="1.1" />
      <text
        x="17.5"
        y="28.7"
        textAnchor="middle"
        fill="#143D23"
        fontSize="6.2"
        fontWeight="700"
        letterSpacing="0.2"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        gaari
      </text>

      {/* Wheels, on the body's baseline. */}
      <circle cx="36" cy="34" r="6.6" fill="#14181A" />
      <circle cx="36" cy="34" r="2.7" fill="#BFD8C6" />
      <circle cx="79" cy="34" r="6.6" fill="#14181A" />
      <circle cx="79" cy="34" r="2.7" fill="#BFD8C6" />
    </svg>
  );
}

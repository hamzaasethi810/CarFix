/*
  The Gaari mark: the back of a car, with the name on its plate.

  A rear view rather than a side profile because the plate is the whole idea —
  from behind it sits square to the viewer and can be large enough to read,
  where on a side profile it is a sliver on the bumper. The mark carries the
  name on its own, so nothing needs to be set beside it.

  Flat fills, no gradients: gradients turn to mud below about twenty pixels.
*/
export function GaariMark({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 76" className={className} role="img" aria-label="Gaari" fill="none">
      {/* Tyres, behind the body so only the tread shows either side. */}
      <rect x="6" y="54" width="12" height="16" rx="3" fill="#14181A" />
      <rect x="78" y="54" width="12" height="16" rx="3" fill="#14181A" />

      {/* Body: roof tapering into the shoulders, down to the bumper. */}
      <path
        fill="#1E5631"
        d="M12 66V32c0-3.1 1.9-5.9 4.8-7L28.6 20A9 9 0 0 1 31.9 19.4h32.2a9 9 0 0 1 3.3.6l11.8 5c2.9 1.1 4.8 3.9 4.8 7v34a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z"
      />

      {/* Rear screen. Deep enough to read as glass rather than a stripe. */}
      <path
        fill="#BFD8C6"
        d="M26.4 30.4l5.8-2.3a4 4 0 0 1 1.5-.3h28.6a4 4 0 0 1 1.5.3l5.8 2.3a2 2 0 0 1 1.3 1.9v6.6a1.6 1.6 0 0 1-1.6 1.6H26.7a1.6 1.6 0 0 1-1.6-1.6v-6.6a2 2 0 0 1 1.3-1.9Z"
      />

      {/* Tail lights. */}
      <rect x="17" y="44" width="15" height="8" rx="2.4" fill="#C7452F" />
      <rect x="64" y="44" width="15" height="8" rx="2.4" fill="#C7452F" />

      {/* The plate — the reason this view was chosen. */}
      <rect x="25" y="53" width="46" height="15" rx="2.4" fill="#F4F4EF" />
      <rect x="25" y="53" width="46" height="15" rx="2.4" stroke="#143D23" strokeWidth="1.8" />
      <text
        x="48"
        y="64.4"
        textAnchor="middle"
        fill="#143D23"
        fontSize="11.5"
        fontWeight="700"
        letterSpacing="0.3"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        gaari
      </text>
    </svg>
  );
}

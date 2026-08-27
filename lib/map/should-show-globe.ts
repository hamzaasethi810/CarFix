/*
  Whether this visit opens on the globe, and whether the globe should fly the
  camera down or just place it.

  Pure on purpose: the caller is the one that touches `navigator.connection`,
  `matchMedia` and whatever the site remembers about the visitor's last area
  — none of that exists outside a browser, so keeping the decision itself as
  a plain function of already-gathered values is what lets it be tested
  without one.

  Two cases here are easy to get backwards:

  - Reduced motion is a motion preference, not a visibility one. It drops the
    flight, not the globe — nothing the globe leads to becomes unreachable,
    the camera is simply placed at the destination instead of eased there.
  - `effectiveType` is `undefined` on any browser without the Network
    Information API (Safari, notably — every iPhone). Treating "unknown" as
    "slow" would deny the globe to every one of those visitors, which is the
    opposite of what a progressive enhancement is supposed to do. Only a
    connection that has actively reported itself as slow counts as slow.
*/

export type ShouldShowGlobeInput = {
  /** False once the site has somewhere to remember this visitor having been. */
  firstVisit: boolean;
  /** `navigator.connection?.saveData` — an explicit request to spend less data. */
  saveData: boolean;
  /** `navigator.connection?.effectiveType` — absent where the API doesn't exist. */
  effectiveType: string | undefined;
  /** `matchMedia("(prefers-reduced-motion: reduce)").matches`. */
  reducedMotion: boolean;
};

export type ShouldShowGlobeResult = {
  /** Whether this visit opens on the globe at all. */
  globe: boolean;
  /** Whether the globe should fly to the target rather than just place the camera there. */
  descend: boolean;
};

const SLOW_CONNECTION_TYPES = new Set(["slow-2g", "2g"]);

export function shouldShowGlobe(input: ShouldShowGlobeInput): ShouldShowGlobeResult {
  const isSlowConnection =
    input.effectiveType !== undefined && SLOW_CONNECTION_TYPES.has(input.effectiveType);

  const globe = input.firstVisit && !input.saveData && !isSlowConnection;

  return { globe, descend: globe && !input.reducedMotion };
}

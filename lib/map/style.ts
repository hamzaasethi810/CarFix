/*
  Where the map's tiles come from — one value, so the source can be swapped
  without touching a component.

  MapTiler is the preferred source and needs a key. OpenFreeMap needs none and
  is the fallback, so the site works for anyone who clones it without an
  account. It runs on donated infrastructure with no uptime guarantee, which is
  acceptable as a fallback and not as the default.

  Both are dark. A light basemap on this ground reduces the whole redesign to a
  header strip.
*/

// Verified 200 on 2026-08-27. Note: their "positron" style is LIGHT — not this one.
const OPENFREEMAP_DARK = "https://tiles.openfreemap.org/styles/dark";

export function mapStyleUrl(maptilerKey: string | undefined): string {
  if (!maptilerKey) return OPENFREEMAP_DARK;
  return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${maptilerKey}`;
}

/** The source to use once MapTiler has stopped serving. Always keyless. */
export function fallbackStyleUrl(): string {
  return OPENFREEMAP_DARK;
}

/*
  Whether a tile failure means "MapTiler is out" rather than "one tile
  glitched". 402 is payment required and 429 is rate limited; both mean the
  quota is spent and every subsequent request will fail the same way. A 404 or
  a network blip is not that, and must not throw away a working paid source.
*/
export function isQuotaFailure(status: number): boolean {
  return status === 402 || status === 429;
}

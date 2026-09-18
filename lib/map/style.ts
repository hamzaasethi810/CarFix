/*
  Where the map's tiles come from — one value, so the source can be swapped
  without touching a component.

  MapTiler is the preferred source and needs a key. OpenFreeMap needs none and
  is the fallback, so the site works for anyone who clones it without an
  account. It runs on donated infrastructure with no uptime guarantee, which is
  acceptable as a fallback and not as the default.

  Both are LIGHT, and that is a deliberate reversal.

  They used to be dark, chosen when the page was a near-black forest ground and
  a light basemap would have reduced the redesign to a header strip. That
  ground is gone: the page is bone paper with blue-black ink, the panels over
  the map are opaque white, and a dark basemap under them now reads as a hole
  cut in the document. The reason for dark retired with the palette it was
  chosen for.
*/

// CARTO's Positron, served by OpenFreeMap. Light, and the counterpart to the
// dark style this used to point at.
const OPENFREEMAP_LIGHT = "https://tiles.openfreemap.org/styles/positron";

export function mapStyleUrl(maptilerKey: string | undefined): string {
  /*
    Trimmed and escaped, because this took production down once.

    MAPTILER_KEY was stored on Vercel with whitespace around it — a stray space
    or newline is trivially easy to capture when pasting a key into a dashboard
    field, and nothing in the dashboard shows it. The URL came out as
    `...style.json?key= <key> `, MapTiler rejected every tile request, and the
    map silently never loaded in production while working on every developer
    machine whose .env happened to be clean.

    A key that is only whitespace is treated as no key at all: a blank key
    builds a URL that fails on every tile, which is strictly worse than the
    keyless basemap we already fall back to.

    encodeURIComponent because this value is interpolated into a query string.
    A key containing & or = would otherwise change the URL's shape rather than
    just its key parameter.
  */
  const key = maptilerKey?.trim();
  if (!key) return OPENFREEMAP_LIGHT;
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`;
}

/*
  Attribution for the keyless fallback, supplied by us because the style does
  not.

  MapTiler's style JSON declares its own attribution and MapLibre renders it
  automatically. OpenFreeMap's Positron style declares none, so the attribution
  control comes up EMPTY on the fallback path — which is worse than having no
  control at all, because it looks like credit is being given when it is not.
  OpenFreeMap serves OpenStreetMap data, and ODbL requires the credit whoever
  is serving it.
*/
export const FALLBACK_ATTRIBUTION =
  '<a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> ' +
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

/** The source to use once MapTiler has stopped serving. Always keyless. */
export function fallbackStyleUrl(): string {
  return OPENFREEMAP_LIGHT;
}

/*
  Whether a tile failure is permanent — MapTiler will never serve this key on
  this origin, so fall back to the keyless basemap rather than show a blank map.

  Four statuses qualify, and they split into two kinds that behave identically
  from here: the quota is spent (402 payment required, 429 rate limited), or the
  key itself is refused (401 unauthorized, 403 forbidden). A 403 is what a
  domain-restricted key returns when the site is served from an origin the
  MapTiler dashboard has not allowed — which is exactly how a working map goes
  blank the moment the site moves to a new domain. Every subsequent request
  fails the same way, so switching once is correct. A 404 or a dropped request
  is a one-off and deliberately excluded, so a glitch never discards a working
  paid source.
*/
export function isFatalTileFailure(status: number): boolean {
  return status === 401 || status === 402 || status === 403 || status === 429;
}

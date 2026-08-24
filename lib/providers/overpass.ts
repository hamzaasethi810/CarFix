import "server-only";
import { AppError } from "../errors";

/*
  OpenStreetMap via the Overpass API — free, no key, no account.

  This is what makes the directory work anywhere rather than only where shops
  were seeded by hand: when someone searches an area we have not covered yet,
  the shops in that radius are fetched once and cached in Postgres.

  Overpass is donated community infrastructure, so this is called sparingly,
  behind rate limiting, with a short timeout and a descriptive User-Agent as
  their usage policy asks.
*/

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const TIMEOUT_MS = 25_000;
const MAX_RESULTS = 400;

export type OsmShop = {
  sourceRef: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  website: string | null;
  brands: string[];
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/**
 * Car repair shops within `radiusMeters` of a point. `shop=car_repair` is the
 * OSM tag for exactly this; `shop=tyres` catches tyre and alignment places.
 */
export async function fetchNearbyShops(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<OsmShop[]> {
  const radius = Math.min(Math.round(radiusMeters), 80_000);
  const query = `
    [out:json][timeout:20];
    (
      nwr["shop"="car_repair"](around:${radius},${lat},${lng});
      nwr["shop"="tyres"](around:${radius},${lat},${lng});
    );
    out center ${MAX_RESULTS};
  `;

  let response: Response | null = null;
  for (const endpoint of ENDPOINTS) {
    try {
      response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent": "CarFix/1.0 (owner-reported mechanic pricing)",
          accept: "application/json",
        },
      });
      if (response.ok) break;
      response = null;
    } catch {
      response = null;
    }
  }

  if (!response) {
    throw new AppError("INTERNAL", "The shop directory is temporarily unavailable.");
  }

  const body = (await response.json()) as { elements?: OverpassElement[] };
  const shops: OsmShop[] = [];

  for (const el of body.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    // Unnamed elements cannot be presented or reviewed meaningfully.
    if (!name) continue;

    const pointLat = el.lat ?? el.center?.lat;
    const pointLng = el.lon ?? el.center?.lon;
    if (pointLat === undefined || pointLng === undefined) continue;

    const houseNumber = tags["addr:housenumber"]?.trim();
    const street = tags["addr:street"]?.trim();
    const address = [houseNumber, street].filter(Boolean).join(" ");

    shops.push({
      sourceRef: `${el.type}/${el.id}`,
      name: name.slice(0, 200),
      lat: pointLat,
      lng: pointLng,
      address: address || "Address not listed",
      city: tags["addr:city"]?.trim() ?? "",
      state: tags["addr:state"]?.trim() ?? "",
      zip: tags["addr:postcode"]?.trim() ?? "",
      phone: (tags.phone ?? tags["contact:phone"])?.trim() ?? null,
      website: normalizeUrl(tags.website ?? tags["contact:website"]),
      brands: (tags["service:vehicle:brand"] ?? tags.brand ?? "")
        .split(";")
        .map((b) => b.trim())
        .filter(Boolean),
    });
  }

  return shops;
}

/** Only http(s) survives, so a tag can never inject a javascript: URL. */
function normalizeUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const candidate = raw.trim();
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

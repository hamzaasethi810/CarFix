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
  /** The raw OSM tags, so specialties can be derived without a second fetch. */
  tags: Record<string, string>;
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
  /*
    Everything a car person might pay someone to do, not just repair.

    OpenStreetMap has no single tag for this, so the net is cast across the
    shop, craft, and amenity keys, plus the `service:vehicle:*` subtags that
    specialised places carry. Tags that return nothing in a given area cost
    nothing to ask for.

    Worth knowing: there is no established tag for a wrap or PPF installer.
    Those places are usually mapped as car_repair or a painter, which the
    query below catches, and the rest arrive as owners report on them.
  */
  const around = `(around:${radius},${lat},${lng})`;
  const selectors = [
    // Repair and maintenance
    '["shop"="car_repair"]',
    '["shop"="tyres"]',
    '["shop"="car_parts"]',
    '["shop"="motorcycle_repair"]',
    // Body, paint, and glass
    '["craft"="car_painter"]',
    '["shop"="car_body_repair"]',
    '["service:vehicle:body_repair"="yes"]',
    '["service:vehicle:painting"="yes"]',
    '["service:vehicle:glass"="yes"]',
    // Modification and performance
    '["service:vehicle:tuning"="yes"]',
    '["shop"="tuning"]',
    // Appearance
    '["amenity"="car_wash"]',
    '["shop"="car_detailing"]',
    // Trim and interiors
    '["craft"="upholsterer"]["service:vehicle"]',
  ];

  const query = `
    [out:json][timeout:20];
    (
      ${selectors.map((sel) => `nwr${sel}${around};`).join("\n      ")}
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
      tags,
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

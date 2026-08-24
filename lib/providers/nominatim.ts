import "server-only";
import { AppError, validation } from "../errors";

/*
  Nominatim — OpenStreetMap's own geocoder. Free, no key, no account, and it
  already matches the map tiles and shop data we use.

  Their usage policy asks for an identifying User-Agent, at most one request
  per second, and no bulk querying. This is called only from the server, behind
  our own rate limiting, so those limits hold regardless of client behaviour.
*/

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 8000;

export type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
  /** Rough extent of the match, used to pick a sensible starting radius. */
  suggestedRadiusMiles: number;
};

type NominatimRow = {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  addresstype?: string;
};

/** A postcode is a tight area; a country is not. Pick a radius that matches. */
function radiusFor(row: NominatimRow): number {
  const box = row.boundingbox;
  if (!box) return 20;

  const [south, north, west, east] = box.map(Number);
  if ([south, north, west, east].some(Number.isNaN)) return 20;

  // Half the diagonal, in miles, clamped to what the search allows.
  const latMiles = Math.abs(north - south) * 69;
  const lngMiles =
    Math.abs(east - west) * 69 * Math.max(Math.cos((((north + south) / 2) * Math.PI) / 180), 0.01);
  const half = Math.sqrt(latMiles ** 2 + lngMiles ** 2) / 2;

  return Math.min(200, Math.max(5, Math.round(half)));
}

export async function geocode(query: string, limit = 5): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) throw validation("Enter a city, postcode, or region.");

  const url = `${ENDPOINT}?${new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    limit: String(limit),
    addressdetails: "0",
  })}`;

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "CarFix/1.0 (owner-reported mechanic pricing)",
        accept: "application/json",
      },
      // Places do not move, so a long cache keeps us well inside their limits.
      next: { revalidate: 86_400 },
    });
  } catch {
    throw new AppError("INTERNAL", "Location lookup is unavailable right now.");
  }

  if (!response.ok) {
    throw new AppError("INTERNAL", "Location lookup is unavailable right now.");
  }

  const rows = (await response.json()) as NominatimRow[];

  return rows
    .map((r) => ({
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      suggestedRadiusMiles: radiusFor(r),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

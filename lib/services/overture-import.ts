import "server-only";
import { isAutomotive, servicesFromCategory } from "./overture-categories";
import { looksLikeSameName } from "./shop-submissions";

/*
  One Overture place, flattened.

  The extract query in scripts/overture-extract.sh already unnests Overture's
  nested structs, so this is the flat shape that arrives in the JSON file
  rather than the raw parquet schema.
*/
export type OverturePlace = {
  id: string;
  name: string | null;
  category: string | null;
  confidence: number | null;
  lat: number | null;
  lng: number | null;
  freeform: string | null;   // street line
  locality: string | null;   // town
  region: string | null;     // state, where the country has them
  postcode: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
};

export type NormalisedShop = {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  sourceRef: string;
  services: string[];
};

/** Below this a record is more likely wrong than right. */
const MIN_CONFIDENCE = 0.5;

/** Only http(s) survives, so a record can never inject a javascript: URL. */
function safeUrl(raw: string | null): string | null {
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

/**
 * A shop row, or null if this place should not be imported.
 *
 * Returning null rather than throwing is deliberate: an import of 300,000
 * records will contain thousands that are unnamed, unplaced or not workshops,
 * and that is ordinary rather than exceptional.
 */
export function normalisePlace(
  place: OverturePlace,
  minConfidence: number = MIN_CONFIDENCE,
): NormalisedShop | null {
  const name = place.name?.trim();
  if (!name) return null;
  if (place.lat === null || place.lng === null) return null;
  if (place.confidence !== null && place.confidence < minConfidence) return null;

  const category = place.category ?? "";
  if (!isAutomotive(category)) return null;

  const country = (place.country ?? "US").toUpperCase().slice(0, 2);

  return {
    // Caps match app/api/shops/submit/route.ts's Zod schema, the other path
    // onto this same column set — text columns are unbounded in Postgres, so
    // without a cap here a malformed record can store and render a multi-KB
    // field.
    name: name.slice(0, 200),
    address: (place.freeform?.trim() ?? "").slice(0, 200),
    city: (place.locality?.trim() ?? "").slice(0, 100),
    // "state" is a US concept here, matching how the rest of the app treats it.
    state: country === "US" ? (place.region?.trim() ?? "").slice(0, 100) : "",
    country,
    zip: (place.postcode?.trim() ?? "").slice(0, 20),
    lat: place.lat,
    lng: place.lng,
    phone: place.phone?.trim().slice(0, 40) || null,
    website: safeUrl(place.website),
    sourceRef: place.id,
    services: servicesFromCategory(category),
  };
}

/**
 * About 250 metres — close enough that one business is not two.
 *
 * Exported so the script's neighbour query can use the same radius the
 * matcher below tests against. If the two drifted apart, the query could
 * stop returning candidates the matcher would have flagged, and duplicates
 * would slip through silently.
 */
export const SAME_PLACE_DEGREES = 0.0025;

type Located = { name: string; lat: number; lng: number };

/**
 * Whether this place is a shop already stored.
 *
 * Both halves must hold: a similar name AND effectively the same spot. Name
 * alone would collapse every branch of a chain into one; location alone would
 * collapse the three businesses that share a retail park.
 */
export function shouldSkipAsDuplicate(candidate: Located, nearby: Located[]): boolean {
  return nearby.some(
    (existing) =>
      Math.abs(existing.lat - candidate.lat) < SAME_PLACE_DEGREES &&
      Math.abs(existing.lng - candidate.lng) < SAME_PLACE_DEGREES &&
      looksLikeSameName(existing.name, candidate.name),
  );
}

/**
 * Whether an upsert created a new row, versus updating one that already
 * existed.
 *
 * The neighbour query's `alreadyMine` flag looks like it would answer this
 * for free, but it comes from a `deletedAt: null` search, so a row that was
 * soft-deleted and then re-imported would read as "created" when it was
 * really restored. Comparing the timestamps the upsert already returns has
 * no such gap: a fresh row's `createdAt` and `updatedAt` are set by the same
 * statement, so they are exactly equal only on creation.
 */
export function upsertWasCreate(createdAt: Date, updatedAt: Date): boolean {
  return createdAt.getTime() === updatedAt.getTime();
}

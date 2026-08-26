import "server-only";
import { isAutomotive, servicesFromCategory } from "./overture-categories";

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

  const country = (place.country ?? "US").toUpperCase();

  return {
    name: name.slice(0, 200),
    address: place.freeform?.trim() ?? "",
    city: place.locality?.trim() ?? "",
    // "state" is a US concept here, matching how the rest of the app treats it.
    state: country === "US" ? (place.region?.trim() ?? "") : "",
    country,
    zip: place.postcode?.trim() ?? "",
    lat: place.lat,
    lng: place.lng,
    phone: place.phone?.trim() || null,
    website: safeUrl(place.website),
    sourceRef: place.id,
    services: servicesFromCategory(category),
  };
}

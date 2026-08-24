import "server-only";

/*
  Turns OpenStreetMap tags into the services a shop is likely to offer.

  Without this, an ingested shop arrives with no specialties at all, so
  filtering the map by "Full car wrap" would find nothing until somebody had
  already reported on one — the discovery problem the whole directory exists
  to solve.

  Every value here maps to a name in the seeded service list. A mapping that
  does not match is skipped rather than inventing a service, so this file can
  never quietly pollute the catalogue.
*/

/** Exact tag matches: `key=value` -> services offered. */
const BY_TAG: Record<string, string[]> = {
  "shop=car_repair": ["Diagnostic", "Oil change", "Brake pads"],
  "shop=tyres": ["Tires", "Alignment", "Wheel installation"],
  "shop=car_parts": ["Other"],
  "shop=motorcycle_repair": ["Diagnostic"],

  "craft=car_painter": ["Respray", "Paint correction", "Body work / dent repair"],
  "shop=car_body_repair": ["Body work / dent repair", "Respray"],

  "shop=tuning": ["ECU tune / flash", "Dyno tuning", "Exhaust installation"],

  "amenity=car_wash": ["Detailing"],
  "shop=car_detailing": ["Detailing", "Paint correction", "Ceramic coating"],

  "craft=upholsterer": ["Upholstery / retrim", "Seat install"],
};

/** `service:vehicle:*` subtags, which specialised shops carry. */
const BY_SERVICE_TAG: Record<string, string[]> = {
  body_repair: ["Body work / dent repair"],
  painting: ["Respray", "Paint correction"],
  tuning: ["ECU tune / flash", "Dyno tuning"],
  tyres: ["Tires"],
  wheel_alignment: ["Alignment"],
  alignment: ["Alignment"],
  brakes: ["Brake pads", "Brake pads + rotors"],
  oil_change: ["Oil change"],
  air_conditioning: ["Air conditioning"],
  diagnostics: ["Diagnostic"],
  transmission: ["Transmission service"],
  electrical: ["Electrical diagnosis"],
  exhaust: ["Exhaust installation"],
  suspension: ["Suspension"],
  clutch: ["Clutch"],
  battery: ["Battery"],
  glass: ["Other"],
  inspection: ["Diagnostic"],
  car_repair: ["Diagnostic"],
  repair: ["Diagnostic"],
  repairs: ["Diagnostic"],
};

/**
 * Service names implied by a shop's tags. Returns names, not ids — the caller
 * resolves them against the catalogue and ignores anything unrecognised.
 */
export function specialtiesFromTags(tags: Record<string, string>): string[] {
  const names = new Set<string>();

  for (const key of ["shop", "craft", "amenity"] as const) {
    const value = tags[key];
    if (!value) continue;
    for (const name of BY_TAG[`${key}=${value}`] ?? []) names.add(name);
  }

  for (const [key, value] of Object.entries(tags)) {
    if (!key.startsWith("service:vehicle:")) continue;
    // Only affirmative tags; "no" means they explicitly do not do it.
    if (value !== "yes") continue;

    const suffix = key.slice("service:vehicle:".length);
    for (const name of BY_SERVICE_TAG[suffix] ?? []) names.add(name);
  }

  // "Other" alone says nothing useful, so it is dropped unless it is all there is.
  if (names.size > 1) names.delete("Other");

  return [...names];
}

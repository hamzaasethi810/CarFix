import "server-only";

/*
  Overture's `taxonomy.primary` categories, narrowed to the trades this
  directory is about.

  Overture's coarse `basic_category` rollup (automotive_service, vehicle_service,
  etc.) is used as a cheap prefilter. The actual workshop types live in
  `taxonomy.primary`, which has 2,300+ values. Most automotive ones are not
  workshops — a registration service, a shipping broker and a tow truck are all
  filed under automotive, and none of them do work on your car. Importing them
  would fill the map with places nobody can get a price from. This map defines
  which taxonomy values count as places where work gets done.

  Note: Do not use the deprecated `categories.primary` column. `taxonomy` is
  the supported replacement and a separate column.
*/

/** Coarse `basic_category` rollups worth scanning. Cheap row-group prefilter. */
export const AUTOMOTIVE_ROLLUPS = Object.freeze([
  "automotive_service",
  "vehicle_service",
]);

/** Category -> the services a shop of that kind plausibly offers. */
const BY_CATEGORY: Record<string, string[]> = {
  automotive_repair: ["Diagnostic", "Oil change", "Brake pads"],
  automotive_service: ["Diagnostic", "Oil change", "Brake pads"],
  engine_repair_service: ["Engine rebuild", "Diagnostic"],
  hybrid_car_repair: ["Diagnostic", "Battery"],
  transmission_repair: ["Transmission service"],
  brake_service_and_repair: ["Brake pads", "Brake pads + rotors"],
  oil_change_station: ["Oil change"],
  auto_electrical_repair: ["Electrical diagnosis", "Battery"],
  car_inspection: ["Diagnostic"],
  emissions_inspection: ["Diagnostic"],
  diy_auto_shop: ["Other"],
  truck_repair: ["Diagnostic"],
  trailer_repair: ["Other"],
  recreation_vehicle_repair: ["Diagnostic"],
  motorcycle_repair: ["Diagnostic"],
  motorsport_vehicle_repair: ["Dyno tuning", "Suspension"],

  tire_shop: ["Tires", "Alignment", "Wheel installation"],
  tire_dealer_and_repair: ["Tires", "Wheel installation"],
  wheel_and_rim_repair: ["Wheel installation"],
  automotive_wheel_polishing_service: ["Wheel installation"],

  auto_body_shop: ["Body work / dent repair", "Respray"],
  mobile_dent_repair: ["Body work / dent repair"],
  auto_glass_service: ["Other"],
  windshield_installation_and_repair: ["Other"],
  auto_restoration_service: ["Respray", "Upholstery / retrim"],

  auto_detailing: ["Detailing", "Paint correction", "Ceramic coating"],
  car_wash: ["Detailing"],

  auto_customization: ["ECU tune / flash", "Suspension"],
  vehicle_wrap: ["Full car wrap", "Paint protection film (PPF)"],
  car_window_tinting: ["Window tint"],
  exhaust_and_muffler_repair: ["Exhaust installation"],
  auto_upholstery: ["Upholstery / retrim"],
  car_stereo_installation: ["Other"],
  auto_security: ["Other"],
};

export const AUTOMOTIVE_CATEGORIES = Object.freeze(Object.keys(BY_CATEGORY));

export const isAutomotive = (category: string) =>
  Object.prototype.hasOwnProperty.call(BY_CATEGORY, category);

/**
 * Service names implied by a category. Names, not ids — the caller resolves
 * them against the catalogue and ignores anything it does not recognise, so a
 * catalogue that has drifted cannot break an import.
 */
export function servicesFromCategory(category: string): string[] {
  const names = BY_CATEGORY[category] ?? [];
  // "Other" alone says nothing useful, so it goes if there is anything better.
  const set = new Set(names);
  if (set.size > 1) set.delete("Other");
  return [...set];
}

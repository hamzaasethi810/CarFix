import { describe, expect, it } from "vitest";
import {
  AUTOMOTIVE_CATEGORIES,
  isAutomotive,
  servicesFromCategory,
} from "../lib/services/overture-categories";

describe("which places are worth importing", () => {
  it("accepts repair and servicing trades", () => {
    for (const c of ["automotive_repair", "brake_service_and_repair", "tire_shop"]) {
      expect(isAutomotive(c)).toBe(true);
    }
  });

  it("rejects businesses that are not workshops", () => {
    // These are automotive but nobody gets work done at them.
    for (const c of ["automobile_registration_service", "vehicle_shipping", "towing_service"]) {
      expect(isAutomotive(c)).toBe(false);
    }
  });

  it("lists every accepted category for the extract", () => {
    expect(AUTOMOTIVE_CATEGORIES.length).toBeGreaterThan(20);
    expect(AUTOMOTIVE_CATEGORIES.every(isAutomotive)).toBe(true);
  });
});

describe("what a category says a shop does", () => {
  it("maps a brake shop to brake services", () => {
    expect(servicesFromCategory("brake_service_and_repair")).toContain("Brake pads");
  });

  it("maps a wrap shop to wrapping", () => {
    expect(servicesFromCategory("vehicle_wrap")).toContain("Full car wrap");
  });

  it("returns nothing for a category it does not know", () => {
    // Silence, not invention — an unknown category must never create a service.
    expect(servicesFromCategory("florist")).toEqual([]);
  });

  it("never returns a name that is not in the seeded catalogue", () => {
    // Guards against drift: every mapped name must exist in prisma/seed.ts.
    const seeded = new Set([
      "Air conditioning", "Alignment", "Battery", "Body work / dent repair",
      "Brake pads", "Brake pads + rotors", "Ceramic coating", "Clutch",
      "Detailing", "Diagnostic", "Dyno tuning", "ECU tune / flash",
      "Electrical diagnosis", "Engine rebuild", "Exhaust installation",
      "Full car wrap", "Oil change", "Other", "Paint correction",
      "Paint protection film (PPF)", "Respray", "Suspension", "Tires",
      "Transmission service", "Upholstery / retrim", "Wheel installation",
      "Window tint",
    ]);
    for (const c of AUTOMOTIVE_CATEGORIES) {
      for (const name of servicesFromCategory(c)) {
        expect(seeded.has(name), `${c} -> ${name}`).toBe(true);
      }
    }
  });
});

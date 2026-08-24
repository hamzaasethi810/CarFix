import { describe, expect, it } from "vitest";
import { specialtiesFromTags } from "../lib/services/osm-specialties";

describe("deriving specialties from OpenStreetMap tags", () => {
  it("reads a plain repair shop", () => {
    const out = specialtiesFromTags({ shop: "car_repair" });
    expect(out).toContain("Diagnostic");
    expect(out).toContain("Oil change");
  });

  it("reads a body and paint shop", () => {
    const out = specialtiesFromTags({ craft: "car_painter" });
    expect(out).toContain("Respray");
    expect(out).toContain("Body work / dent repair");
  });

  it("reads a tuner", () => {
    const out = specialtiesFromTags({ shop: "car_repair", "service:vehicle:tuning": "yes" });
    expect(out).toContain("ECU tune / flash");
    expect(out).toContain("Dyno tuning");
  });

  it("treats a car wash as detailing", () => {
    expect(specialtiesFromTags({ amenity: "car_wash" })).toContain("Detailing");
  });

  it("combines the shop kind with its service subtags", () => {
    const out = specialtiesFromTags({
      shop: "car_repair",
      "service:vehicle:body_repair": "yes",
      "service:vehicle:transmission": "yes",
    });
    expect(out).toContain("Body work / dent repair");
    expect(out).toContain("Transmission service");
    expect(out).toContain("Diagnostic");
  });

  it("ignores a service the shop says it does NOT do", () => {
    // "no" is an explicit statement, and must not become a specialty.
    const out = specialtiesFromTags({ shop: "car_repair", "service:vehicle:tuning": "no" });
    expect(out).not.toContain("ECU tune / flash");
  });

  it("ignores tags it does not recognise rather than inventing a service", () => {
    const out = specialtiesFromTags({ shop: "bakery", "service:vehicle:teleportation": "yes" });
    expect(out).toEqual([]);
  });

  it("drops the vague catch-all once something specific is known", () => {
    // car_parts alone maps to "Other"; with a real service that is noise.
    expect(specialtiesFromTags({ shop: "car_parts" })).toEqual(["Other"]);
    const richer = specialtiesFromTags({ shop: "car_parts", "service:vehicle:tyres": "yes" });
    expect(richer).toContain("Tires");
    expect(richer).not.toContain("Other");
  });

  it("returns nothing for an untagged element", () => {
    expect(specialtiesFromTags({})).toEqual([]);
  });

  it("never repeats a service when two tags imply it", () => {
    const out = specialtiesFromTags({
      craft: "car_painter",
      "service:vehicle:painting": "yes",
    });
    expect(new Set(out).size).toBe(out.length);
  });
});

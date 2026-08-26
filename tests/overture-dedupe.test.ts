import { describe, expect, it } from "vitest";
import { shouldSkipAsDuplicate } from "../lib/services/overture-import";

const near = (name: string, lat = 38.8816, lng = -77.091) => ({ name, lat, lng });

describe("not importing a shop that is already there", () => {
  it("skips the same business under the same name", () => {
    expect(shouldSkipAsDuplicate(
      { name: "Redline Auto Service", lat: 38.8816, lng: -77.091 },
      [near("Redline Auto Service")],
    )).toBe(true);
  });

  it("skips a spelling variant at the same spot", () => {
    expect(shouldSkipAsDuplicate(
      { name: "Apex Motorworks", lat: 38.8816, lng: -77.091 },
      [near("Apex Motor Works")],
    )).toBe(true);
  });

  it("keeps a different business at the same address", () => {
    // Two real shops share plazas; this is not a duplicate.
    expect(shouldSkipAsDuplicate(
      { name: "Tony's Tire Service", lat: 38.8816, lng: -77.091 },
      [near("Tony's Garage")],
    )).toBe(false);
  });

  it("keeps the same name far away", () => {
    // A chain has branches; a branch in another town is its own shop.
    expect(shouldSkipAsDuplicate(
      { name: "Redline Auto Service", lat: 38.8816, lng: -77.091 },
      [near("Redline Auto Service", 39.9, -75.1)],
    )).toBe(false);
  });

  it("keeps anything when nothing is nearby", () => {
    expect(shouldSkipAsDuplicate({ name: "Anything", lat: 1, lng: 1 }, [])).toBe(false);
  });
});

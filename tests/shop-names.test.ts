import { describe, expect, it } from "vitest";
import { looksLikeSameName } from "../lib/services/shop-submissions";

/*
  The duplicate check is a guess, and its failures are not symmetrical.

  Missing a duplicate costs a tidy-up later. Wrongly flagging one used to mean
  a real business could not be listed at all, because the submission was
  refused outright with no way past it. These cases are the ones that were
  actually blocked.
*/

describe("names that are the same business", () => {
  const same: [string, string][] = [
    ["Apex Motorworks", "Apex Motor Works"],
    ["Apex Auto Repair", "Apex Automotive"],
    ["Mikes Garage", "Mike's Garage"],
    ["Precision Tuning Co", "Precision Tuning"],
    ["European Auto Werks", "European Werks"],
  ];
  it.each(same)("treats %s and %s as one", (a, b) => {
    expect(looksLikeSameName(a, b)).toBe(true);
  });
});

describe("names that are different businesses", () => {
  const different: [string, string][] = [
    // Every one of these was refused before, with no way to proceed.
    ["Tony's Garage", "Tony's Tire Service"],
    ["Joe's Auto Shop", "Joe Smith Motors"],
    ["Precision Auto", "Precision Tuning"],
    ["Mike's Auto Repair", "Mike's Body Shop"],
    ["AutoNation Ford", "AutoNation Honda"],
    ["Bay Area Wraps", "Bay Area Performance"],
    ["Elite Detailing", "Elite Wraps"],
    ["Downtown Auto Care", "Uptown Auto Care"],
  ];
  it.each(different)("keeps %s and %s apart", (a, b) => {
    expect(looksLikeSameName(a, b)).toBe(false);
  });

  it("never matches on generic words alone", () => {
    // Both reduce to nothing distinctive; matching them would block every
    // plainly-named shop in a neighbourhood.
    expect(looksLikeSameName("The Auto Shop", "Car Repair Services")).toBe(false);
    expect(looksLikeSameName("Auto Repair", "Auto Service")).toBe(false);
  });

  it("is symmetric", () => {
    expect(looksLikeSameName("Tony's Garage", "Tony's Tire Service"))
      .toBe(looksLikeSameName("Tony's Tire Service", "Tony's Garage"));
    expect(looksLikeSameName("Apex Motorworks", "Apex Motor Works"))
      .toBe(looksLikeSameName("Apex Motor Works", "Apex Motorworks"));
  });
});

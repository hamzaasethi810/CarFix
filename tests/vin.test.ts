import { describe, expect, it } from "vitest";
import { hasValidCheckDigit, isWellFormedVin, normalizeVin } from "../lib/vin";

describe("VIN validation", () => {
  it("accepts a real VIN", () => {
    expect(isWellFormedVin("JF1VA2M67G9829723")).toBe(true);
    expect(hasValidCheckDigit("JF1VA2M67G9829723")).toBe(true);
  });

  it("normalises casing, spaces, and dashes", () => {
    expect(normalizeVin(" jf1va2m67g9829723 ")).toBe("JF1VA2M67G9829723");
    expect(normalizeVin("JF1VA2M6-7G9829723")).toBe("JF1VA2M67G9829723");
  });

  it.each(["I", "O", "Q"])("rejects the ambiguous letter %s", (letter) => {
    expect(isWellFormedVin(`JF1VA2M67G982972${letter}`)).toBe(false);
  });

  it.each([
    ["too short", "JF1VA2M67G982972"],
    ["too long", "JF1VA2M67G98297233"],
    ["empty", ""],
  ])("rejects a VIN that is %s", (_label, vin) => {
    expect(isWellFormedVin(vin)).toBe(false);
  });

  it("catches a transposed character via the check digit", () => {
    // Same characters, two digits swapped — still well formed, but the
    // check digit no longer matches.
    const typo = "JF1VA2M67G9829732";
    expect(isWellFormedVin(typo)).toBe(true);
    expect(hasValidCheckDigit(typo)).toBe(false);
  });

  it("does not throw on a malformed VIN", () => {
    expect(hasValidCheckDigit("not-a-vin")).toBe(false);
  });
});

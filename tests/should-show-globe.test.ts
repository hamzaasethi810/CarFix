import { describe, expect, it } from "vitest";
import { shouldShowGlobe } from "../lib/map/should-show-globe";

const base = { firstVisit: true, saveData: false, effectiveType: "4g", reducedMotion: false };

describe("shouldShowGlobe", () => {
  it("shows the globe to a first-time visitor on a good connection", () => {
    expect(shouldShowGlobe(base)).toEqual({ globe: true, descend: true });
  });

  it("sends a returning visitor straight to their area", () => {
    // Nobody wants a cinematic on their fourth price check.
    expect(shouldShowGlobe({ ...base, firstVisit: false }).globe).toBe(false);
  });

  it("skips the globe on a slow connection", () => {
    for (const effectiveType of ["slow-2g", "2g"]) {
      expect(shouldShowGlobe({ ...base, effectiveType }).globe, effectiveType).toBe(false);
    }
  });

  it("skips the globe when the visitor asked to save data", () => {
    expect(shouldShowGlobe({ ...base, saveData: true }).globe).toBe(false);
  });

  it("keeps the globe but drops the flight under reduced motion", () => {
    // The guardrail is about motion, not about hiding things: nothing
    // becomes unreachable, it simply appears.
    expect(shouldShowGlobe({ ...base, reducedMotion: true })).toEqual({
      globe: true,
      descend: false,
    });
  });

  it("treats an unknown connection as good rather than assuming the worst", () => {
    // navigator.connection is absent in Safari; defaulting to "slow" there
    // would deny the globe to every iPhone visitor.
    expect(shouldShowGlobe({ ...base, effectiveType: undefined }).globe).toBe(true);
  });
});

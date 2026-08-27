import { describe, expect, it } from "vitest";
import { fallbackStyleUrl, isQuotaFailure, mapStyleUrl } from "../lib/map/style";

describe("mapStyleUrl", () => {
  it("falls back to a keyless source when no MapTiler key is set", () => {
    expect(mapStyleUrl(undefined)).toContain("openfreemap");
  });

  it("uses MapTiler when a key is present", () => {
    const url = mapStyleUrl("abc123");
    expect(url).toContain("maptiler");
    expect(url).toContain("abc123");
  });

  it("only treats payment and rate-limit failures as quota exhaustion", () => {
    // A 404 or a one-off network blip must not discard a working paid source
    // for the rest of the session.
    expect(isQuotaFailure(402)).toBe(true);
    expect(isQuotaFailure(429)).toBe(true);
    for (const status of [200, 404, 500, 503]) {
      expect(isQuotaFailure(status), String(status)).toBe(false);
    }
  });

  it("falls back to a keyless source", () => {
    expect(fallbackStyleUrl()).toContain("openfreemap");
  });

  it("asks for a dark style either way", () => {
    /*
      The ground is near-black forest green; a light basemap fights it and
      reduces the redesign to a header strip. Assert "dark" specifically —
      an earlier draft of this plan allowed "positron", which is CARTO's
      LIGHT theme, so the test would have passed the exact bug it exists
      to prevent.
    */
    expect(mapStyleUrl(undefined).toLowerCase()).toContain("dark");
    expect(mapStyleUrl("abc123").toLowerCase()).toContain("dark");
  });
});

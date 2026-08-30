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

describe("mapStyleUrl and whitespace", () => {
  /*
    A real production outage. The MAPTILER_KEY environment variable was saved
    with whitespace around it — trivially easy when a key is pasted into a
    dashboard field — and the resulting URL was

      ...style.json?key= Or0z3...ra

    which MapTiler rejects, so the map never loaded on production while
    working perfectly on a local machine whose .env happened to be clean.
  */
  it("trims a key that arrives with whitespace", () => {
    const url = mapStyleUrl("  abc123  ");
    expect(url).toContain("key=abc123");
    expect(url).not.toContain(" ");
  });

  it("trims a key that arrives with a trailing newline", () => {
    expect(mapStyleUrl("abc123\n")).toContain("key=abc123");
  });

  it("treats a whitespace-only key as no key at all", () => {
    // Falling back to the keyless source is right here: a blank key produces a
    // URL that 403s on every tile, which is worse than the free basemap.
    expect(mapStyleUrl("   ")).toBe(mapStyleUrl(undefined));
  });

  it("escapes a key so it cannot break out of the query string", () => {
    expect(mapStyleUrl("a&b=c")).toContain("key=a%26b%3Dc");
  });
});

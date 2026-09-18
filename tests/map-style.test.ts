import { describe, expect, it } from "vitest";
import { fallbackStyleUrl, isFatalTileFailure, mapStyleUrl } from "../lib/map/style";

describe("mapStyleUrl", () => {
  it("falls back to a keyless source when no MapTiler key is set", () => {
    expect(mapStyleUrl(undefined)).toContain("openfreemap");
  });

  it("uses MapTiler when a key is present", () => {
    const url = mapStyleUrl("abc123");
    expect(url).toContain("maptiler");
    expect(url).toContain("abc123");
  });

  it("falls back on permanent failures: quota spent AND key refused", () => {
    // 402/429 = quota spent; 401/403 = key refused. A domain-restricted key
    // returns 403 from an un-allowed origin — the exact way the map went blank
    // when the site moved to its own domain — so 403 must fall back.
    for (const status of [401, 402, 403, 429]) {
      expect(isFatalTileFailure(status), String(status)).toBe(true);
    }
    // A 404 or a one-off network blip must not discard a working paid source.
    for (const status of [200, 404, 500, 503]) {
      expect(isFatalTileFailure(status), String(status)).toBe(false);
    }
  });

  it("falls back to a keyless source", () => {
    expect(fallbackStyleUrl()).toContain("openfreemap");
  });

  it("asks for a light style either way", () => {
    /*
      Inverted deliberately, and this comment records why so nobody restores
      the old rule from memory.

      It used to assert "dark", because the page was a near-black forest
      ground and a light basemap would have reduced the redesign to a header
      strip. That ground is retired: the page is bone paper with blue-black
      ink and the panels over the map are opaque white, so a dark basemap now
      reads as a hole cut in the document.

      The original test's real insight is kept and pointed the other way. It
      warned that "positron" is CARTO's LIGHT theme, so allowing it would have
      passed the bug the test existed to prevent. The same trap exists in
      reverse now, which is why this asserts the ABSENCE of "dark" rather than
      the presence of any particular style name.
    */
    expect(mapStyleUrl(undefined).toLowerCase()).not.toContain("dark");
    expect(mapStyleUrl("abc123").toLowerCase()).not.toContain("dark");
    expect(fallbackStyleUrl().toLowerCase()).not.toContain("dark");
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

import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../lib/design/contrast";

/** Pulls `--name: value;` pairs out of the `:root` block of globals.css. */
function tokens(): Record<string, string> {
  const css = readFileSync("app/globals.css", "utf8");
  const root = css.slice(css.indexOf(":root"), css.indexOf("@theme"));
  const out: Record<string, string> = {};
  for (const [, k, v] of root.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    if (!(k in out)) out[k] = v.trim();
  }
  return out;
}

describe("contrastRatio", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 1);
  });

  it("resolves a translucent foreground against its backdrop", () => {
    // rgba white at 50% over black is mid grey: ~5.3:1 against black.
    expect(contrastRatio("rgba(255,255,255,0.5)", "#000000")).toBeGreaterThan(4);
  });
});

describe("the palette is readable", () => {
  const t = tokens();

  // 4.5:1 is the WCAG AA floor for body text. This is the check that stops
  // a dark repaint from quietly making the site unusable.
  it("body text clears AA on the ground", () => {
    expect(contrastRatio(t["label"], t["bg"])).toBeGreaterThanOrEqual(4.5);
  });

  it("body text clears AA on a raised work surface", () => {
    expect(contrastRatio(t["label"], t["bg-elevated"])).toBeGreaterThanOrEqual(4.5);
  });

  it("secondary text clears AA on both", () => {
    expect(contrastRatio(t["label-secondary"], t["bg"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t["label-secondary"], t["bg-elevated"])).toBeGreaterThanOrEqual(4.5);
  });

  it("tertiary text clears the 3:1 large-text floor at minimum", () => {
    expect(contrastRatio(t["label-tertiary"], t["bg"])).toBeGreaterThanOrEqual(3);
  });

  it("button labels clear AA on their own fill", () => {
    expect(contrastRatio(t["on-accent"], t["accent-fill"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t["on-destructive"], t["destructive-fill"])).toBeGreaterThanOrEqual(4.5);
  });

  it("destructive and success text clear AA on the ground", () => {
    expect(contrastRatio(t["destructive"], t["bg"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t["success"], t["bg"])).toBeGreaterThanOrEqual(4.5);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
  Menus have to stay readable over whatever is behind them.

  The area picker's menu was built from .glass, the same translucent material
  as the panels it opens over. Glass over glass, above a moving map, stopped
  being a surface at all: the shop list's distance labels and the map's roads
  showed straight through it, so the menu read as broken and half-covered even
  though it was correctly on top and taking clicks.

  The other menus in the app already use an opaque surface. This pins that down
  so a menu cannot quietly go translucent again.
*/

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** The elements that float above other content and must stay legible. */
const POPOVERS = [
  { file: "components/area-picker.tsx", what: "the area picker's menu" },
  { file: "components/mechanic-picker.tsx", what: "the shop typeahead's list" },
];

describe("floating menus", () => {
  it.each(POPOVERS)("$what does not use translucent glass", ({ file }) => {
    const src = read(file);

    // The line that positions the floating surface.
    const floating = src
      .split("\n")
      .filter((l) => /absolute z-\d/.test(l) && /className/.test(l));

    expect(floating.length).toBeGreaterThan(0);
    for (const line of floating) {
      // The material only — `rounded-glass` is a corner radius, not a surface.
      expect(line).not.toMatch(/(?<![-\w])glass(?![-\w])/);
    }
  });

  it.each(POPOVERS)("$what sits on the shared opaque surface", ({ file }) => {
    // One definition, so a fix in one place cannot leave the others behind.
    expect(read(file)).toContain("popoverSurface");
  });
});

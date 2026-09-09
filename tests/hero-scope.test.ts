import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

const WIDE_QUERY = "@media (min-width: 1280px) and (min-aspect-ratio: 13 / 10) {";

/* The body of a media block, matched by brace depth rather than by regex. */
function block(open: string): string {
  const at = css.indexOf(open);
  expect(at, `missing block: ${open}`).toBeGreaterThan(-1);
  let depth = 1;
  let i = at + open.length;
  while (i < css.length && depth > 0) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") depth -= 1;
    i += 1;
  }
  return css.slice(at + open.length, i - 1);
}

describe("the landing hero's photograph", () => {
  /*
    Two framings of one car, chosen by layout.

    The wide asset is mostly empty ground, because the headline stands in it.
    A phone has no words beside the car, so that emptiness is dead space and it
    gets its own crop. Marking either `priority` would preload it
    unconditionally and make every phone fetch the wide crop it never displays;
    visibility alone decides which one loads, because a lazy image with no
    layout box is never requested.
  */
  it("marks neither framing as priority", () => {
    const figure = page
      .slice(page.indexOf("hero-figure"), page.indexOf("</div>", page.indexOf("hero-img-wide")))
      // Comments out first: this rule is explained in prose right above it.
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(figure).toMatch(/hero-img-band/);
    expect(figure).toMatch(/hero-img-wide/);
    expect(figure).not.toMatch(/\bpriority\b/);
  });

  /*
    Exactly one framing is displayed at a time. If both were visible the images
    would stack, and both would be fetched.
  */
  it("shows exactly one framing per layout", () => {
    expect(css).toMatch(/\.hero-img-wide\s*\{\s*display:\s*none/);
    const wide = block(WIDE_QUERY);
    expect(wide).toMatch(/\.hero-img-wide\s*\{\s*display:\s*block/);
    expect(wide).toMatch(/\.hero-img-band\s*\{\s*display:\s*none/);
  });

  /*
    The wide layout is gated on aspect as well as width.

    The photograph is anchored right, so on a tall window the cover scale grows
    until the car is pushed off the left edge: a 1280x1600 portrait monitor put
    it fully out of frame while still satisfying a width-only query. Losing the
    aspect half of this condition brings that back.
  */
  it("gates the wide layout on aspect, not width alone", () => {
    expect(css).toContain(WIDE_QUERY);
    expect(block(WIDE_QUERY)).toMatch(/\.hero-figure\s*\{[^}]*position:\s*absolute/);
  });

  /*
    The copy column is capped where the car is beside it, and only there. In
    the band layout there is nothing to the right of the words, so the same cap
    would leave half a tablet empty.
  */
  it("caps the copy column only in the wide layout", () => {
    expect(css).toMatch(/\.hero-copy\s*\{[^}]*max-width:\s*34rem/);
    expect(block(WIDE_QUERY)).toMatch(/\.hero-copy\s*\{[^}]*max-width:\s*24rem/);
  });

  /*
    In forced-colors the user agent overrides colour and background-color but
    never touches an <img>. Under a dark forced theme the heading is drawn in
    the user's white, and it would land on a near-white photograph the override
    never reached. This is the only block on the site that sets type over an
    image, so it is the only one that has to remove it.
  */
  it("removes the photograph under forced colours", () => {
    expect(block("@media (forced-colors: active) {")).toMatch(
      /\.hero-figure\s*\{[^}]*display:\s*none/,
    );
  });

  /*
    The section is painted in the tone the band crop ends on.

    In the band layout the photograph stops partway down and the words carry on
    over the section's own ground; if the two differ the join reads as a line
    across the phone hero. This re-measures the built asset, so re-exporting the
    photograph with a different floor fails here rather than shipping a seam.
  */
  it("paints the section in the colour the band asset ends on", async () => {
    const declared = css.match(/\.hero-ground\s*\{[^}]*background-color:\s*#([0-9a-f]{6})/i);
    expect(declared, ".hero-ground has no background-color").not.toBeNull();
    const want = [1, 3, 5].map((i) => parseInt(declared![1].slice(i - 1, i + 1), 16));

    const { data, info } = await sharp("public/img/hero-911-band.webp")
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const y = info.height - 1;
    const sum = [0, 0, 0];
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
    }
    const mean = sum.map((v) => Math.round(v / info.width));
    // Three levels out of 255 is below the threshold where an edge is visible.
    mean.forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(3));
  });

  /*
    The hero is not an inverted section. An earlier photograph was a dark
    studio shot, which forced white ink, a colour-scheme override and a
    dissolve into the light block below. This one is shot on the page's own
    tone, and reintroducing any of that machinery means the photograph was
    swapped without the section being reconsidered.
  */
  it("stays on the page's one appearance", () => {
    expect(css).not.toContain(".hero-dark");
    expect(css).not.toContain(".hero-veil");
    expect(css).not.toContain(".hero-fade");
    expect(page).not.toContain("hero-dark");
  });
});

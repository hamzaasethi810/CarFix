import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sources } from "./source-files";
import { PENDING } from "./design-pending";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/*
  Comments are stripped before matching, so a comment explaining why a rule
  exists cannot trip that rule. tests/no-nested-forms.test.ts does the same.
*/
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const code = () => sources().map((f) => [f, stripComments(read(f))] as const);

/*
  Files already converted for a rule: everything not still on its worklist.
  Mirrors tests/design-system.test.ts so there is one idea here, not two.
*/
const converted = (rule: string) =>
  sources()
    .filter((f) => !PENDING[rule].includes(f))
    .map((f) => [f, stripComments(read(f))] as const);

/*
  The motion grammar, as tests.

  These encode decisions that are otherwise only taste, and taste does not
  survive a codebase being edited by people (or agents) who were not in the
  conversation where it was decided. Each rule below has a reason attached,
  because a constraint nobody understands is a constraint somebody deletes.
*/
describe("the motion grammar", () => {
  it("never uses bare ease-in", () => {
    /*
      ease-in starts slow. On something entering the screen that delays the
      first movement — the exact moment the user is looking hardest — so it
      reads as lag even at an identical duration. ease-in-out is fine for
      something already on screen and moving.
    */
    for (const [f, src] of code()) {
      expect(src, f).not.toMatch(/ease-in(?!-out)[\s"'`\];,)]/);
    }
  });

  it("never animates a layout property", () => {
    /*
      width, height, top, left, margin and padding all force layout and paint
      on every frame. transform and opacity are composited. Colour is paint
      only, which is cheap enough for hover feedback and is permitted.
    */
    for (const [f, src] of converted("layoutTransitions")) {
      expect(src, f).not.toMatch(
        /transition-\[[^\]]*\b(?:width|height|top|left|right|bottom|margin|padding)\b/,
      );
      expect(src, f).not.toMatch(
        /transition:\s*(?:[^;]*\b(?:width|height|top|left|right|bottom|margin|padding)\b)/,
      );
    }
  });

  it("never uses transition-all", () => {
    /*
      transition-all animates every property that happens to change, including
      the layout ones above, and it does so invisibly as the markup evolves.
      Naming the properties is the whole discipline.
    */
    for (const [f, src] of code()) {
      expect(src, f).not.toMatch(/transition-all|transition:\s*all/);
    }
  });

  it("gates hover effects that MOVE behind a real pointer", () => {
    /*
      A touch device fires hover on tap and then leaves the element in the
      hovered state, so a hover effect that MOVES something reads as the
      interface twitching under your thumb and staying twitched.

      Deliberately narrower than "gate every hover". Colour and background
      changes on tap are instantaneous and harmless, they are how the whole
      codebase expresses button feedback, and an absolute rule here would be a
      rule nobody could follow. What has to be gated is transform: scale,
      translate, rotate, skew.
    */
    for (const [f, src] of code()) {
      const ungated = [...src.matchAll(/(?<!hover:hover\)\]:)hover:(scale|translate|rotate|skew)[-\w./[\]]*/g)]
        .map((m) => m[0])
        .filter((hit) => {
          const at = src.indexOf(hit);
          return !src.slice(Math.max(0, at - 60), at).includes("@media(hover:hover)");
        });
      expect(ungated, `${f}: ${ungated.join(", ")}`).toEqual([]);
    }
  });

  it("transitions the property Tailwind actually writes", () => {
    /*
      Tailwind v4 compiles scale-*, translate-* and rotate-* to the standalone
      CSS properties `scale`, `translate` and `rotate` — not to `transform`. So
      `transition-[transform]` beside `active:scale-[0.98]` names a property
      nothing writes to, and the element jumps between states with the duration
      and easing silently applying to nothing.

      It shipped that way on every button on the site: the press feedback was
      instant rather than 140ms. The failure is invisible in review, because the
      classes read correctly and the state change still happens.

      transition-transform (the built-in) expands to
      `transform, translate, scale, rotate` and covers all of them.
    */
    for (const [f, src] of code()) {
      if (!/transition-\[transform\]/.test(src)) continue;
      const writesSeparate = /(?:^|[\s"'`:])-?(?:translate|scale|rotate)-/.test(src);
      expect(
        writesSeparate,
        `${f}: transition-[transform] only animates \`transform\`, but this file ` +
          "sets scale/translate/rotate, which Tailwind v4 emits as their own " +
          "properties. Use transition-transform.",
      ).toBe(false);
    }
  });

  it("nothing enters from scale(0)", () => {
    /*
      Nothing in the physical world appears out of nothing. An element growing
      from a point reads as a UI trick; from 0.95-0.97 it reads as an object
      arriving. The difference is small on paper and obvious on screen.
    */
    for (const [f, src] of code()) {
      expect(src, f).not.toMatch(/scale\(0\)|(?:^|[\s"'`])scale-0(?![\d.])/m);
    }
  });
});

describe("the reconciliation", () => {
  const file = "components/reconciliation.tsx";

  it("honours reduced motion", () => {
    /*
      Reduced motion removes movement, not information. The stamp must still
      say the figures reconcile; it just stops travelling to say so.
    */
    const css = read("app/globals.css");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/\.recon-stamp\b/);
    expect(read(file)).toMatch(/prefers-reduced-motion/);
  });

  it("does not animate the live form's entrance", () => {
    /*
      The filing form is typed into. Any entrance animation there would replay
      on the way to every keystroke's result, and animating something touched
      that often is precisely how an interface starts feeling slow. Live mode
      must therefore start settled rather than pending.
    */
    const src = stripComments(read(file));
    expect(src).toMatch(/useState\(live\)/);
  });

  it("compares money in integer cents, not floats", () => {
    /*
      0.1 + 0.2 !== 0.3 in binary floating point, and 19.99 + 5.01 against a
      total of 25.00 is exactly the shape that trips it. This is the arithmetic
      the whole product is asking to be trusted on.
    */
    const src = stripComments(read(file));
    expect(src).toMatch(/Math\.round\(n \* 100\)/);
    expect(src).toMatch(/cents\(sum\) === cents\(total\)/);
  });

  it("announces its outcome in words, not only as a stamp", () => {
    /*
      The stamp is aria-hidden decoration. A screen reader must hear the
      result, and must not have to infer it from an element appearing.
    */
    const src = stripComments(read(file));
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/aria-hidden="true"/);
  });
});

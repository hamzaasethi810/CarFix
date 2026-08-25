import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
  A form cannot contain another form.

  It is invalid HTML, React refuses it with "<form> cannot contain a nested
  <form>", and the browser's own parser will silently drop the inner one — so
  the controls inside it stop belonging to anything and Enter submits the outer
  form instead, sending a half-filled report.

  MechanicPicker is embedded inside other people's forms (the shop claim form
  and the new-report form both render it), so anything it draws has to work as
  a fragment of someone else's form rather than a form of its own. The `form=`
  attribute does let a control belong to a form that is not its ancestor, but
  only when that form element itself lives outside — putting it inside the
  outer form, as this component briefly did, defeats the point entirely.
*/

/*
  Comments are stripped before matching. Without that, a comment explaining why
  there is no <form> here counts as a <form>, and the test reports a bug that
  does not exist.
*/
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const read = (p: string) =>
  stripComments(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));

/** Components rendered inside a caller's <form>. */
const EMBEDDED_IN_FORMS = ["components/mechanic-picker.tsx"];

describe("components embedded inside a form", () => {
  it.each(EMBEDDED_IN_FORMS)("%s renders no form element of its own", (file) => {
    expect(read(file)).not.toMatch(/<form[\s>]/);
  });

  it.each(EMBEDDED_IN_FORMS)("%s has no submit buttons to hijack Enter", (file) => {
    // A bare <button> inside a form defaults to type="submit", which would
    // submit the surrounding form instead of doing what it says.
    const src = read(file);
    expect(src).not.toMatch(/type="submit"/);
  });
});

describe("the forms that embed it", () => {
  it.each(["app/shops/claim/claim-form.tsx", "app/experiences/new/new-experience-form.tsx"])(
    "%s really does wrap the picker in a form",
    (file) => {
      // If this stops being true the rule above is guarding nothing, and the
      // test should be revisited rather than quietly passing.
      const src = read(file);
      expect(src).toMatch(/<form[\s>]/);
      expect(src).toContain("MechanicPicker");
    },
  );
});

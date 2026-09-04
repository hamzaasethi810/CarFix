import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/*
  Every var() in globals.css must resolve to a definition in globals.css.

  An unresolved var() is not a CSS error — the browser drops the entire
  declaration containing it and carries on. That makes it the quietest possible
  regression: the rule simply stops applying, no console warning, no failing
  test, and it is only visible to whoever happens to load that page.

  Tailwind's own namespace is excluded: --tw-* and --color-*\/--text-*\/--font-*
  \/--radius-*\/--shadow-*\/--ease-* are generated into the utility layer from
  @theme inline rather than declared as plain properties here.
*/
const GENERATED = /^--(tw-|color-|text-|radius-|shadow-|ease-|spacing|container-|breakpoint-|leading-|tracking-|default-)/;

/*
  Injected onto <html> by next/font in app/layout.tsx, so they are legitimately
  used here without being declared here.

  Listed by exact name rather than excluding the whole --font-* namespace on
  purpose. This task renames the font variables, and a namespace-wide exclusion
  would hide a dangling `var(--font-body)` left behind in this very file — the
  single most likely way this task breaks. An allowlist has to be edited when
  the names change, which is the point.
*/
const INJECTED = new Set(["--font-archivo", "--font-martian"]);

describe("globals.css variables", () => {
  it("every var() reference resolves to a definition in the same file", () => {
    const defined = new Set(
      [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
    );
    const used = new Set(
      [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((m) => m[1]),
    );

    const unresolved = [...used].filter(
      (v) => !defined.has(v) && !GENERATED.test(v) && !INJECTED.has(v),
    );

    expect(unresolved, `unresolved var() in app/globals.css: ${unresolved.join(", ")}`).toEqual([]);
  });
});

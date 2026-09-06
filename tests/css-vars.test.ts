import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sources } from "./source-files";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/*
  Definitions are collected from base scope only.

  Every token in this stylesheet is declared at least twice: once in :root as a
  real value, and again inside `@theme inline` as a mapping that hands it to
  Tailwind's utility generator. Several are declared a third time inside a
  `prefers-contrast` or `prefers-reduced-transparency` block.

  A whole-file scan therefore treats a token as "defined" while its only real
  declaration is gone — the exact partial deletion this guard exists to catch.
  Deleting `--separator` from :root left it "defined" by two media-query
  overrides and the guard stayed green; deleting a token from :root while
  `@theme inline` still maps it leaves that mapping resolving to itself, which
  is invalid and equally silent.

  So @media and @theme blocks are stripped before definitions are read.
  Overrides and mappings are not definitions.
*/
function baseScope(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const at = source.indexOf("@", i);
    if (at === -1) {
      out += source.slice(i);
      break;
    }
    if (!/^@(media|theme|supports)/.test(source.slice(at))) {
      out += source.slice(i, at + 1);
      i = at + 1;
      continue;
    }
    out += source.slice(i, at);
    // Walk to the block's opening brace, then match braces to its close.
    let j = source.indexOf("{", at);
    if (j === -1) break;
    let depth = 1;
    j += 1;
    while (j < source.length && depth > 0) {
      if (source[j] === "{") depth += 1;
      else if (source[j] === "}") depth -= 1;
      j += 1;
    }
    i = j;
  }
  return out;
}

const base = baseScope(css);

/*
  Every var() in globals.css must resolve to a definition in globals.css.

  An unresolved var() is not a CSS error — the browser drops the entire
  declaration containing it and carries on. That makes it the quietest possible
  regression: the rule simply stops applying, no console warning, no failing
  test, and it is only visible to whoever happens to load that page.

  Tailwind's generated namespace is excluded by prefix: tw, color, text, radius,
  shadow, ease, spacing and friends are emitted into the utility layer from
  @theme inline rather than declared as plain custom properties here.

  The font prefix is deliberately NOT in that list. The two real font variables
  are allowlisted below by exact name instead, so a leftover reference to the
  retired --font-body or --font-display still fails this test.
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
const INJECTED = new Set(["--font-geist", "--font-geist-mono"]);

/*
  Declared only inside `@theme inline`, which the base-scope strip removes, but
  genuinely emitted by Tailwind as real custom properties at build time.

  By exact name, for the same reason as INJECTED. The `--font-` prefix was
  deliberately left out of GENERATED so that a leftover `var(--font-body)` from
  the retired Barlow setup would still fail this test; a namespace-wide
  exclusion here would hand that protection straight back.
*/
const THEME_EMITTED = new Set(["--font-sans", "--font-mono"]);

describe("globals.css variables", () => {
  it("every var() reference resolves to a definition in the same file", () => {
    const defined = new Set(
      [...base.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
    );
    /*
      Only BARE var() references are dangerous.

      `var(--x, 0ms)` cannot invalidate anything: if --x is missing the browser
      uses the fallback and the declaration survives, which is the entire point
      of the fallback syntax. `var(--x)` with nothing after it is the form that
      drops the whole declaration silently, so that is the form this guards.

      Matching both would flag every deliberately-defaulted property — the
      per-element delays that components set inline through a style prop, for
      instance — and a guard that cries wolf on safe code is one people start
      routing around.
    */
    const used = new Set(
      [...css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)].map((m) => m[1]),
    );

    const unresolved = [...used].filter(
      (v) => !defined.has(v) && !GENERATED.test(v) && !INJECTED.has(v) && !THEME_EMITTED.has(v),
    );

    expect(unresolved, `unresolved var() in app/globals.css: ${unresolved.join(", ")}`).toEqual([]);
  });

  it("every var() used in a component resolves to a globals.css definition", () => {
    /*
      Every finding in R11-R13 lived in a .tsx file, not in globals.css, so the
      guard above never saw any of them. A deleted token whose only remaining
      consumer is a component's className or style prop fails exactly the same
      way — the declaration it sits inside is silently dropped — and is exactly
      as invisible to CI.
    */
    const defined = new Set(
      [...base.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
    );
    const offenders: string[] = [];
    for (const f of sources()) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
      /* Bare references only, for the same reason as the check above. */
      for (const m of src.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) {
        if (!defined.has(m[1]) && !THEME_EMITTED.has(m[1])) offenders.push(`${f}: ${m[1]}`);
      }
    }
    expect(offenders, `unresolved var() in components: ${offenders.join(", ")}`).toEqual([]);
  });
});

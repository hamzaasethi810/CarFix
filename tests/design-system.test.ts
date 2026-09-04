import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PENDING } from "./design-pending";
import { sources } from "./source-files";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/*
  Comments are stripped before matching, so a comment explaining why a rule
  exists does not itself trip that rule. tests/no-nested-forms.test.ts does the
  same thing for the same reason.
*/
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Files already converted for a given rule: everything not still on its worklist. */
const converted = (rule: string) =>
  sources().filter((f) => !PENDING[rule].includes(f));

describe("the type layer", () => {
  it("loads both faces through next/font, never a third-party origin", () => {
    const src = read("app/layout.tsx");
    expect(src).toContain("next/font/google");
    expect(src).toContain("Archivo");
    expect(src).toContain("Martian_Mono");
    // A stylesheet link to a font host would break the CSP in next.config.ts.
    expect(src).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it("retires the previous superfamily", () => {
    const src = read("app/layout.tsx");
    expect(src).not.toContain("Barlow");
  });

  it("defines no font variable in terms of itself", () => {
    /*
      Tailwind v4 builds font-* utilities from the --font-* namespace, so
      `--font-mono: var(--font-mono)` is a cycle that silently resolves to
      nothing. The next/font variables are named for their faces precisely so
      the theme mapping cannot collide with them.
    */
    const css = read("app/globals.css");
    expect(css).not.toMatch(/--font-(sans|mono):\s*var\(--font-\1\)/);
    expect(css).toContain("--font-archivo");
    expect(css).toContain("--font-martian");
  });
});

describe("no dangling utility classes", () => {
  it("no converted file applies a utility whose theme token was deleted", () => {
    /*
      A Tailwind class whose @theme token no longer exists does not error and
      does not warn. The class simply stops matching any rule, so the element
      renders unstyled and looks almost right. font-condensed and text-gold both
      died with the old world.
    */
    for (const f of converted("deletedUtilities")) {
      expect(stripComments(read(f)), f).not.toMatch(/font-condensed|text-gold|bg-gold/);
    }
  });
});

describe("the document has no cards", () => {
  it("no converted file imports or renders Card", () => {
    for (const f of converted("card")) {
      expect(stripComments(read(f)), f).not.toMatch(/\bCard\b/);
    }
  });

  it("no converted file keeps a retired radius or shadow utility", () => {
    for (const f of converted("retiredUtilities")) {
      expect(stripComments(read(f)), f).not.toMatch(/rounded-card|rounded-glass|shadow-card/);
    }
  });

  it("no converted file uses a deleted primitive", () => {
    for (const f of converted("deletedPrimitives")) {
      expect(stripComments(read(f)), f).not.toMatch(/PageTitle|EmptyState|VerifiedBadge/);
    }
  });
});

describe("the stamp stays reserved", () => {
  it("no converted file outside components/ui.tsx names the stamp ink", () => {
    /*
      Gated on the worklist, because the premise this was first written on was
      wrong: components/job-card.tsx already applies var(--stamp) directly via a
      style prop. Task 10 converts it and removes it from the list, at which
      point this rule becomes absolute.
    */
    for (const f of converted("stampInk")) {
      if (f === "components/ui.tsx") continue;
      expect(stripComments(read(f)), f).not.toMatch(/--stamp|text-stamp|bg-stamp/);
    }
  });
});

describe("the conversion worklist", () => {
  /*
    Task 13 removes this .skip. Until then the worklist is the honest record of
    work outstanding, and a skipped test says so out loud — a test that returns
    early and then asserts trivially would say nothing at all.
  */
  it.skip("is empty once every task has run", () => {
    expect(Object.values(PENDING).flat()).toEqual([]);
  });
});

describe("the ruled columns are a table", () => {
  const ui = () => read("components/ui.tsx");

  it("exposes table, row, columnheader and cell roles", () => {
    /*
      A CSS grid of divs carries no relationship between a figure and the head
      above it. This is the product's primary content, and PRODUCT.md makes the
      accessibility guarantees binding, so the roles are not optional.
    */
    for (const role of ['role="table"', 'role="row"', 'role="columnheader"', 'role="cell"']) {
      expect(ui()).toContain(role);
    }
  });

  it("builds the head row in exactly one place", () => {
    // Two copies drift; the blank form then promises different columns.
    expect(ui().match(/role="columnheader"/g)?.length).toBe(2);
  });

  it("never nests role=\"row\" inside a Link (R22)", () => {
    /*
      An <a> carries an implicit role="link". Wrapping a role="row" div in
      <Link> produces table > link > row, which erases the row from the
      table for assistive tech walking it — worse than shipping no roles at
      all. The link belongs inside a cell instead, stretched over the row.

      The original bug hid from a naive text scan because the row lived in a
      `body` variable referenced as `{body}` inside <Link> — the markup never
      sat textually between the tags. This resolves that one indirection
      before scanning, so the check exercises what actually renders; once
      fixed there is no `body` variable left and the resolve is a no-op.
    */
    const src = ui();
    const bodyMatch = src.match(/const body = ([\s\S]*?);\s*\n\s*if \(!href\) return body;/);
    const resolved = bodyMatch ? src.replace("{body}", bodyMatch[1]) : src;
    const linkBlocks = resolved.match(/<Link\b[\s\S]*?<\/Link>/g) ?? [];
    for (const block of linkBlocks) {
      expect(block).not.toMatch(/role="row"/);
    }
  });
});

describe("photography", () => {
  it("the illustrated car is gone", () => {
    expect(() => read("components/landing/car.tsx")).toThrow();
  });
});

describe("the reveal", () => {
  it("renders its content without JavaScript", () => {
    /*
      The last critique's top finding: 17 reveal elements sat at opacity 0 and
      none ever received data-shown, so the whole page was invisible with JS
      disabled or the observer unsupported. The revealed state must therefore
      be the CSS default, with the observer removing a class rather than
      adding one.
    */
    const css = read("app/globals.css");
    expect(css).toMatch(/\.reveal\[data-pending\]/);
    expect(css).not.toMatch(/\.reveal\s*\{[^}]*opacity:\s*0/);
  });
});

describe("the chrome", () => {
  it("the header does not animate: it is on every page and touched constantly", () => {
    const src = stripComments(read("components/site-header.tsx"));
    expect(src).not.toMatch(/transition-\[transform\]|animate-/);
  });

  it("footer policy links meet the 44px target", () => {
    // The critique found them at 16px. min-h-11 is the 44px floor.
    expect(read("app/layout.tsx")).toMatch(/min-h-11/);
  });
});

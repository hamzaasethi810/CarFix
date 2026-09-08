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
    expect(src).toContain("Geist");
    expect(src).toContain("Geist_Mono");
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
    expect(css).toContain("--font-geist");
    expect(css).toContain("--font-geist-mono");
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
      /*
        text-gold and bg-gold came off this list when the gold token was
        restored. They are real utilities again — the subscription tier is
        called Gold in the product, so the mark that denotes it is gold — and a
        rule that forbids a utility which exists would be a rule people delete
        rather than obey. font-condensed stays: that token is genuinely gone,
        retired with Barlow Condensed.
      */
      expect(stripComments(read(f)), f).not.toMatch(/font-condensed/);
    }
  });
});

describe("the document has no cards", () => {
  it("no converted file imports or renders Card", () => {
    for (const f of converted("card")) {
      /*
        Component usage, not the word.

        A bare /\bCard\b/ also matches prose: the privacy policy legitimately
        says "Card details." and was pinned to this worklist by its own copy
        rather than by any code. The rule is about importing or rendering the
        deleted component, so that is what it matches.
      */
      expect(stripComments(read(f)), f).not.toMatch(
        /<Card[\s/>]|\bCard\b\s*[,}][^;]*from\s+["']@\/components\/ui|from\s+["']@\/components\/ui["'][^;]*\bCard\b/,
      );
    }
  });

  it("no converted file keeps a retired radius or shadow utility", () => {
    for (const f of converted("retiredUtilities")) {
      expect(stripComments(read(f)), f).not.toMatch(/rounded-card|rounded-glass|shadow-card/);
    }
  });

  it("no converted file uses a deleted primitive", () => {
    for (const f of converted("deletedPrimitives")) {
      /* Usage, not the word, for the same reason as Card above. */
      expect(stripComments(read(f)), f).not.toMatch(
        /<(?:PageTitle|EmptyState|VerifiedBadge)[\s/>]|\b(?:PageTitle|EmptyState|VerifiedBadge)\b[^;\n]*from\s+["']@\/components\/ui|from\s+["']@\/components\/ui["'][^;]*\b(?:PageTitle|EmptyState|VerifiedBadge)\b/,
      );
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
    Armed. Every array is empty, so all seven sweeps are now unconditional and
    a file that regresses fails immediately rather than being excused by a
    worklist entry.
  */
  it("is empty once every task has run", () => {
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

  it("the header is opaque: glass is retired from the chrome", () => {
    /*
      The original version of this test only checked for transform/animate-
      classes, which the pre-redesign header never had either — it passed
      against the old translucent, backdrop-blurred header and guarded
      nothing. This asserts the actual thing that changed: the blur, the
      color-mix ground, and any --glass- token are gone, and the opaque
      bg-elevated surface is in their place.
    */
    const src = stripComments(read("components/site-header.tsx"));
    expect(src).not.toMatch(/backdrop-blur/);
    expect(src).not.toMatch(/color-mix/);
    expect(src).not.toMatch(/--glass-/);
    expect(src).toMatch(/bg-elevated/);
  });

  it("footer policy links meet the 44px target", () => {
    // The critique found them at 16px. min-h-11 is the 44px floor.
    expect(read("app/layout.tsx")).toMatch(/min-h-11/);
  });

  it("the footer stays inline flow so the sentence wraps as prose, not as flex items", () => {
    /*
      R27: flex/flex-wrap on the footer's wrapper turned the sentence and
      each link into sibling flex items, which wrap BETWEEN items rather
      than merging into the running text — at 360px that stranded a
      dangling middot at the end of one line and orphaned the last link
      alone on the next. Plain inline flow with inline-flex links (atomic
      inline-level boxes) wraps the whole thing like ordinary prose.
    */
    const src = stripComments(read("app/layout.tsx"));
    const footerMatch = src.match(/<footer[\s\S]*?<\/footer>/);
    expect(footerMatch, "footer element not found").toBeTruthy();
    expect(footerMatch![0]).not.toMatch(/\bflex\b/);
    expect(footerMatch![0]).not.toMatch(/flex-wrap/);
  });
});

describe("the landing", () => {
  const page = () => stripComments(read("app/page.tsx"));

  it("shows one block at a time", () => {
    /*
      Inverted deliberately, and this records why so the old rule is not
      restored from memory.

      Snapping was removed earlier because it fought a very tall mock repair
      order in the hero: a block taller than the window plus mandatory snapping
      is a page that drags you off what you are reading. That record is gone,
      every block now fits a viewport, and the snapping is proximity rather
      than mandatory, so a block that outgrows a short window still scrolls
      normally.
    */
    expect(page()).toMatch(/home-block/);
    const css = stripComments(read("app/globals.css"));
    expect(css).toMatch(/scroll-snap-stop: always/);

    /*
      Mandatory IS used, and this asserts the guard rather than forbidding it.

      An earlier version of this test banned mandatory outright, because
      mandatory snapping on a block taller than the window traps a reader
      against content they cannot scroll to. That risk is real but it is a
      function of window height, not of the setting: every block here is sized
      to the viewport, and proximity turned out too weak to do the job — a
      trackpad flick carries far enough that the nearest snap point is already
      the next block.

      So mandatory is allowed, and what is checked instead is that it is height
      gated and that a shorter window still falls back.
    */
    expect(css).toMatch(/scroll-snap-type: y mandatory/);
    expect(css).toMatch(/scroll-snap-type: y proximity/);
    expect(css).toMatch(/@media \(min-height: 700px\)/);

    /*
      The rule must sit on the ROOT element, which is what scrolls.

      This shipped broken once. scroll-snap-type was set on body, where it
      computes and inherits and looks perfectly correct in devtools, and does
      nothing at all, because body is not the scroll container. The computed
      style on body read "y mandatory" while the root element read "none", so
      every check available agreed the feature was on while no block ever
      snapped. Asserting the selector is the cheapest way to catch it.
    */
    expect(css).toMatch(/html:has\(\.home-root\)\s*\{[^}]*scroll-snap-type: y proximity/);
    expect(css).not.toMatch(/body:has\(\.home-root\)\s*\{[^}]*scroll-snap-type/);
  });

  it("shows no money figure that is not marked an example", () => {
    /*
      Nothing has been filed yet, so every money figure anywhere on this page is
      invented. That is allowed in exactly one place — the worked receipt beside
      the paragraph about receipts — and only because it says so on screen and
      in the markup.

      This checks the page AND the components it renders, because an earlier
      version of this rule only read app/page.tsx and would have passed happily
      the moment the figures moved into a component. A guard that can be
      satisfied by moving code is not a guard.
    */
    const landing = ["app/page.tsx", "components/landing/generation-picker.tsx"];
    for (const f of landing) {
      expect(stripComments(read(f)), f).not.toMatch(/\$[\d,]+/);
    }

    // The one exception has to declare itself, both ways.
    const receipt = read("components/landing/receipt-example.tsx");
    expect(receipt).toMatch(/\$[\d,]+/);
    expect(receipt).toContain('data-example="true"');
    expect(receipt).toMatch(/An example\. No prices have been filed yet\./);
  });

  it("does not query prices that cannot exist yet", () => {
    /*
      The hero queried /api/pricing on every generation picked. It returns zero
      for all of them because nothing is filed, so it was a database round trip
      whose answer was known in advance.
    */
    for (const f of ["app/page.tsx", "components/landing/generation-picker.tsx"]) {
      expect(stripComments(read(f)), f).not.toContain("/api/pricing");
    }
  });

  it("states one action per intent", () => {
    const src = page();
    expect(src).toMatch(/cta:\s*\{/);
    expect(src.match(/\bbutton:\s*"/g)).toBeNull();
  });

  it("has exactly one h1", () => {
    expect(page().match(/<h1[\s>]/g)?.length ?? 0).toBe(1);
  });
});


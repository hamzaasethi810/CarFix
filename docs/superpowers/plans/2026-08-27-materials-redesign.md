# Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the white Apple-HIG surface with the skeuomorphic material system the spec calls for — deep forest green ground, raised work surfaces, machined-aluminium buttons, condensed mechanical type — across the whole site in one coherent pass.

**Architecture:** The site already routes almost everything through semantic tokens in `app/globals.css` (`--bg`, `--label`, `--accent`) mapped to Tailwind v4 utilities via `@theme inline`, and every button through one `buttonStyles` object in `components/ui.tsx`. That is the leverage: most of this redesign is retokenising two files, not editing fifty components. The work is to retokenise carefully, rebuild the button as a material, and then sweep the handful of places that escape the token system.

**Tech Stack:** Tailwind v4, Next.js 16 App Router, `next/font/google`, Vitest, Puppeteer for breakpoint verification.

**Spec:** `docs/superpowers/specs/2026-08-26-gaari-globe-redesign-design.md` — Part 3 (Materials), plus the Part 6 rule for admin pages and the `prefers-reduced-motion` guardrail.

**This is plan 1 of 3.** The spec's build order is Materials → Globe and descent → Motion. Materials comes first because the globe and the motion work both sit on these surfaces; building them against the old white palette would mean doing them twice.

## Global Constraints

- **Contrast is the failure mode.** Flipping to a dark ground while leaving `--label: #16161a` makes the site unreadable. Every text token must be re-derived against its new surface, and Task 1 adds an automated check so this cannot regress silently.
- **No pills.** `rounded-full` goes wherever it appears on a control. Buttons are machined rectangles with a small radius.
- **Every surface looks like it is made of something.** Flat fills are the thing being replaced — the ground has grain and a vignette, buttons have a brush direction and a specular edge.
- **Work surfaces are raised and lighter.** Anything read or typed into sits on its own panel. Unreadable form fields are what sink dark themes.
- **Admin and reviewer pages get the shell and nothing else** (spec Part 6). No texture work, no specular animation. They are tools for a handful of people.
- `prefers-reduced-motion` disables the specular travel and any transition; the control still shows its state.
- `prefers-reduced-transparency` and `prefers-contrast` must keep working — the existing file already handles them and the replacements must too.
- Layering, auth, MFA, receipt handling, ownership checks and rate limiting are untouched. This is a presentation change only.
- All existing tests must keep passing. Baseline is 232 passed, 1 skipped — the skip is a pre-existing conditional OCR test.

---

### Task 1: The palette, with a contrast test that guards it

**Files:**
- Create: `lib/design/contrast.ts`
- Create: `tests/contrast.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `contrastRatio(foreground: string, background: string): number` — WCAG 2.1 relative-luminance ratio, accepting `#rgb`, `#rrggbb`, and `rgba(...)` over an opaque backdrop.

Write the test first. It is what makes the rest of this plan safe to execute.

- [ ] **Step 1: Write the failing test**

Create `tests/contrast.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/contrast.test.ts`
Expected: FAIL — `lib/design/contrast` does not resolve.

- [ ] **Step 3: Write the contrast helper**

Create `lib/design/contrast.ts`. No `server-only` here — it is a pure colour
calculation used by tests and potentially by tooling.

```ts
/*
  WCAG 2.1 relative luminance and contrast ratio.

  Exists so the palette can be checked automatically. A dark repaint is very
  easy to get wrong in a way nobody notices until a user cannot read a form
  label, and "it looked fine on my monitor" is not a check.
*/

type Rgb = { r: number; g: number; b: number; a: number };

function parse(colour: string): Rgb {
  const value = colour.trim();

  const rgba = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const [r, g, b, a = 1] = parts;
    return { r, g, b, a };
  }

  const hex = value.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
  };
}

/** Flattens a translucent colour onto an opaque one. */
function over(top: Rgb, bottom: Rgb): Rgb {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  };
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const bg = parse(background);
  const fg = over(parse(foreground), bg);
  const [lighter, darker] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Run the helper tests**

Run: `npx vitest run tests/contrast.test.ts -t "contrastRatio"`
Expected: the two `contrastRatio` cases PASS. The palette cases still FAIL —
the palette is still white-on-white light mode. That is correct for now.

- [ ] **Step 5: Repaint the palette**

In `app/globals.css`, rewrite the `:root` block. Set `color-scheme: dark`.
Replace the header comment — it currently describes an Apple HIG light theme
and would become a lie.

Target values, chosen to clear the test's floors:

```css
:root {
  color-scheme: dark;

  /* Ground — deep forest green. Texture is applied on body, not here. */
  --bg: #0E1F16;
  --bg-elevated: #17301F;   /* raised work surface */
  --bg-grouped: #12271A;
  --bg-tertiary: #1B3624;
  --fill-quaternary: rgba(220, 236, 226, 0.10);

  /* Type — white and near-white, per the spec. */
  --label: #F2F7F3;
  --label-secondary: rgba(228, 240, 231, 0.82);
  --label-tertiary: rgba(228, 240, 231, 0.62);
  --separator: rgba(180, 208, 190, 0.22);

  /* A brighter green than the light theme's, so it reads against the ground. */
  --accent: #6FCF8E;
  --accent-fill: #2E7D4F;
  --accent-hover: #37945D;
  --on-accent: #FFFFFF;

  --destructive: #FF6B6B;
  --destructive-fill: #A81E1E;
  --on-destructive: #FFFFFF;

  --success: #7BD69A;
  --warning: #E8A33D;
  --brand: #6FCF8E;
}
```

Do not treat these as sacred. If a value fails the contrast test, change the
value — never the threshold.

- [ ] **Step 6: Run the whole contrast test**

Run: `npx vitest run tests/contrast.test.ts`
Expected: PASS, every case.

If `label-secondary` or `label-tertiary` fail, raise their alpha. If `accent`
fails, lighten it. Iterate on the palette until green.

- [ ] **Step 7: Update the accessibility media queries**

The file has `prefers-contrast: more` and `prefers-reduced-transparency`
blocks written for the light theme — they push things toward white and would
now invert the design. Rewrite both for the dark ground: `more` should deepen
the ground and brighten the type; reduced-transparency should make surfaces
fully opaque rather than more white.

- [ ] **Step 8: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add lib/design/contrast.ts tests/contrast.test.ts app/globals.css
git commit -m "Repaint onto a forest green ground, with a contrast test to hold it"
```

---

### Task 2: Ground texture and raised work surfaces

**Files:**
- Modify: `app/globals.css`
- Modify: `components/ui.tsx` (`Card`, `popoverSurface`)

The spec: *"every surface should look like it is made of something"*, and
*"anything read or typed into sits on a raised lighter panel"*.

- [ ] **Step 1: Give the ground grain and a vignette**

Gradients, not an image file: no extra request, and nothing that can fail to
load. Keep the alphas low — this should read as material under the eye, not as
a visible pattern.

In `app/globals.css`, on `body`:

```css
body {
  background-color: var(--bg);
  background-image:
    /* vignette — corners fall away from the centre */
    radial-gradient(
      ellipse at 50% 35%,
      rgba(0, 0, 0, 0) 40%,
      rgba(0, 0, 0, 0.28) 100%
    ),
    /* brushed grain — a fine vertical tick */
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.014) 0px,
      rgba(255, 255, 255, 0.014) 1px,
      rgba(0, 0, 0, 0.014) 1px,
      rgba(0, 0, 0, 0.014) 2px
    );
  background-attachment: fixed;
}
```

`background-attachment: fixed` keeps the vignette anchored to the viewport so
it does not slide around as the page scrolls.

- [ ] **Step 2: Raise the work surfaces**

`Card` in `components/ui.tsx` currently uses `bg-elevated` with a hairline
shadow tuned for white. Give it the raised treatment: `--bg-elevated` ground, a
1px top highlight (`inset 0 1px 0 rgba(255,255,255,0.06)`), and a shadow with
enough spread to separate it from the textured ground.

Update `--shadow-card` and `--shadow-raised` in the same pass — shadows
calibrated for a white page are invisible on a dark one. On dark grounds,
separation comes from the top highlight more than the drop shadow.

- [ ] **Step 3: Decide the glass layer**

`--glass-*` tokens are defined in `app/globals.css` and used in about ten
places. Glass over a textured dark ground reads as smear, not as material.

Retune the glass tokens to a dark smoked treatment — low-alpha near-black with
the existing blur — rather than deleting them. `.glass` has real callers and
ripping it out turns this task into a refactor of six components. Keep the
class, change what it is made of.

- [ ] **Step 4: Verify the form fields**

Open `/experiences/new` and `/shops/add` in a browser. Every input, select and
textarea must sit on a raised surface with a visible border and readable
placeholder text. This is the specific failure the spec calls out.

- [ ] **Step 5: Run everything and commit**

```bash
npx vitest run && npx tsc --noEmit && npm run lint
git add app/globals.css components/ui.tsx
git commit -m "Give the ground grain and lift the work surfaces off it"
```

---

### Task 3: Machined aluminium buttons

**Files:**
- Modify: `components/ui.tsx` (`buttonStyles`, `BUTTON_BASE`)
- Modify: `app/globals.css` (the specular keyframes)

Every button on the site already routes through `buttonStyles`, so this is one
edit that propagates everywhere.

The spec: *"Vertical brush pattern, bright top edge, dark bottom edge, a
specular band that travels on hover. Pressing depresses. No pills anywhere."*

- [ ] **Step 1: Build the material**

In `app/globals.css`:

```css
/*
  A machined-aluminium control.

  Three things make metal read as metal: a directional brush, edges that catch
  light differently top and bottom, and a highlight that moves when the object
  does. The inset edges are what give it thickness — without them this is just
  a gradient.
*/
.machined {
  position: relative;
  overflow: hidden;
  background-image: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.05) 0px,
    rgba(255, 255, 255, 0.05) 1px,
    rgba(0, 0, 0, 0.05) 1px,
    rgba(0, 0, 0, 0.05) 2px
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.30),   /* bright top edge */
    inset 0 -1px 0 rgba(0, 0, 0, 0.38),        /* dark bottom edge */
    0 1px 2px rgba(0, 0, 0, 0.35);
}

/* The specular band, parked off the left edge until hover moves it across. */
.machined::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.22) 48%,
    transparent 66%
  );
  transform: translateX(-100%);
}

.machined:active {
  /* Depress: the edges swap, so the light now comes from below. */
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.45),
    inset 0 -1px 0 rgba(255, 255, 255, 0.12);
}
.machined:active > * {
  transform: translateY(1px);
}

@media (prefers-reduced-motion: no-preference) {
  .machined::after {
    transition: transform 520ms ease-out;
  }
  .machined:hover::after {
    transform: translateX(100%);
  }
}
```

Under reduced motion the button keeps its material, its hover fill and its
press; only the travelling highlight stops.

- [ ] **Step 2: Apply it to the button styles**

In `components/ui.tsx`, add `machined` to `BUTTON_BASE` and confirm the base
carries a small radius rather than a pill. Keep the four variants — `primary`,
`secondary`, `destructive`, `plain` — and their token colours; the material
sits on top of the fill rather than replacing it.

`plain` is the exception: it is a text button, so it gets no material. Leave it
flat.

- [ ] **Step 3: Remove the remaining pills**

Three files still use `rounded-full`. Find them:

```bash
grep -rn 'rounded-full' app components
```

Replace on controls. If one is a genuine circle — an avatar, a status dot —
leave it; the spec's objection is to pill-shaped buttons, not to round things
that are meant to be round. Say which you kept and why in your report.

- [ ] **Step 4: Check the admin and reviewer pages**

Per spec Part 6 these stay plain. Confirm `/admin` and `/review` inherit the
shell and the button material without any additional treatment, and that
nothing there looks broken against the new ground.

- [ ] **Step 5: Verify in a browser**

```bash
npm run dev
```

Check a primary, secondary and destructive button: material visible, top edge
bright, specular travels on hover, depresses on press. Then set
`prefers-reduced-motion: reduce` in devtools and confirm the travel stops while
the button stays usable.

- [ ] **Step 6: Run everything and commit**

```bash
npx vitest run && npx tsc --noEmit && npm run lint
git add components/ui.tsx app/globals.css
git commit -m "Make the buttons out of machined aluminium"
```

---

### Task 4: Condensed mechanical type

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

The spec: *"White, condensed, mechanical — the register of workshop signage and
gauge faces."*

- [ ] **Step 1: Load the faces**

Use `next/font/google`, which self-hosts at build time — no runtime request to
Google, which keeps the CSP intact and leaks nothing about visitors.

In `app/layout.tsx`:

```ts
import { Barlow, Barlow_Condensed } from "next/font/google";

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
```

Put `${body.variable} ${display.variable}` on the `<html>` className.

**Condensed for display only, not for body.** Fully condensed text at 15–17px
is measurably harder to read, and this site asks people to read prices and
service descriptions. Barlow and Barlow Condensed are the same superfamily, so
they sit together without clashing.

- [ ] **Step 2: Wire the faces to the scale**

In `app/globals.css`: set `body`'s `font-family` to `var(--font-body)` with the
existing system stack as fallback, and add a rule giving the display face to
headings and the title text styles.

The existing text scale has Apple's negative letter-spacing, tuned for SF Pro.
Barlow Condensed at those tracking values will look cramped — set display sizes
to normal or slightly positive tracking.

- [ ] **Step 3: Check the wordmark still fits**

The header logo is an image (`public/gaari-logo.png`), so it is unaffected —
but the nav items beside it change width with the new face. Check the header at
360px, 768px and 1440px and confirm nothing wraps or collides.

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run && npx tsc --noEmit && npm run lint && npm run build
git add app/layout.tsx app/globals.css
git commit -m "Set the site in condensed mechanical type"
```

---

### Task 5: Sweep what escapes the tokens

**Files:**
- Modify: `app/discover.tsx`
- Modify: `app/layout.tsx` (theme colour)
- Modify: `app/shops/[id]/subscription-panel.tsx`
- Modify: `app/icon.svg`

Four places hardcode colours and so did not move with the palette.

- [ ] **Step 1: Find them**

```bash
grep -rnE '#[0-9a-fA-F]{3,8}\b' app components | grep -v globals.css
```

- [ ] **Step 2: Fix each**

- `app/discover.tsx` — map pin and overlay colours. These feed MapLibre, which
  cannot read CSS variables, so they must stay literal. Move them to a named
  constant block at the top of the file with a comment saying why, and pick
  values that match the new palette.
- `app/layout.tsx` — the `theme-color` meta must become the new ground colour,
  or mobile browsers will frame the site in white.
- `app/shops/[id]/subscription-panel.tsx` — replace with tokens.
- `app/icon.svg` — the favicon. Check it still reads on a dark browser tab.

- [ ] **Step 3: Commit**

```bash
git add app/discover.tsx app/layout.tsx app/shops/\[id\]/subscription-panel.tsx app/icon.svg
git commit -m "Move the last hardcoded colours onto the new palette"
```

---

### Task 6: Verify the whole site in a real browser

The spec requires this: *"Verified in a real browser at every breakpoint and
both orientations before any of it is called done."*

**Files:**
- Create: `scripts/screenshot-pages.mjs`

- [ ] **Step 1: Write the capture script**

Install the driver first — it is **not** currently a dependency of this repo:

```bash
npm install --save-dev puppeteer-core
```

Create `scripts/screenshot-pages.mjs` driving the system Chrome. On this
machine that is:

    /Applications/Google Chrome.app/Contents/MacOS/Google Chrome

Read it from `process.env.CHROME_PATH` with that as the fallback, so the script
is not hardcoded to one machine:

```js
const executablePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
```

It should walk a list of routes at three viewports — 390×844 (phone),
844×390 (phone landscape), 820×1180 (tablet), 1440×900 (desktop) — and write
PNGs to `tmp/shots/`. Add `tmp/` to `.gitignore` if it is not there.

Routes: `/`, `/experiences/new`, `/shops/add`, `/mechanics`, `/settings`,
`/review`, `/admin`, `/privacy`.

- [ ] **Step 2: Capture and look at them**

```bash
npm run dev &
node scripts/screenshot-pages.mjs
```

Actually open the PNGs. Check specifically:

- no white flashes or white panels left over from the old theme
- every form field is readable, with a visible border and legible placeholder
- buttons show their material and are not pills
- nothing is clipped or overlapping at 844×390, the landscape phone case that
  has broken twice before on this site
- admin and reviewer pages look plain but not broken

- [ ] **Step 3: Fix what the screenshots show**

Expect to find things. Fix them, re-capture, and say in your report which
issues the screenshots caught — that is the evidence this task did its job.

- [ ] **Step 4: Final verification**

```bash
npx vitest run && npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add scripts/screenshot-pages.mjs .gitignore
git commit -m "Add a breakpoint screenshot sweep"
```

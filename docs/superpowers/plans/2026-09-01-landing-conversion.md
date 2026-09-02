# Landing Page Conversion Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five-beat scroll story with a conversion-shaped landing page — a filter bar that starts a search above the fold, and three category cards carrying live proof that the record covers mechanics, wrap shops and tuners.

**Architecture:** The page stays a server component and keeps `revalidate = 300`. Two new read paths (grouped counts, and an anonymised recent-price feed) are added to the existing repository/service layers. Three new client components: a reveal-on-scroll wrapper, a price ticker, and the filter bar. The filter bar navigates to `/search` with query params, so the landing page never loads the map bundle; `/search` gains the ability to read those params.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Tailwind v4, Vitest.

**Spec:** None written — this plan implements the brief given directly in conversation on 2026-09-01. Recorded verbatim in "Brief" below so the argument travels with the plan.

## Brief

> "just some cards with a scrolling animation that show we have information about mechanics, wrap shops, and tuners. it is all user recorded information with validation. and on the front page it has a filters section so they get started. after looking on carfax, turo, nextdoor this seems to be common. go for conversions. i am not selling a product"

## Global Constraints

- **Honest counts only.** The "validated" claim counts `verificationStatus === "VERIFIED"` and nothing else. A `PENDING` receipt is not validation.
- **Zero is never shown as proof.** Any count that resolves to 0 has its element dropped, matching the existing behaviour in `app/page.tsx`.
- **Stats must never 500 the page.** Every new read follows `getProofNumbers`: catch, return null, page renders without the panel.
- **No identity on a public page.** The ticker exposes service name, price, generation code, city/state. Never a user id, display name, username, shop street address, or receipt reference.
- **No map bundle on `/`.** The filter bar links to `/search`; it must not import from `app/discover.tsx` or `components/mechanic-map.tsx`.
- **Motion rules** (from `emil-design-eng`), applied to every animation in this plan:
  - Reveals run **once** (`{ once: true }`), never re-trigger on scroll back.
  - Enter: `opacity 0 → 1`, `translateY(12px) → 0`. Never `scale(0)`.
  - Easing `cubic-bezier(0.23, 1, 0.32, 1)`. Never `ease-in`.
  - Duration 320ms for reveals; stagger 60ms between cards.
  - Only `transform` and `opacity` are animated. Never `transition: all`.
  - Constant motion (the ticker) uses `linear`.
  - `prefers-reduced-motion: reduce` keeps opacity, drops all movement — including stopping the ticker.
  - Hover effects gated behind `@media (hover: hover) and (pointer: fine)`.
  - Pressable elements get `transform: scale(0.97)` on `:active`, 160ms `ease-out`.

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/services/categories.ts` | **Create.** The single mapping from seeded service categories to the three public groups. Pure, no I/O. |
| `lib/repositories/stats.ts` | **Modify.** Add grouped counts and the recent-price query. |
| `lib/services/stats.ts` | **Modify.** Add `getCategoryProof()`, following the existing catch-and-return-null contract. |
| `components/landing/reveal.tsx` | **Create.** Reveal-on-scroll wrapper. Owns the motion contract. |
| `components/landing/price-ticker.tsx` | **Create.** Horizontal marquee of recent prices. |
| `components/landing/category-cards.tsx` | **Create.** The three cards. Server component; composes Reveal + PriceTicker. |
| `components/landing/quick-filters.tsx` | **Create.** Make/model/service filter bar that navigates to `/search`. |
| `app/page.tsx` | **Rewrite.** Hero + filters + cards + close. |
| `app/search/page.tsx` | **Modify.** Read `searchParams` and seed `Discover`. |
| `app/discover.tsx` | **Modify.** Accept initial filter values as props. |
| `components/landing/scroll-story.tsx` | **Delete** once nothing imports it. |
| `components/landing/car-particles.tsx` | **Delete.** Reads as generated. |
| `lib/landing/car-geometry.ts`, `lib/landing/particle-car.ts` | **Delete** with it. |
| `components/landing/count-up.tsx` | **Create** here if the auth plan has not already. Shared by both. |
| `public/img/mechanics.webp`, `appearance.webp`, `performance.webp` | **Owner-supplied** cutouts; see the asset spec. |
| `tests/landing-categories.test.ts` | **Create.** Category grouping and count correctness. |
| `tests/landing-privacy.test.ts` | **Create.** Asserts the ticker leaks no identity. |

## Imagery: three objects, supplied by the owner

The 3D car is deleted — the point cloud reads as generated, which is the opposite of what this page needs. `components/landing/car-particles.tsx`, `lib/landing/car-geometry.ts` and `lib/landing/particle-car.ts` go with it, about 930 lines.

The studio car renders are **also** rejected, for the same reason. Instead the page is carried by three object photographs, one per category, supplied by the owner as cutouts:

| file | category | subject |
| --- | --- | --- |
| `public/img/mechanics.webp` | Mechanics | wrench |
| `public/img/appearance.webp` | Wrap shops | spray can |
| `public/img/performance.webp` | Tuners | exhaust pipe |

### Asset spec (hand this to whoever produces them)

- **Format: PNG or WebP with a real alpha channel.** JPEG cannot hold transparency; a JPEG "with no background" arrives with a white box.
- **Export on transparency, do not key it out of white.** A cutout keyed from a white backdrop keeps a pale fringe on its anti-aliased edge, which shows as a halo the moment it sits on a dark ground.
- **One light direction across all three.** Key from the upper left on every object. Three cutouts lit from three directions read as clip art no matter how good each one is on its own.
- **Consistent framing and scale.** Same margin around the subject in each file, so the objects look like a set rather than three unrelated crops.
- **Include the contact shadow, or none at all.** An object with no shadow floats. Either bake a soft shadow into the alpha on all three, or ship all three clean and let CSS add one. Mixed is the worst outcome.
- **~1600px on the long edge** is plenty; these render at card width.
- Deliver as `wrench`, `spray-can`, `exhaust`. The build converts and renames them.

### Conversion step

```bash
node -e '
const sharp = require("sharp");
const map = { wrench: "mechanics", "spray-can": "appearance", exhaust: "performance" };
(async () => {
  for (const [from, to] of Object.entries(map)) {
    await sharp(`incoming/${from}.png`)
      .resize(1600, null, { withoutEnlargement: true })
      // alphaQuality matters: the default flattens soft shadow edges to a
      // visible step, which is exactly where a cutout gives itself away.
      .webp({ quality: 82, alphaQuality: 95, effort: 6 })
      .toFile(`public/img/${to}.webp`);
    console.log(to);
  }
})();
'
```

Verify each one on **both** grounds before shipping: place it on `--bg` and on the dark band. A fringe that is invisible on light is obvious on dark.

### Where they go

The three objects carry the **category cards**, not the hero. The hero stays type plus filter: the filter is the conversion, and putting an object above it would compete with the only thing that page is asking someone to do.

If a hero image is wanted later, the right one is a still life of all three together, shot as a set. Do not reuse the wrench in two places on one page.

## Global Constraints

- **Honest counts only.** The "validated" claim counts `verificationStatus === "VERIFIED"` and nothing else. A `PENDING` receipt is not validation.
- **Zero is never shown as proof.** Any count that resolves to 0 has its element dropped, matching the existing behaviour in `app/page.tsx`.
- **Stats must never 500 the page.** Every new read follows `getProofNumbers`: catch, return null, page renders without the panel.
- **No identity on a public page.** The ticker exposes service name, price, generation code, city/state. Never a user id, display name, username, shop street address, or receipt reference.
- **No map bundle on `/`.** The filter bar links to `/search`; it must not import from `app/discover.tsx` or `components/mechanic-map.tsx`.
- **Motion rules** (from `emil-design-eng`), applied to every animation in this plan:
  - Reveals run **once** (`{ once: true }`), never re-trigger on scroll back.
  - Enter: `opacity 0 → 1`, `translateY(12px) → 0`. Never `scale(0)`.
  - Easing `cubic-bezier(0.23, 1, 0.32, 1)`. Never `ease-in`.
  - Duration 320ms for reveals; stagger 60ms between cards.
  - Only `transform` and `opacity` are animated. Never `transition: all`.
  - Constant motion (the ticker) uses `linear`.
  - `prefers-reduced-motion: reduce` keeps opacity, drops all movement — including stopping the ticker.
  - Hover effects gated behind `@media (hover: hover) and (pointer: fine)`.
  - Pressable elements get `transform: scale(0.97)` on `:active`, 160ms `ease-out`.

## File Structure

| File | Responsibility |
| --- | --- |
| `lib/services/categories.ts` | **Create.** The single mapping from seeded service categories to the three public groups. Pure, no I/O. |
| `lib/repositories/stats.ts` | **Modify.** Add grouped counts and the recent-price query. |
| `lib/services/stats.ts` | **Modify.** Add `getCategoryProof()`, following the existing catch-and-return-null contract. |
| `components/landing/reveal.tsx` | **Create.** Reveal-on-scroll wrapper. Owns the motion contract. |
| `components/landing/price-ticker.tsx` | **Create.** Horizontal marquee of recent prices. |
| `components/landing/category-cards.tsx` | **Create.** The three cards. Server component; composes Reveal + PriceTicker. |
| `components/landing/quick-filters.tsx` | **Create.** Make/model/service filter bar that navigates to `/search`. |
| `app/page.tsx` | **Rewrite.** Hero + filters + cards + close. |
| `app/search/page.tsx` | **Modify.** Read `searchParams` and seed `Discover`. |
| `app/discover.tsx` | **Modify.** Accept initial filter values as props. |
| `components/landing/scroll-story.tsx` | **Delete** once nothing imports it. |
| `components/landing/car-particles.tsx` | **Delete.** Reads as generated. |
| `lib/landing/car-geometry.ts`, `lib/landing/particle-car.ts` | **Delete** with it. |
| `components/landing/count-up.tsx` | **Create** here if the auth plan has not already. Shared by both. |
| `public/img/mechanics.webp`, `appearance.webp`, `performance.webp` | **Owner-supplied** cutouts; see the asset spec. |
| `tests/landing-categories.test.ts` | **Create.** Category grouping and count correctness. |
| `tests/landing-privacy.test.ts` | **Create.** Asserts the ticker leaks no identity. |

## The 3D car is deleted

Decided: the point cloud reads as generated, which is the opposite of what this page needs. `components/landing/car-particles.tsx`, `lib/landing/car-geometry.ts` and `lib/landing/particle-car.ts` are removed — about 930 lines.

**This leaves the site with no visual asset, which is its own failure.** A pure-text page is not minimalism, it is unfinished, and the CSP (`img-src 'self' blob: data:`) means every image must be a local file.

The fix is already on disk. The two studio renders in `~/Downloads` are real photography of the same car in both states, and they convert small:

| asset | 1600px | 2400px |
| --- | --- | --- |
| silver (stock) | 41 KB | 69 KB |
| green (built) | 44 KB | 75 KB |

Commit both to `public/img/` as WebP at 2400px. Roughly 144KB for the pair, served through `next/image`, and they carry the whole page.

---

### Task 1: Category grouping and grouped counts

**Files:**
- Create: `lib/services/categories.ts`
- Modify: `lib/repositories/stats.ts`
- Modify: `lib/services/stats.ts`
- Test: `tests/landing-categories.test.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db`, the `Service.category` column.
- Produces:
  - `CATEGORY_GROUPS: readonly CategoryGroup[]`
  - `type CategoryGroupId = "mechanics" | "appearance" | "performance"`
  - `groupForCategory(category: string): CategoryGroupId | null`
  - `getCategoryProof(): Promise<CategoryProof[] | null>` where
    `CategoryProof = { id: CategoryGroupId; label: string; blurb: string; reported: number; verified: number }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/landing-categories.test.ts
import { describe, expect, it } from "vitest";
import { CATEGORY_GROUPS, groupForCategory } from "../lib/services/categories";

describe("service category grouping", () => {
  it("maps every seeded category to a group", async () => {
    const { SERVICES } = await import("../prisma/seed-data/vehicles");
    const seeded = [...new Set(SERVICES.map((s) => s.category))];
    const unmapped = seeded.filter((c) => groupForCategory(c) === null && c !== "Other");
    expect(unmapped).toEqual([]);
  });

  it("puts the three public groups in a stable order", () => {
    expect(CATEGORY_GROUPS.map((g) => g.id)).toEqual([
      "mechanics",
      "appearance",
      "performance",
    ]);
  });

  it("routes performance work to tuners and protection work to wrap shops", () => {
    expect(groupForCategory("Performance")).toBe("performance");
    expect(groupForCategory("Appearance & Protection")).toBe("appearance");
    expect(groupForCategory("Brakes & Tires")).toBe("mechanics");
    expect(groupForCategory("Maintenance")).toBe("mechanics");
  });

  it("returns null for a category it does not know", () => {
    expect(groupForCategory("Nonsense")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/landing-categories.test.ts`
Expected: FAIL — cannot resolve `../lib/services/categories`.

- [ ] **Step 3: Write the mapping**

```ts
// lib/services/categories.ts
/*
  The three groups the landing page argues for, and the seeded service
  categories that feed each one.

  The site's claim is that one record serves someone checking whether a brake
  bill was fair and someone specifying a titanium exhaust. That claim is only
  worth making if the categories behind it are real, so these groups are
  derived from `Service.category` rather than written as marketing copy.
*/

export type CategoryGroupId = "mechanics" | "appearance" | "performance";

export type CategoryGroup = {
  id: CategoryGroupId;
  label: string;
  blurb: string;
  /** Values of `Service.category` that belong to this group. */
  categories: readonly string[];
};

export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    id: "mechanics",
    label: "Mechanics",
    blurb: "Brakes, oil, clutches, diagnostics — what the shop actually charged.",
    categories: [
      "Maintenance",
      "Repair",
      "Brakes & Tires",
      "Suspension & Chassis",
      "Interior & Electronics",
    ],
  },
  {
    id: "appearance",
    label: "Wrap shops",
    blurb: "Wraps, PPF and respray. Work that never has a list price.",
    categories: ["Appearance & Protection"],
  },
  {
    id: "performance",
    label: "Tuners",
    blurb: "Tunes, exhausts and kits, priced by generation.",
    categories: ["Performance"],
  },
] as const;

const LOOKUP = new Map<string, CategoryGroupId>(
  CATEGORY_GROUPS.flatMap((g) => g.categories.map((c) => [c, g.id] as const)),
);

/** Null for a category with no public group — "Other", or anything new. */
export function groupForCategory(category: string): CategoryGroupId | null {
  return LOOKUP.get(category) ?? null;
}
```

- [ ] **Step 4: Run the test again**

Run: `npx vitest run tests/landing-categories.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the grouped count query**

```ts
// lib/repositories/stats.ts — append

/*
  Reported and receipt-verified counts per service category, in one pass.

  Grouped in Postgres rather than counting per group in JavaScript: the
  landing page needs all three and the alternative is six round trips.
*/
export async function countExperiencesByCategory(): Promise<
  { category: string; reported: number; verified: number }[]
> {
  const rows = await prisma.$queryRaw<
    { category: string; reported: bigint; verified: bigint }[]
  >`
    SELECT s."category",
           COUNT(*) AS reported,
           COUNT(*) FILTER (WHERE e."verificationStatus" = 'VERIFIED') AS verified
      FROM "MechanicExperience" e
      JOIN "Service" s ON s."id" = e."serviceId"
     GROUP BY s."category"
  `;
  return rows.map((r) => ({
    category: r.category,
    reported: Number(r.reported),
    verified: Number(r.verified),
  }));
}
```

- [ ] **Step 6: Add the service wrapper**

```ts
// lib/services/stats.ts — append
import { CATEGORY_GROUPS, groupForCategory, type CategoryGroupId } from "./categories";
import { countExperiencesByCategory } from "../repositories/stats";

export type CategoryProof = {
  id: CategoryGroupId;
  label: string;
  blurb: string;
  reported: number;
  verified: number;
};

/**
 * Per-group proof for the landing cards, or null if it cannot be read.
 *
 * Null rather than throwing, for the same reason as `getProofNumbers`: a
 * count query that times out should cost the page its proof panel, not its
 * ability to render.
 */
export async function getCategoryProof(): Promise<CategoryProof[] | null> {
  try {
    const rows = await countExperiencesByCategory();
    const totals = new Map<CategoryGroupId, { reported: number; verified: number }>();
    for (const row of rows) {
      const id = groupForCategory(row.category);
      if (!id) continue; // "Other", or a category added since this shipped
      const acc = totals.get(id) ?? { reported: 0, verified: 0 };
      acc.reported += row.reported;
      acc.verified += row.verified;
      totals.set(id, acc);
    }
    return CATEGORY_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      blurb: g.blurb,
      reported: totals.get(g.id)?.reported ?? 0,
      verified: totals.get(g.id)?.verified ?? 0,
    }));
  } catch {
    return null;
  }
}
```

- [ ] **Step 7: Run the full suite and commit**

```bash
npx vitest run tests/landing-categories.test.ts && npx tsc --noEmit && npm run lint
git add lib/services/categories.ts lib/services/stats.ts lib/repositories/stats.ts tests/landing-categories.test.ts
git commit -m "feat(landing): group service categories into mechanics, wrap shops and tuners"
```

---

### Task 2: Anonymised recent-price feed

**Files:**
- Modify: `lib/repositories/stats.ts`
- Modify: `lib/services/stats.ts`
- Test: `tests/landing-privacy.test.ts`

**Interfaces:**
- Consumes: `groupForCategory` from Task 1.
- Produces: `getRecentPrices(perGroup?: number): Promise<Record<CategoryGroupId, TickerEntry[]> | null>` where
  `TickerEntry = { service: string; price: number; generation: string; place: string | null }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/landing-privacy.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { fixtures, makeUser, resetData, validExperience } from "./helpers";
import { addVehicle } from "../lib/services/vehicles";
import { submitExperience } from "../lib/services/experiences";
import { getRecentPrices } from "../lib/services/stats";

describe("landing price ticker", () => {
  let fx: Awaited<ReturnType<typeof fixtures>>;

  beforeAll(async () => {
    await resetData();
    fx = await fixtures();
    const owner = await makeUser();
    const vehicle = await addVehicle(owner.id, {
      makeId: fx.make.id,
      modelId: fx.model.id,
      year: 2022,
    });
    await submitExperience(owner.id, {
      ...validExperience(fx, vehicle.id),
      totalPrice: 1234,
    });
  });

  it("exposes only service, price, generation and place", async () => {
    const feed = await getRecentPrices(5);
    expect(feed).not.toBeNull();
    const entries = Object.values(feed!).flat();
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(Object.keys(e).sort()).toEqual(["generation", "place", "price", "service"]);
    }
  });

  it("never carries a user id, name or street address", async () => {
    const feed = await getRecentPrices(5);
    const blob = JSON.stringify(feed);
    expect(blob).not.toMatch(/userId|displayName|username|email|addressLine|street/i);
  });

  it("returns a bucket for every group, even an empty one", async () => {
    const feed = await getRecentPrices(5);
    expect(Object.keys(feed!).sort()).toEqual(["appearance", "mechanics", "performance"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/landing-privacy.test.ts`
Expected: FAIL — `getRecentPrices` is not exported.

- [ ] **Step 3: Add the query**

```ts
// lib/repositories/stats.ts — append

/*
  The most recent reported prices, for the landing ticker.

  Deliberately narrow. This feeds a page that is public and cached, so the
  select list is the privacy boundary: service, price, generation code and a
  coarse place. No user, no shop address, no receipt.
*/
export async function recentPrices(limit: number) {
  return prisma.mechanicExperience.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      totalPrice: true,
      service: { select: { name: true, category: true } },
      vehicle: { select: { generation: { select: { code: true } } } },
      mechanic: { select: { city: true, state: true } },
    },
  });
}
```

- [ ] **Step 4: Add the service wrapper**

```ts
// lib/services/stats.ts — append
import { recentPrices } from "../repositories/stats";

export type TickerEntry = {
  service: string;
  price: number;
  generation: string;
  place: string | null;
};

/**
 * Recent prices bucketed by group, or null if they cannot be read.
 *
 * Over-fetches once and buckets in memory rather than running one query per
 * group: the feed is small, cached for five minutes, and three ordered
 * queries cost more than one.
 */
export async function getRecentPrices(
  perGroup = 8,
): Promise<Record<CategoryGroupId, TickerEntry[]> | null> {
  try {
    const rows = await recentPrices(perGroup * 12);
    const out: Record<CategoryGroupId, TickerEntry[]> = {
      mechanics: [],
      appearance: [],
      performance: [],
    };
    for (const r of rows) {
      const id = groupForCategory(r.service.category);
      if (!id || out[id].length >= perGroup) continue;
      const city = r.mechanic?.city?.trim();
      const state = r.mechanic?.state?.trim();
      out[id].push({
        service: r.service.name,
        price: r.totalPrice,
        generation: r.vehicle.generation.code,
        place: [city, state].filter(Boolean).join(", ") || null,
      });
    }
    return out;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run tests/landing-privacy.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/repositories/stats.ts lib/services/stats.ts tests/landing-privacy.test.ts
git commit -m "feat(landing): anonymised recent-price feed for the category cards"
```

---

### Task 3: Reveal-on-scroll primitive

**Files:**
- Create: `components/landing/reveal.tsx`

**Interfaces:**
- Produces: `<Reveal delay?: number>{children}</Reveal>`

- [ ] **Step 1: Write the component**

```tsx
// components/landing/reveal.tsx
"use client";

import { useEffect, useRef, useState } from "react";

/*
  Reveals its children once, when they first come into view.

  Once, not every time: a card that re-animates each time it scrolls back
  past reads as a page that cannot settle. `IntersectionObserver` is
  disconnected on the first hit.

  The element renders in its final position for anyone whose browser never
  runs the effect, so nothing is ever permanently invisible.
*/
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      // Fires a little before the edge, so the motion is finishing as the
      // card arrives rather than starting once it is already being read.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown || undefined}
      style={{ transitionDelay: `${delay}ms` }}
      className={`opacity-0 translate-y-3 transition-[opacity,transform] duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)] data-shown:opacity-100 data-shown:translate-y-0 motion-reduce:translate-y-0 motion-reduce:transition-none ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify the motion contract by hand**

Run the dev server, scroll the landing page, and confirm in DevTools:
- the transition lists only `opacity` and `transform`, never `all`
- scrolling back up and down again does **not** replay the reveal
- with "Emulate prefers-reduced-motion: reduce" set, cards are visible with no movement

- [ ] **Step 3: Commit**

```bash
git add components/landing/reveal.tsx
git commit -m "feat(landing): reveal-on-scroll wrapper"
```

---

### Task 4: Price ticker and the three cards

**Files:**
- Create: `components/landing/price-ticker.tsx`
- Create: `components/landing/category-cards.tsx`

**Interfaces:**
- Consumes: `CategoryProof` and `TickerEntry` (Task 1, 2), `Reveal` (Task 3).
- Produces: `<CategoryCards proof={...} feed={...} />`

- [ ] **Step 1: Write the ticker**

```tsx
// components/landing/price-ticker.tsx
"use client";

import type { TickerEntry } from "@/lib/services/stats";

/*
  A slow horizontal crawl of real reported prices.

  The list is rendered twice and the track translated by exactly -50%, which
  is what makes the loop seamless: at the end of the animation the second
  copy sits precisely where the first began.

  It pauses on hover so a price can actually be read, and the CSS animation
  stops entirely when the tab is hidden — the browser does that for free,
  which is one reason this is a keyframe animation rather than rAF.
*/
export function PriceTicker({ entries }: { entries: TickerEntry[] }) {
  if (entries.length === 0) return null;
  const doubled = [...entries, ...entries];

  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <ul
        className="flex w-max gap-2 animate-[ticker_38s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none"
        // Duplicated content is decorative repetition; announce it once.
        aria-hidden="true"
      >
        {doubled.map((e, i) => (
          <li
            key={i}
            className="shrink-0 rounded-control bg-fill px-3 py-1.5 text-footnote text-secondary"
          >
            <span className="text-label font-medium">{e.service}</span>
            <span className="mx-1.5 tabular-nums text-accent font-semibold">
              ${e.price.toLocaleString("en-US")}
            </span>
            <span className="text-tertiary-label">
              {e.generation}
              {e.place ? ` · ${e.place}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Add the keyframes**

```css
/* app/globals.css — append */

/*
  The ticker's loop. -50% because the track renders its list twice; any other
  value lands mid-item and the wrap is visible as a jump.
*/
@keyframes ticker {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

- [ ] **Step 3: Write the cards**

```tsx
// components/landing/category-cards.tsx
import Image from "next/image";
import Link from "next/link";
import type { CategoryProof, TickerEntry } from "@/lib/services/stats";
import type { CategoryGroupId } from "@/lib/services/categories";
import { Reveal } from "./reveal";
import { PriceTicker } from "./price-ticker";

/*
  Three cards, one per group, each carrying its own evidence.

  The number is the argument, so it leads. A card whose group has nothing
  reported yet is dropped rather than shown at zero — an empty category is an
  admission, not proof, which is the same rule the hero counts follow.
*/
export function CategoryCards({
  proof,
  feed,
}: {
  proof: CategoryProof[];
  feed: Record<CategoryGroupId, TickerEntry[]> | null;
}) {
  const shown = proof.filter((p) => p.reported > 0);
  if (shown.length === 0) return null;

  return (
    <section aria-label="What owners have reported" className="mt-20 sm:mt-28">
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        {shown.map((p, i) => (
          <Reveal key={p.id} delay={i * 60}>
            <Link
              href={`/search?group=${p.id}`}
              className="group block h-full rounded-card border border-separator bg-secondary-grouped p-6 transition-[transform,border-color] duration-150 ease-out active:scale-[0.99] hover:[@media(hover:hover)_and_(pointer:fine)]:-translate-y-0.5 hover:[@media(hover:hover)_and_(pointer:fine)]:border-label/20"
            >
              {/*
                The object sits above the number, on the card's own ground.
                Cutouts, so no frame and no rounded photo box: the shape of
                the tool is the shape on the page.
              */}
              <Image
                src={`/img/${p.id}.webp`}
                alt=""
                width={800}
                height={600}
                sizes="(max-width: 1024px) 90vw, 30vw"
                className="h-32 w-auto object-contain mb-6"
              />

              <div className="font-condensed font-bold text-title1 leading-none tabular-nums text-accent">
                {p.reported.toLocaleString("en-US")}
              </div>
              <h3 className="text-headline font-semibold mt-2">{p.label}</h3>
              <p className="text-subhead text-secondary mt-1.5">{p.blurb}</p>

              {p.verified > 0 && (
                <p className="text-footnote text-tertiary-label mt-3">
                  {p.verified.toLocaleString("en-US")} confirmed against a receipt
                </p>
              )}

              {feed?.[p.id]?.length ? (
                <div className="mt-5 -mx-6">
                  <PriceTicker entries={feed[p.id]} />
                </div>
              ) : null}
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
npx tsc --noEmit && npm run lint
git add components/landing/price-ticker.tsx components/landing/category-cards.tsx app/globals.css
git commit -m "feat(landing): category cards with live price tickers"
```

---

### Task 5: Quick filters, and making /search read them

**Files:**
- Create: `components/landing/quick-filters.tsx`
- Modify: `app/search/page.tsx`
- Modify: `app/discover.tsx`

**Interfaces:**
- Consumes: `getMakes()` from `lib/services/taxonomy`.
- Produces: `<QuickFilters makes={Option[]} />`, and `Discover` gains an optional `initialFilters` prop.

**Note:** `/search` currently ignores `searchParams` entirely, so without this task the filter bar would navigate to a page that discards everything the visitor chose.

- [ ] **Step 1: Write the filter bar**

```tsx
// components/landing/quick-filters.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui";

type Option = { id: string; name: string };

/*
  The first thing on the page, and the only conversion that matters here.

  It deliberately does not render results. Everything it knows how to do is
  hand a query to /search, which keeps the map, the result list and their
  bundles off the landing page entirely.
*/
export function QuickFilters({ makes }: { makes: Option[] }) {
  const router = useRouter();
  const [makeId, setMakeId] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [modelId, setModelId] = useState("");

  useEffect(() => {
    if (!makeId) {
      setModels([]);
      setModelId("");
      return;
    }
    let alive = true;
    fetch(`/api/taxonomy?resource=models&makeId=${encodeURIComponent(makeId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((m) => alive && setModels(m))
      .catch(() => alive && setModels([]));
    return () => {
      alive = false;
    };
  }, [makeId]);

  const go = () => {
    const q = new URLSearchParams();
    if (makeId) q.set("makeId", makeId);
    if (modelId) q.set("modelId", modelId);
    router.push(`/search${q.size ? `?${q}` : ""}`);
  };

  const field =
    "min-h-11 rounded-control border border-separator bg-secondary-grouped px-3 text-subhead";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="mt-8 flex flex-col sm:flex-row gap-2 sm:items-center"
    >
      <label className="sr-only" htmlFor="qf-make">Make</label>
      <select
        id="qf-make"
        className={field}
        value={makeId}
        onChange={(e) => setMakeId(e.target.value)}
      >
        <option value="">Any make</option>
        {makes.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="qf-model">Model</label>
      <select
        id="qf-model"
        className={field}
        value={modelId}
        disabled={models.length === 0}
        onChange={(e) => setModelId(e.target.value)}
      >
        <option value="">Any model</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <button type="submit" className={`${buttonStyles.primary} px-7`}>
        See prices
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Confirm the taxonomy endpoint shape**

The route is `/api/taxonomy?resource=models&makeId=<id>` — the same one
`app/discover.tsx:329` uses. Verify the response is an array of `{ id, name }`
before relying on it:

```bash
curl -s "http://localhost:3000/api/taxonomy?resource=models&makeId=<a-real-make-id>" | head -c 300
```

- [ ] **Step 3: Let Discover accept initial filters**

In `app/discover.tsx`, add to the props type:

```ts
initialFilters?: { makeId?: string; modelId?: string; group?: string };
```

and seed the existing state from it:

```ts
const [makeId, setMakeId] = useState(initialFilters?.makeId ?? "");
const [modelId, setModelId] = useState(initialFilters?.modelId ?? "");
```

- [ ] **Step 4: Read the params on /search**

```tsx
// app/search/page.tsx
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : undefined;
  };
  const makes = await getMakes();
  const mapStyle = serverMapStyleUrl();
  return (
    <Discover
      makes={makes}
      initial={[]}
      mapStyle={mapStyle}
      initialFilters={{ makeId: one("makeId"), modelId: one("modelId"), group: one("group") }}
    />
  );
}
```

- [ ] **Step 5: Verify the round trip by hand**

Pick a make and model on `/`, submit, and confirm `/search` opens with those two already applied and results loading. Then load `/search?makeId=<id>` directly and confirm the same.

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit && npm run lint
git add components/landing/quick-filters.tsx app/search/page.tsx app/discover.tsx
git commit -m "feat(search): accept filters from the landing page via query params"
```

---

### Task 6: Assemble the page

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/landing/car-particles.tsx`
- Delete: `components/landing/scroll-story.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
// app/page.tsx
import Link from "next/link";
import { CountUp } from "@/components/landing/count-up";
import { CategoryCards } from "@/components/landing/category-cards";
import { QuickFilters } from "@/components/landing/quick-filters";
import { Reveal } from "@/components/landing/reveal";
import { buttonStyles } from "@/components/ui";
import { getCategoryProof, getProofNumbers, getRecentPrices } from "@/lib/services/stats";
import { getMakes } from "@/lib/services/taxonomy";

/*
  The landing page.

  It used to be a five-beat scroll story built around a car. That told a
  visitor what the site was about and then made them scroll to the bottom to
  do anything, which is the wrong shape for a page whose only job is to start
  a search. The argument now sits above the fold with the filter, and the
  proof — real counts, real prices — is what scrolling reveals.
*/
export const revalidate = 300;

export default async function HomePage() {
  const [stats, proof, feed, makes] = await Promise.all([
    getProofNumbers(),
    getCategoryProof(),
    getRecentPrices(),
    getMakes(),
  ]);

  const counts: [number, string][] = (
    [
      [stats?.experiences ?? 0, "Reported services"],
      [stats?.shops ?? 0, "Garages"],
      [stats?.generations ?? 0, "Vehicle generations"],
    ] as [number, string][]
  ).filter(([n]) => n > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
      {/*
        Left-aligned, not centred. A centred headline over a full-bleed
        background is the shape every generated landing page takes. There is
        no hero image on purpose: the filter is what this page is asking for,
        and an object above it would compete with it.
      */}
      <section className="pt-14 sm:pt-24 max-w-2xl">
        <h1 className="text-large-title sm:text-[3.25rem] sm:leading-[1.04] text-balance">
          Know what it should cost.
        </h1>
        <p className="text-body text-secondary mt-5 max-w-md text-balance">
          Prices reported by the owners who paid them, for your exact make,
          model and year. Not quotes.
        </p>
        <QuickFilters makes={makes} />
      </section>

      {/* The numbers get their own moment, on a rule rather than in a card. */}
      {counts.length > 0 && (
        <section className="mt-20 sm:mt-28 border-t border-separator pt-10">
          <dl className="grid gap-10 sm:grid-cols-3">
            {counts.map(([n, label]) => (
              <div key={label}>
                <dd className="font-condensed font-bold text-large-title leading-none tabular-nums">
                  <CountUp value={n} />
                </dd>
                <dt className="text-subhead text-secondary mt-2">{label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      {proof && <CategoryCards proof={proof} feed={feed} />}

      <Reveal>
        <section className="mt-20 sm:mt-28 rounded-card border border-separator bg-secondary-grouped p-8 sm:p-10">
          <h2 className="text-title2 text-balance">Add what you paid.</h2>
          <p className="text-body text-secondary mt-3 max-w-xl">
            Every price here came from an owner. Upload the receipt and yours
            is marked confirmed.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className={`${buttonStyles.primary} px-8`}>
              Get started
            </Link>
            <Link href="/search" className={buttonStyles.secondary}>
              Find shops near me
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
```

- [ ] **Step 2: Delete the scroll story**

```bash
grep -rn "scroll-story\|ScrollStory" app components | grep -v node_modules
# expect no hits, then:
git rm components/landing/scroll-story.tsx
```

- [ ] **Step 3: Delete the car, and drop in the supplied objects**

```bash
git rm components/landing/car-particles.tsx
git rm lib/landing/car-geometry.ts lib/landing/particle-car.ts
```

Then run the conversion in the imagery section above against the owner's three
cutouts. **Do not proceed past this step with placeholder art.** If the objects
have not arrived, build the cards with the image slot empty and say so, rather
than substituting stock photography that will be replaced.

- [ ] **Step 4: Remove the story CSS**

`app/globals.css` still carries `.story-sticky`, `.story-track` and `.story-scrim`, plus the `body:has(.story-track)` rules that light the header and footer. With the story gone these are dead and the `:has()` rules will silently stop applying. Delete them and confirm the header still reads correctly on `/`.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npx vitest run
git add -A
git commit -m "feat(landing): conversion-shaped page with filters and category proof"
```

---

### Task 7: Verification pass

- [ ] **Step 1: Motion audit**

With DevTools open on `/`:
- no `transition: all` anywhere in the new components
- reveals fire once and do not replay on scroll back
- ticker pauses on hover and when the tab is backgrounded
- under emulated `prefers-reduced-motion: reduce`: cards visible, no movement, ticker still

- [ ] **Step 2: Responsive check**

Screenshot `/` at 393×852, 768×1024, 1440×900 and 2560×1440. Confirm the filter bar stacks on phones, the cards go one-up, and nothing scrolls horizontally.

- [ ] **Step 3: Privacy check on the rendered HTML**

```bash
curl -s http://localhost:3000/ | grep -icE "userId|displayName|username|@|addressLine" 
```
Expected: no matches beyond legitimate page copy. The ticker must not have leaked identity into the cached HTML.

- [ ] **Step 4: Empty-state check**

Against a database with no experiences, confirm `/` renders: hero, filter bar, no category cards, no zero counts, and no crash.

- [ ] **Step 5: Full suite**

```bash
npx vitest run && npm run build && npm run security:check
```

---

## Self-Review

**Brief coverage:**
- "cards … mechanics, wrap shops, tuners" → Tasks 1, 4
- "scrolling animation" → Task 3 (reveal) and Task 4 (ticker)
- "user recorded information with validation" → Task 1 (verified counts), Task 4 (receipt line)
- "filters section so they get started" → Task 5
- "go for conversions" → Task 6 puts the filter above the fold and ends on a single CTA
- "not selling a product" → copy is evidence and counts, no pricing or plan language

**Placeholders:** none — every step carries the code it needs.

**Type consistency:** `CategoryGroupId` is defined once in Task 1 and imported by Tasks 2, 4 and 6. `CategoryProof` and `TickerEntry` are exported from `lib/services/stats.ts` and consumed under those exact names.

**Schema names verified against `prisma/schema.prisma`:** `MechanicExperience.serviceId`, `.totalPrice` (Float), `.verificationStatus`, `.createdAt`; `Service.category`; `Mechanic.city` / `.state`. The raw SQL in Task 1 Step 5 uses these exact names.

**Endpoint verified:** models load from `/api/taxonomy?resource=models&makeId=<id>`, matching `app/discover.tsx:329`.

**Known risk carried into execution:** `totalPrice` is a `Float`, so a price with cents will render as e.g. `$1,234.5`. If real data has decimals, round in `getRecentPrices` — decide when the data is in front of you rather than guessing now.

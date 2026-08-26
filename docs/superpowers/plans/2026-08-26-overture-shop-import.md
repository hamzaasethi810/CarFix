# Overture Shop Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the map with real independent repair shops from Overture Maps, so a search anywhere in Virginia (then the US) returns the small businesses OpenStreetMap never mapped.

**Architecture:** An operator-run pipeline, not a request path. DuckDB pulls Overture places for a bounding box straight from S3 into a local JSON file; a Node script normalises those records, drops duplicates of shops already stored, and bulk-upserts them keyed on `(source, sourceRef)`. Pure functions do the category mapping and normalisation so they can be tested without a database or a network.

**Tech Stack:** DuckDB CLI, TypeScript, Prisma 7, Vitest, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-08-26-gaari-globe-redesign-design.md` (Part 1)

## Global Constraints

- **Overture release path:** `s3://overturemaps-us-west-2/release/2026-08-19.0/theme=places/type=place/*`, region `us-west-2`.
- **Do not use `categories.primary`.** Overture deprecated `categories` in favour of `basic_category` + `taxonomy`, with removal scheduled for the **September 2026** release. Read `basic_category`.
- **Never invent a service.** A category that maps to no name in the `Service` table is skipped, exactly as `lib/services/osm-specialties.ts` does. Dev and production catalogues have already drifted once (dev carries a stray `Exhaust`; production does not), so the code must tolerate a name being absent.
- **Layering holds.** Prisma is reachable only from `lib/repositories/*`; scripts may construct their own client, as `scripts/admin.ts` already does.
- **All 206 existing tests must still pass.**
- Confidence floor: **0.5**. Overture scores 0–1; below half is more likely wrong than right.

---

### Task 1: Add OVERTURE to the source enum

`MechanicSource` is `SEED | OSM | USER`. Imported rows need their own source so they can be re-run, counted, and rolled back independently.

**Files:**
- Modify: `prisma/schema.prisma` (enum `MechanicSource`, ~line 88)
- Create: `prisma/migrations/20260826120000_overture_source/migration.sql`

- [ ] **Step 1: Add the value to the schema**

In `prisma/schema.prisma`:

```prisma
enum MechanicSource {
  SEED
  OSM
  USER
  /// Bulk-imported from Overture Maps places.
  OVERTURE
}
```

- [ ] **Step 2: Write the migration by hand**

Create `prisma/migrations/20260826120000_overture_source/migration.sql`:

```sql
-- Imported shops get their own source so a bad import can be identified and
-- removed without touching anything a person contributed.
ALTER TYPE "MechanicSource" ADD VALUE IF NOT EXISTS 'OVERTURE';
```

- [ ] **Step 3: Apply to dev and test, then regenerate**

```bash
set -a; source .env; set +a
psql "$MIGRATE_DATABASE_URL" -f prisma/migrations/20260826120000_overture_source/migration.sql
psql "$(echo "$MIGRATE_DATABASE_URL" | sed 's/carfix_dev/carfix_test/')" -f prisma/migrations/20260826120000_overture_source/migration.sql
npx prisma migrate resolve --applied 20260826120000_overture_source
npx prisma generate
```

Expected: `ALTER TYPE` on both, then `Generated Prisma Client`.

Note: `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block in older PostgreSQL. If psql reports that, run it with `--single-transaction` omitted (the command above already does).

- [ ] **Step 4: Verify the value exists**

```bash
psql "$DATABASE_URL" -t -A -c "SELECT unnest(enum_range(NULL::\"MechanicSource\"));"
```

Expected: `SEED`, `OSM`, `USER`, `OVERTURE`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260826120000_overture_source
git commit -m "Add OVERTURE to the mechanic source enum"
```

---

### Task 2: Map Overture categories to services

**Files:**
- Create: `lib/services/overture-categories.ts`
- Test: `tests/overture-categories.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `AUTOMOTIVE_CATEGORIES: readonly string[]` — every category treated as a workshop; used by the tests and available for narrowing the extract later, though Task 4 deliberately pulls the whole bounding box so the list can change without re-downloading
  - `servicesFromCategory(category: string): string[]` — service names, possibly empty
  - `isAutomotive(category: string): boolean`

- [ ] **Step 1: Write the failing test**

Create `tests/overture-categories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AUTOMOTIVE_CATEGORIES,
  isAutomotive,
  servicesFromCategory,
} from "../lib/services/overture-categories";

describe("which places are worth importing", () => {
  it("accepts repair and servicing trades", () => {
    for (const c of ["automotive_repair", "brake_service_and_repair", "tire_shop"]) {
      expect(isAutomotive(c)).toBe(true);
    }
  });

  it("rejects businesses that are not workshops", () => {
    // These are automotive but nobody gets work done at them.
    for (const c of ["automobile_registration_service", "vehicle_shipping", "towing_service"]) {
      expect(isAutomotive(c)).toBe(false);
    }
  });

  it("lists every accepted category for the extract", () => {
    expect(AUTOMOTIVE_CATEGORIES.length).toBeGreaterThan(20);
    expect(AUTOMOTIVE_CATEGORIES.every(isAutomotive)).toBe(true);
  });
});

describe("what a category says a shop does", () => {
  it("maps a brake shop to brake services", () => {
    expect(servicesFromCategory("brake_service_and_repair")).toContain("Brake pads");
  });

  it("maps a wrap shop to wrapping", () => {
    expect(servicesFromCategory("vehicle_wrap")).toContain("Full car wrap");
  });

  it("returns nothing for a category it does not know", () => {
    // Silence, not invention — an unknown category must never create a service.
    expect(servicesFromCategory("florist")).toEqual([]);
  });

  it("never returns a name that is not in the seeded catalogue", () => {
    // Guards against drift: every mapped name must exist in prisma/seed.ts.
    const seeded = new Set([
      "Air conditioning", "Alignment", "Battery", "Body work / dent repair",
      "Brake pads", "Brake pads + rotors", "Ceramic coating", "Clutch",
      "Detailing", "Diagnostic", "Dyno tuning", "ECU tune / flash",
      "Electrical diagnosis", "Engine rebuild", "Exhaust installation",
      "Full car wrap", "Oil change", "Other", "Paint correction",
      "Paint protection film (PPF)", "Respray", "Suspension", "Tires",
      "Transmission service", "Upholstery / retrim", "Wheel installation",
      "Window tint",
    ]);
    for (const c of AUTOMOTIVE_CATEGORIES) {
      for (const name of servicesFromCategory(c)) {
        expect(seeded.has(name), `${c} -> ${name}`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/overture-categories.test.ts
```

Expected: FAIL — `Cannot find module '../lib/services/overture-categories'`.

- [ ] **Step 3: Write the module**

Create `lib/services/overture-categories.ts`:

```ts
import "server-only";

/*
  Overture's place categories, narrowed to the trades this directory is about.

  Overture ships roughly 2,300 categories. Most automotive ones are not
  workshops — a registration service, a shipping broker and a tow truck are all
  filed under automotive, and none of them do work on your car. Importing them
  would fill the map with places nobody can get a price from.

  Read `basic_category`, not `categories.primary`: Overture deprecated the
  latter and removes it in the September 2026 release.
*/

/** Category -> the services a shop of that kind plausibly offers. */
const BY_CATEGORY: Record<string, string[]> = {
  automotive_repair: ["Diagnostic", "Oil change", "Brake pads"],
  engine_repair_service: ["Engine rebuild", "Diagnostic"],
  hybrid_car_repair: ["Diagnostic", "Battery"],
  transmission_repair: ["Transmission service"],
  brake_service_and_repair: ["Brake pads", "Brake pads + rotors"],
  oil_change_station: ["Oil change"],
  auto_electrical_repair: ["Electrical diagnosis", "Battery"],
  car_inspection: ["Diagnostic"],
  emissions_inspection: ["Diagnostic"],
  diy_auto_shop: ["Other"],
  truck_repair: ["Diagnostic"],
  trailer_repair: ["Other"],
  recreation_vehicle_repair: ["Diagnostic"],
  motorcycle_repair: ["Diagnostic"],
  motorsport_vehicle_repair: ["Dyno tuning", "Suspension"],

  tire_shop: ["Tires", "Alignment", "Wheel installation"],
  tire_dealer_and_repair: ["Tires", "Wheel installation"],
  tire_repair_shop: ["Tires"],
  wheel_and_rim_repair: ["Wheel installation"],
  automotive_wheel_polishing_service: ["Wheel installation"],

  auto_body_shop: ["Body work / dent repair", "Respray"],
  mobile_dent_repair: ["Body work / dent repair"],
  auto_glass_service: ["Other"],
  windshield_installation_and_repair: ["Other"],
  auto_restoration_services: ["Respray", "Upholstery / retrim"],

  auto_detailing: ["Detailing", "Paint correction", "Ceramic coating"],
  car_wash: ["Detailing"],

  auto_customization: ["ECU tune / flash", "Suspension"],
  vehicle_wrap: ["Full car wrap", "Paint protection film (PPF)"],
  car_window_tinting: ["Window tint"],
  exhaust_and_muffler_repair: ["Exhaust installation"],
  auto_upholstery: ["Upholstery / retrim"],
  car_stereo_installation: ["Other"],
  auto_security: ["Other"],
  automotive_parts_and_accessories: ["Other"],
};

export const AUTOMOTIVE_CATEGORIES = Object.freeze(Object.keys(BY_CATEGORY));

export const isAutomotive = (category: string) =>
  Object.prototype.hasOwnProperty.call(BY_CATEGORY, category);

/**
 * Service names implied by a category. Names, not ids — the caller resolves
 * them against the catalogue and ignores anything it does not recognise, so a
 * catalogue that has drifted cannot break an import.
 */
export function servicesFromCategory(category: string): string[] {
  const names = BY_CATEGORY[category] ?? [];
  // "Other" alone says nothing useful, so it goes if there is anything better.
  const set = new Set(names);
  if (set.size > 1) set.delete("Other");
  return [...set];
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/overture-categories.test.ts
```

Expected: PASS, all 7.

- [ ] **Step 5: Commit**

```bash
git add lib/services/overture-categories.ts tests/overture-categories.test.ts
git commit -m "Map Overture place categories to the service catalogue"
```

---

### Task 3: Normalise an Overture record into a shop row

**Files:**
- Create: `lib/services/overture-import.ts`
- Test: `tests/overture-import.test.ts`

**Interfaces:**
- Consumes: `servicesFromCategory`, `isAutomotive` from Task 2
- Produces:
  - `type OverturePlace` — the shape read out of the extract
  - `type NormalisedShop` — `{ name, address, city, state, country, zip, lat, lng, phone, website, sourceRef, services }`
  - `normalisePlace(place: OverturePlace, minConfidence?: number): NormalisedShop | null`

- [ ] **Step 1: Write the failing test**

Create `tests/overture-import.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalisePlace, type OverturePlace } from "../lib/services/overture-import";

const place = (over: Partial<OverturePlace> = {}): OverturePlace => ({
  id: "08f2ab...",
  name: "Redline Auto Service",
  basic_category: "automotive_repair",
  confidence: 0.91,
  lat: 38.8816,
  lng: -77.0910,
  freeform: "1145 Fern St",
  locality: "Arlington",
  region: "VA",
  postcode: "22202",
  country: "US",
  phone: "+1 703-555-0199",
  website: "https://redline.example",
  ...over,
});

describe("turning an Overture place into a shop", () => {
  it("keeps the fields the map needs", () => {
    const shop = normalisePlace(place());
    expect(shop).toMatchObject({
      name: "Redline Auto Service",
      address: "1145 Fern St",
      city: "Arlington",
      state: "VA",
      country: "US",
      zip: "22202",
      lat: 38.8816,
      lng: -77.091,
      sourceRef: "08f2ab...",
    });
  });

  it("attaches the services its category implies", () => {
    expect(normalisePlace(place())?.services).toContain("Diagnostic");
  });

  it("drops a place below the confidence floor", () => {
    // More likely wrong than right; importing it pollutes the map.
    expect(normalisePlace(place({ confidence: 0.3 }))).toBeNull();
  });

  it("drops a category that is not a workshop", () => {
    expect(normalisePlace(place({ basic_category: "towing_service" }))).toBeNull();
  });

  it("drops a place with no name", () => {
    // An unnamed shop cannot be presented or reviewed.
    expect(normalisePlace(place({ name: "" }))).toBeNull();
  });

  it("drops a place with no coordinates", () => {
    expect(normalisePlace(place({ lat: null as unknown as number }))).toBeNull();
  });

  it("survives missing optional fields", () => {
    const shop = normalisePlace(place({
      freeform: null, locality: null, postcode: null, phone: null, website: null,
    }));
    expect(shop).toMatchObject({ address: "", city: "", zip: "", phone: null, website: null });
  });

  it("refuses a website that is not http", () => {
    // A javascript: URL must never reach an anchor tag.
    expect(normalisePlace(place({ website: "javascript:alert(1)" }))?.website).toBeNull();
  });

  it("keeps state empty outside the United States", () => {
    const shop = normalisePlace(place({ country: "GB", region: "England" }));
    expect(shop?.state).toBe("");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/overture-import.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

Create `lib/services/overture-import.ts`:

```ts
import "server-only";
import { isAutomotive, servicesFromCategory } from "./overture-categories";

/*
  One Overture place, flattened.

  The extract query in scripts/overture-extract.sh already unnests Overture's
  nested structs, so this is the flat shape that arrives in the JSON file
  rather than the raw parquet schema.
*/
export type OverturePlace = {
  id: string;
  name: string | null;
  basic_category: string | null;
  confidence: number | null;
  lat: number | null;
  lng: number | null;
  freeform: string | null;   // street line
  locality: string | null;   // town
  region: string | null;     // state, where the country has them
  postcode: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
};

export type NormalisedShop = {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  sourceRef: string;
  services: string[];
};

/** Below this a record is more likely wrong than right. */
const MIN_CONFIDENCE = 0.5;

/** Only http(s) survives, so a record can never inject a javascript: URL. */
function safeUrl(raw: string | null): string | null {
  if (!raw) return null;
  const candidate = raw.trim();
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

/**
 * A shop row, or null if this place should not be imported.
 *
 * Returning null rather than throwing is deliberate: an import of 300,000
 * records will contain thousands that are unnamed, unplaced or not workshops,
 * and that is ordinary rather than exceptional.
 */
export function normalisePlace(
  place: OverturePlace,
  minConfidence: number = MIN_CONFIDENCE,
): NormalisedShop | null {
  const name = place.name?.trim();
  if (!name) return null;
  if (place.lat === null || place.lng === null) return null;
  if (place.confidence !== null && place.confidence < minConfidence) return null;

  const category = place.basic_category ?? "";
  if (!isAutomotive(category)) return null;

  const country = (place.country ?? "US").toUpperCase();

  return {
    name: name.slice(0, 200),
    address: place.freeform?.trim() ?? "",
    city: place.locality?.trim() ?? "",
    // "state" is a US concept here, matching how the rest of the app treats it.
    state: country === "US" ? (place.region?.trim() ?? "") : "",
    country,
    zip: place.postcode?.trim() ?? "",
    lat: place.lat,
    lng: place.lng,
    phone: place.phone?.trim() || null,
    website: safeUrl(place.website),
    sourceRef: place.id,
    services: servicesFromCategory(category),
  };
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/overture-import.test.ts
```

Expected: PASS, all 9.

- [ ] **Step 5: Commit**

```bash
git add lib/services/overture-import.ts tests/overture-import.test.ts
git commit -m "Normalise an Overture place into a shop row"
```

---

### Task 4: The extract script

Pulls places for a bounding box out of S3. No database, no application code — just DuckDB writing a JSON file.

**Files:**
- Create: `scripts/overture-extract.sh`
- Modify: `README.md` (add to the scripts table)

- [ ] **Step 1: Check DuckDB is available**

```bash
duckdb --version || brew install duckdb
```

Expected: a version string. If DuckDB is missing and Homebrew is unavailable, stop and report — the rest of this task cannot proceed.

- [ ] **Step 2: Write the script**

Create `scripts/overture-extract.sh`:

```bash
#!/usr/bin/env bash
# Pulls automotive places out of Overture Maps for a bounding box.
#
# Reads straight from Overture's public S3 bucket — no account, no key, no
# egress charge. The bbox columns are used for the filter because they are the
# indexed ones; filtering on geometry would read the whole planet.
#
#   ./scripts/overture-extract.sh <west> <south> <east> <north> <output.json>
#
# Virginia:
#   ./scripts/overture-extract.sh -83.7 36.5 -75.2 39.5 data/va-places.json
set -euo pipefail

WEST="${1:?west longitude}"
SOUTH="${2:?south latitude}"
EAST="${3:?east longitude}"
NORTH="${4:?north latitude}"
OUT="${5:?output path}"

# Pinned deliberately: a release change can move the schema, and an import
# should fail loudly rather than silently read different columns.
RELEASE="2026-08-19.0"

mkdir -p "$(dirname "$OUT")"

duckdb -c "
INSTALL spatial; LOAD spatial;
INSTALL httpfs; LOAD httpfs;
SET s3_region='us-west-2';

COPY (
  SELECT
    id,
    names.primary                       AS name,
    basic_category                      AS basic_category,
    confidence                          AS confidence,
    ST_Y(ST_GeomFromWKB(geometry))      AS lat,
    ST_X(ST_GeomFromWKB(geometry))      AS lng,
    addresses[1].freeform               AS freeform,
    addresses[1].locality               AS locality,
    addresses[1].region                 AS region,
    addresses[1].postcode               AS postcode,
    addresses[1].country                AS country,
    phones[1]                           AS phone,
    websites[1]                         AS website
  FROM read_parquet(
    's3://overturemaps-us-west-2/release/${RELEASE}/theme=places/type=place/*',
    filename=true, hive_partitioning=1
  )
  WHERE bbox.xmin BETWEEN ${WEST} AND ${EAST}
    AND bbox.ymin BETWEEN ${SOUTH} AND ${NORTH}
) TO '${OUT}' (FORMAT JSON, ARRAY false);
"

echo "wrote $(wc -l < "$OUT") records to $OUT"
```

- [ ] **Step 3: Make it executable and ignore the output**

```bash
chmod +x scripts/overture-extract.sh
grep -q '^data/$' .gitignore || printf '\n# Overture extracts — large, regenerable\ndata/\n' >> .gitignore
```

- [ ] **Step 4: Run it for Virginia**

```bash
./scripts/overture-extract.sh -83.7 36.5 -75.2 39.5 data/va-places.json
```

Expected: takes several minutes (it is reading a planet-scale parquet set over the network) and reports a record count. Every automotive category is filtered in the next task, not here — this pulls everything in the box so the category list can change without re-downloading.

If DuckDB errors on `basic_category` not existing, the pinned release predates that column: report it and stop rather than falling back to the deprecated `categories.primary`.

- [ ] **Step 5: Commit**

```bash
git add scripts/overture-extract.sh .gitignore
git commit -m "Add the Overture extract script"
```

---

### Task 5: The import script

**Files:**
- Create: `scripts/overture-import.ts`
- Modify: `package.json` (scripts)
- Test: `tests/overture-dedupe.test.ts`

**Interfaces:**
- Consumes: `normalisePlace`, `NormalisedShop` (Task 3); `looksLikeSameName` from `lib/services/shop-submissions.ts`
- Produces: `shouldSkipAsDuplicate(candidate, nearby): boolean`, exported from `lib/services/overture-import.ts`

- [ ] **Step 1: Write the failing dedupe test**

Create `tests/overture-dedupe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shouldSkipAsDuplicate } from "../lib/services/overture-import";

const near = (name: string, lat = 38.8816, lng = -77.091) => ({ name, lat, lng });

describe("not importing a shop that is already there", () => {
  it("skips the same business under the same name", () => {
    expect(shouldSkipAsDuplicate(
      { name: "Redline Auto Service", lat: 38.8816, lng: -77.091 },
      [near("Redline Auto Service")],
    )).toBe(true);
  });

  it("skips a spelling variant at the same spot", () => {
    expect(shouldSkipAsDuplicate(
      { name: "Apex Motorworks", lat: 38.8816, lng: -77.091 },
      [near("Apex Motor Works")],
    )).toBe(true);
  });

  it("keeps a different business at the same address", () => {
    // Two real shops share plazas; this is not a duplicate.
    expect(shouldSkipAsDuplicate(
      { name: "Tony's Tire Service", lat: 38.8816, lng: -77.091 },
      [near("Tony's Garage")],
    )).toBe(false);
  });

  it("keeps the same name far away", () => {
    // A chain has branches; a branch in another town is its own shop.
    expect(shouldSkipAsDuplicate(
      { name: "Redline Auto Service", lat: 38.8816, lng: -77.091 },
      [near("Redline Auto Service", 39.9, -75.1)],
    )).toBe(false);
  });

  it("keeps anything when nothing is nearby", () => {
    expect(shouldSkipAsDuplicate({ name: "Anything", lat: 1, lng: 1 }, [])).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/overture-dedupe.test.ts
```

Expected: FAIL — `shouldSkipAsDuplicate` is not exported.

- [ ] **Step 3: Add the function to `lib/services/overture-import.ts`**

Append:

```ts
import { looksLikeSameName } from "./shop-submissions";

/** About 250 metres — close enough that one business is not two. */
const SAME_PLACE_DEGREES = 0.0025;

type Located = { name: string; lat: number; lng: number };

/**
 * Whether this place is a shop already stored.
 *
 * Both halves must hold: a similar name AND effectively the same spot. Name
 * alone would collapse every branch of a chain into one; location alone would
 * collapse the three businesses that share a retail park.
 */
export function shouldSkipAsDuplicate(candidate: Located, nearby: Located[]): boolean {
  return nearby.some(
    (existing) =>
      Math.abs(existing.lat - candidate.lat) < SAME_PLACE_DEGREES &&
      Math.abs(existing.lng - candidate.lng) < SAME_PLACE_DEGREES &&
      looksLikeSameName(existing.name, candidate.name),
  );
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/overture-dedupe.test.ts
```

Expected: PASS, all 5.

- [ ] **Step 5: Write the import script**

Create `scripts/overture-import.ts`:

```ts
import "dotenv/config";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { normalisePlace, shouldSkipAsDuplicate, type OverturePlace } from "../lib/services/overture-import";

/*
  Loads an Overture extract into the shop table.

  Operator tooling, run from a shell against a database URL given on the
  command line. It is deliberately not reachable over HTTP: it writes hundreds
  of thousands of rows and re-running it against the wrong database would be
  tedious to undo.

  Idempotent. Rows are keyed on (source, sourceRef), so a second run of the
  same extract updates rather than duplicates.

    npx tsx scripts/overture-import.ts data/va-places.json [--dry-run]
*/

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const BATCH = 1000;

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error("Usage: npx tsx scripts/overture-import.ts <extract.json> [--dry-run]");
    process.exit(1);
  }
  const dryRun = flags.includes("--dry-run");

  // The service catalogue, once. Names that are not in it are skipped rather
  // than created — an import must never invent a service.
  const services = await prisma.service.findMany({ select: { id: true, name: true } });
  const serviceIdByName = new Map(services.map((s) => [s.name.toLowerCase(), s.id]));

  let read = 0, kept = 0, skippedLowQuality = 0, skippedDuplicate = 0, written = 0;
  let batch: ReturnType<typeof normalisePlace>[] = [];

  const flush = async () => {
    const rows = batch.filter((r): r is NonNullable<typeof r> => r !== null);
    batch = [];
    if (rows.length === 0) return;

    for (const row of rows) {
      // Only shops close enough to matter are candidates for a duplicate.
      const d = 0.0025;
      const nearby = await prisma.mechanic.findMany({
        where: {
          deletedAt: null,
          lat: { gte: row.lat - d, lte: row.lat + d },
          lng: { gte: row.lng - d, lte: row.lng + d },
        },
        select: { name: true, lat: true, lng: true, source: true, sourceRef: true },
      });

      // A previous run of this same extract is an update, not a duplicate.
      const alreadyMine = nearby.some(
        (n) => n.source === "OVERTURE" && n.sourceRef === row.sourceRef,
      );
      if (!alreadyMine && shouldSkipAsDuplicate(row, nearby)) {
        skippedDuplicate += 1;
        continue;
      }

      if (dryRun) { written += 1; continue; }

      const shop = await prisma.mechanic.upsert({
        where: { source_sourceRef: { source: "OVERTURE", sourceRef: row.sourceRef } },
        create: {
          name: row.name, address: row.address, city: row.city, state: row.state,
          country: row.country, zip: row.zip, lat: row.lat, lng: row.lng,
          phone: row.phone, website: row.website,
          source: "OVERTURE", sourceRef: row.sourceRef,
        },
        update: {
          name: row.name, address: row.address, city: row.city, state: row.state,
          country: row.country, zip: row.zip, lat: row.lat, lng: row.lng,
          phone: row.phone, website: row.website,
        },
        select: { id: true },
      });

      for (const name of row.services) {
        const serviceId = serviceIdByName.get(name.toLowerCase());
        if (!serviceId) continue;
        await prisma.mechanicSpecialty.upsert({
          where: { mechanicId_serviceId: { mechanicId: shop.id, serviceId } },
          create: { mechanicId: shop.id, serviceId },
          update: {},
        });
      }
      written += 1;
    }
  };

  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    read += 1;
    let place: OverturePlace;
    try { place = JSON.parse(line); } catch { continue; }

    const row = normalisePlace(place);
    if (!row) { skippedLowQuality += 1; continue; }
    kept += 1;
    batch.push(row);
    if (batch.length >= BATCH) await flush();
    if (read % 20000 === 0) console.log(`  read ${read.toLocaleString()}…`);
  }
  await flush();

  console.log(
    `\nread ${read.toLocaleString()} places\n` +
    `  ${skippedLowQuality.toLocaleString()} not workshops, unnamed, unplaced or low confidence\n` +
    `  ${skippedDuplicate.toLocaleString()} already listed\n` +
    `  ${written.toLocaleString()} ${dryRun ? "would be written" : "written"}\n` +
    `  (${kept.toLocaleString()} passed normalisation)`,
  );
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Add the npm script**

In `package.json`, inside `"scripts"`, after `"set-password"`:

```json
    "overture:import": "tsx scripts/overture-import.ts"
```

- [ ] **Step 7: Dry-run it against dev**

```bash
set -a; source .env; set +a
npx tsx scripts/overture-import.ts data/va-places.json --dry-run
```

Expected: a summary with a non-zero "would be written". If everything is skipped as "not workshops", the category list or `basic_category` is wrong — stop and check the extract's columns before changing the filter.

- [ ] **Step 8: Commit**

```bash
git add lib/services/overture-import.ts tests/overture-dedupe.test.ts scripts/overture-import.ts package.json
git commit -m "Import Overture places into the shop table"
```

---

### Task 6: Import Virginia and measure

The spec's open risk: the 565 bytes/shop estimate came from OSM rows, and Overture records carry more fields. This is where that is settled before committing to the country.

**Files:**
- Modify: `README.md` (document the pipeline)

- [ ] **Step 1: Record the size before**

```bash
set -a; source .env; set +a
psql "$DATABASE_URL" -c "SELECT count(*) AS shops, pg_size_pretty(pg_total_relation_size('\"Mechanic\"')) AS size FROM \"Mechanic\";"
```

- [ ] **Step 2: Run the real import**

```bash
npx tsx scripts/overture-import.ts data/va-places.json
```

- [ ] **Step 3: Measure the actual cost per shop**

```bash
psql "$DATABASE_URL" -c "
SELECT count(*) AS shops,
       pg_size_pretty(pg_total_relation_size('\"Mechanic\"')) AS total,
       round(pg_total_relation_size('\"Mechanic\"')::numeric / count(*)) AS bytes_per_shop
FROM \"Mechanic\";"
```

Record the number. Whole-US is roughly 300,000 shops; multiply and compare against Neon's 512 MB free tier. If the projection exceeds ~400 MB, import by state rather than nationally and say so in the README.

- [ ] **Step 4: Verify search still answers quickly**

```bash
psql "$DATABASE_URL" -c "
EXPLAIN (ANALYZE, TIMING)
SELECT m.id FROM \"Mechanic\" m
WHERE m.\"deletedAt\" IS NULL
  AND m.lat BETWEEN 38.59 AND 39.17
  AND m.lng BETWEEN -77.47 AND -76.73
LIMIT 500;"
```

Expected: a `Bitmap Index Scan on Mechanic_lat_lng_idx` and single-digit milliseconds. A sequential scan here means the planner has stopped trusting the index — run `ANALYZE "Mechanic";` and re-check before continuing.

- [ ] **Step 5: Check the imports look real**

```bash
psql "$DATABASE_URL" -c "
SELECT name, city, state FROM \"Mechanic\"
WHERE source = 'OVERTURE' ORDER BY random() LIMIT 15;"
```

Read them. If they are petrol stations, dealerships or car parks rather than workshops, the category list needs narrowing — go back to Task 2 rather than accepting the data.

- [ ] **Step 6: Run the full suite**

```bash
TEST_DATABASE_URL="$(grep -m1 TEST_DATABASE_URL .env | cut -d= -f2- | tr -d '"')" npm test
npx tsc --noEmit && npx eslint . && npm run build
```

Expected: all tests pass (206 existing + 21 new), no type or lint errors, clean build.

- [ ] **Step 7: Document the pipeline in the README**

Add under "Deploying free", before "Making an admin":

```markdown
### Importing shops

Shops come from Overture Maps, which carries the small independents
OpenStreetMap never mapped. Two steps, both run by an operator:

```bash
# 1. Pull an area out of Overture's public S3 bucket (needs duckdb)
./scripts/overture-extract.sh -83.7 36.5 -75.2 39.5 data/va-places.json

# 2. Load it, against whichever database you mean
DATABASE_URL=... npx tsx scripts/overture-import.ts data/va-places.json --dry-run
DATABASE_URL=... npx tsx scripts/overture-import.ts data/va-places.json
```

Idempotent: rows are keyed on `(source, sourceRef)`, so re-running an extract
updates rather than duplicates. A shop already listed from another source is
left alone — a similar name at effectively the same spot counts as the same
business.
```

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "Document the Overture import pipeline"
```

---

## Deferred to a later plan

- Importing the whole US (gated on Task 6's measurement)
- Re-import scheduling as Overture publishes monthly releases
- Backfilling `hours`, which Overture carries and this pipeline ignores

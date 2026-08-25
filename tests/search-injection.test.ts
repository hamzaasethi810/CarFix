import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { resetData } from "./helpers";
import { searchMechanics, type MechanicSort } from "../lib/repositories/mechanic";
import { mechanicSearchSchema } from "../lib/validation/schemas";

/*
  The shop search is the one place in the app that builds SQL by hand, and it
  was rewritten to scope the aggregate. Rewritten raw SQL is exactly where an
  injection gets reintroduced, so this fires payloads at every string that
  reaches the query and then checks the tables are still there.
*/

const PAYLOADS = [
  `'; DROP TABLE "Mechanic"; --`,
  `' OR '1'='1`,
  `'; DELETE FROM "MechanicExperience"; --`,
  `\\'; TRUNCATE "User" CASCADE; --`,
  `' UNION SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL --`,
  `%'; UPDATE "Mechanic" SET name='owned'; --`,
];

beforeEach(resetData);

describe("hostile input reaching the search", () => {
  it("treats a payload in serviceId as a value, not as SQL", async () => {
    const before = await prisma.mechanic.count();

    for (const payload of PAYLOADS) {
      // Must not throw a syntax error and must not execute anything.
      const rows = await searchMechanics({
        serviceId: payload, verifiedOnly: false, limit: 5, offset: 0,
      });
      expect(Array.isArray(rows)).toBe(true);
    }

    expect(await prisma.mechanic.count()).toBe(before);
    expect(await prisma.user.count()).toBeGreaterThanOrEqual(0);
  });

  it("treats a payload in every other id filter as a value", async () => {
    const before = await prisma.mechanic.count();

    for (const payload of PAYLOADS) {
      await searchMechanics({
        generationId: payload, platformId: payload, makeId: payload,
        modelId: payload, verifiedOnly: false, limit: 5, offset: 0,
      });
    }

    expect(await prisma.mechanic.count()).toBe(before);
  });

  it("cannot be steered by a forged sort", async () => {
    const before = await prisma.mechanic.count();

    /*
      sort picks between fixed ORDER BY fragments rather than being pasted into
      the query, so even a value that bypassed the schema cannot reach SQL.
    */
    const rows = await searchMechanics({
      verifiedOnly: false, limit: 5, offset: 0,
      sort: `price"; DROP TABLE "Mechanic"; --` as unknown as MechanicSort,
    });

    expect(Array.isArray(rows)).toBe(true);
    expect(await prisma.mechanic.count()).toBe(before);
  });

  it("rejects a sort the schema does not know before it gets that far", async () => {
    expect(() => mechanicSearchSchema.parse({ sort: "'; DROP TABLE x; --" })).toThrow();
    expect(() => mechanicSearchSchema.parse({ sort: "price" })).not.toThrow();
  });

  it("leaves the schema itself intact", async () => {
    // The tables the payloads named must all still exist.
    const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_name IN ('Mechanic','User','MechanicExperience')`,
    );
    expect(rows.map((r) => r.table_name).sort()).toEqual(
      ["Mechanic", "MechanicExperience", "User"],
    );
  });
});

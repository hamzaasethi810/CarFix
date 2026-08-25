import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { resetData } from "./helpers";
import { searchMechanics } from "../lib/repositories/mechanic";

/*
  The sorts have to be literal.

  "relevant" is allowed to weigh several things and to lift a subscribing shop,
  because that is what it says it does. The others are not: someone who asks
  for the cheapest first and is shown a paid placement has been misinformed
  about the data, which is the one thing this site cannot afford to do.
*/

const AUSTIN = { lat: 30.3356, lng: -97.7469 };

async function shop(name: string, opts: {
  lat?: number; lng?: number; subscribed?: boolean; price?: number;
} = {}) {
  const m = await prisma.mechanic.create({
    data: {
      name, address: "1 Test St", city: "Austin", state: "TX", country: "US", zip: "",
      lat: opts.lat ?? AUSTIN.lat, lng: opts.lng ?? AUSTIN.lng, source: "USER",
      ...(opts.subscribed ? { subscriptionStatus: "ACTIVE" as const } : {}),
    },
    select: { id: true },
  });
  if (opts.price !== undefined) {
    const service = await prisma.service.findFirstOrThrow();
    await prisma.shopServicePrice.create({
      data: { mechanicId: m.id, serviceId: service.id, minPrice: opts.price },
    });
  }
  return m.id;
}

const names = (rows: { name: string }[]) => rows.map((r) => r.name);

beforeEach(async () => {
  await resetData();
  await prisma.shopServicePrice.deleteMany();
  await prisma.mechanic.deleteMany({ where: { name: { startsWith: "Sort " } } });
});

describe("sorting by price", () => {
  it("puts the cheapest first", async () => {
    await shop("Sort Dear", { price: 400 });
    await shop("Sort Cheap", { price: 90 });
    await shop("Sort Middle", { price: 200 });

    const rows = await searchMechanics({
      ...AUSTIN, radiusMiles: 5, verifiedOnly: false,
      sort: "price", limit: 10, offset: 0,
    });
    expect(names(rows).slice(0, 3)).toEqual(["Sort Cheap", "Sort Middle", "Sort Dear"]);
  });

  it("does not treat a shop with no price as free", async () => {
    await shop("Sort Silent");
    await shop("Sort Priced", { price: 500 });

    const rows = await searchMechanics({
      ...AUSTIN, radiusMiles: 5, verifiedOnly: false,
      sort: "price", limit: 10, offset: 0,
    });
    // A missing price is unknown, not zero.
    expect(names(rows).indexOf("Sort Priced")).toBeLessThan(names(rows).indexOf("Sort Silent"));
  });

  it("does not lift a subscribing shop above a cheaper one", async () => {
    await shop("Sort Gold", { price: 900, subscribed: true });
    await shop("Sort Plain", { price: 100 });

    const rows = await searchMechanics({
      ...AUSTIN, radiusMiles: 5, verifiedOnly: false,
      sort: "price", limit: 10, offset: 0,
    });
    expect(names(rows)[0]).toBe("Sort Plain");
  });
});

describe("sorting by distance", () => {
  it("puts the nearest first regardless of subscription", async () => {
    await shop("Sort Far", { lat: AUSTIN.lat + 0.1, subscribed: true });
    await shop("Sort Near");

    const rows = await searchMechanics({
      ...AUSTIN, radiusMiles: 30, verifiedOnly: false,
      sort: "distance", limit: 10, offset: 0,
    });
    expect(names(rows)[0]).toBe("Sort Near");
  });
});

describe("relevance", () => {
  it("does lift a subscribing shop, because that is what it claims to do", async () => {
    await shop("Sort Plain2");
    await shop("Sort Gold2", { subscribed: true });

    const rows = await searchMechanics({
      ...AUSTIN, radiusMiles: 5, verifiedOnly: false,
      sort: "relevant", limit: 10, offset: 0,
    });
    expect(names(rows)[0]).toBe("Sort Gold2");
  });
});

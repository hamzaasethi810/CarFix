import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { getMyClaims } from "../lib/services/shops";
import { makeUser, resetData } from "./helpers";

/*
  getMyClaims backs the Shops settings page's list of claims. The property that
  matters most here is isolation: it must only ever return the caller's own
  claims (the query is scoped by userId), never another person's — otherwise
  the page would leak who is trying to claim which shop. It must also hide
  APPROVED claims, which surface instead as shops you manage, and keep PENDING
  and REJECTED, which are the states worth showing.
*/
async function makeShop(name: string) {
  return prisma.mechanic.create({
    data: {
      name,
      address: "1 Shop Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
      lat: 30.27,
      lng: -97.74,
      source: "USER",
    },
    select: { id: true },
  });
}

async function makeClaim(userId: string, mechanicId: string, status: "PENDING" | "APPROVED" | "REJECTED") {
  return prisma.shopClaim.create({
    data: { userId, mechanicId, status, businessName: "Test Business" },
    select: { id: true },
  });
}

describe("getMyClaims", () => {
  beforeEach(resetData);

  it("returns only the caller's own claims, never another user's", async () => {
    const me = await makeUser();
    const other = await makeUser();
    const mine = await makeShop("Mine Motors");
    const theirs = await makeShop("Their Motors");

    await makeClaim(me.id, mine.id, "PENDING");
    await makeClaim(other.id, theirs.id, "PENDING");

    const claims = await getMyClaims(me.id);
    expect(claims).toHaveLength(1);
    expect(claims[0].shop.name).toBe("Mine Motors");
  });

  it("hides APPROVED claims but keeps PENDING and REJECTED", async () => {
    const me = await makeUser();
    const a = await makeShop("Approved Motors");
    const p = await makeShop("Pending Motors");
    const r = await makeShop("Rejected Motors");
    await makeClaim(me.id, a.id, "APPROVED");
    await makeClaim(me.id, p.id, "PENDING");
    await makeClaim(me.id, r.id, "REJECTED");

    const statuses = (await getMyClaims(me.id)).map((c) => c.status).sort();
    expect(statuses).toEqual(["PENDING", "REJECTED"]);
  });

  it("returns nothing for a user with no claims", async () => {
    const me = await makeUser();
    expect(await getMyClaims(me.id)).toEqual([]);
  });
});

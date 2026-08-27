import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { AppError } from "../lib/errors";
import { addVehicle } from "../lib/services/vehicles";
import { submitExperience } from "../lib/services/experiences";
import { getReply, replyToExperience } from "../lib/services/engagement";
import { shopReplySchema } from "../lib/validation/schemas";
import { fixtures, makeUser, resetData, validExperience } from "./helpers";

/*
  This exercises the shop-reply feature that already existed in
  lib/services/engagement.ts before this task, backed by the ShopReply model.
  A separate, newly-written write path (lib/services/shop-replies.ts,
  lib/repositories/shop-reply.ts, and a POST handler on this route) was built
  first and then removed: it checked shop ownership but not subscription
  status, so it would have let a claimed-but-unsubscribed shop reply for
  free, bypassing the paywall the existing PUT path enforces. The existing
  path is strictly more correct, so it is the one kept and moderated here,
  rather than replaced.
*/

const codeOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return "NO_ERROR";
  } catch (e) {
    return e instanceof AppError ? e.code : "UNEXPECTED";
  }
};

/** A shop, optionally claimed and/or subscribed. Never reused across tests. */
async function makeShop(opts: { ownerId?: string; subscriptionStatus?: "NONE" | "ACTIVE" } = {}) {
  return prisma.mechanic.create({
    data: {
      name: "Claimed Motors",
      address: "1 Shop Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
      lat: 30.27,
      lng: -97.74,
      source: "USER",
      ...(opts.ownerId ? { claimedById: opts.ownerId } : {}),
      subscriptionStatus: opts.subscriptionStatus ?? "NONE",
    },
    select: { id: true },
  });
}

describe("shop replies", () => {
  let fx: Awaited<ReturnType<typeof fixtures>>;

  beforeEach(async () => {
    await resetData();
    fx = await fixtures();
  });

  async function makeReport(shopId: string, reporterId: string) {
    const vehicle = await addVehicle(reporterId, {
      makeId: fx.make.id,
      modelId: fx.model.id,
      year: 2025,
    });
    const experience = await submitExperience(reporterId, {
      ...validExperience(),
      vehicleId: vehicle.id,
      mechanicId: shopId,
      serviceId: fx.service.id,
    } as Parameters<typeof submitExperience>[1]);
    return experience.id;
  }

  it("lets the shop's claimant reply to a report about their shop", async () => {
    const owner = await makeUser();
    const reporter = await makeUser();
    const shop = await makeShop({ ownerId: owner.id, subscriptionStatus: "ACTIVE" });
    const experienceId = await makeReport(shop.id, reporter.id);

    const reply = await replyToExperience(experienceId, owner.id, "We stand by this repair.");
    expect(reply?.body).toBe("We stand by this repair.");

    const fetched = await getReply(experienceId);
    expect(fetched?.body).toBe("We stand by this repair.");
  });

  it("refuses someone who does not own the shop", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const reporter = await makeUser();
    const shop = await makeShop({ ownerId: owner.id, subscriptionStatus: "ACTIVE" });
    const experienceId = await makeReport(shop.id, reporter.id);

    expect(
      await codeOf(() => replyToExperience(experienceId, stranger.id, "Not us.")),
    ).toBe("FORBIDDEN");

    // And the reply table stays empty: the wrong account never got to write.
    expect(await prisma.shopReply.count({ where: { experienceId } })).toBe(0);
  });

  it("refuses an owner whose shop has no active subscription", async () => {
    const owner = await makeUser();
    const reporter = await makeUser();
    // subscriptionStatus defaults to "NONE" — claimed, but not paying.
    const shop = await makeShop({ ownerId: owner.id });
    const experienceId = await makeReport(shop.id, reporter.id);

    expect(
      await codeOf(() => replyToExperience(experienceId, owner.id, "We stand by this repair.")),
    ).toBe("CONFLICT");

    expect(await prisma.shopReply.count({ where: { experienceId } })).toBe(0);
  });

  it("updates the existing reply in place on a second call, rather than duplicating it", async () => {
    const owner = await makeUser();
    const reporter = await makeUser();
    const shop = await makeShop({ ownerId: owner.id, subscriptionStatus: "ACTIVE" });
    const experienceId = await makeReport(shop.id, reporter.id);

    await replyToExperience(experienceId, owner.id, "First reply.");
    await replyToExperience(experienceId, owner.id, "Revised reply.");

    expect(await prisma.shopReply.count({ where: { experienceId } })).toBe(1);
    const fetched = await getReply(experienceId);
    expect(fetched?.body).toBe("Revised reply.");
  });

  it("stores a reply containing profanity masked", async () => {
    const owner = await makeUser();
    const reporter = await makeUser();
    const shop = await makeShop({ ownerId: owner.id, subscriptionStatus: "ACTIVE" });
    const experienceId = await makeReport(shop.id, reporter.id);

    const { body } = shopReplySchema.parse({ body: "that was a shit review" });
    const reply = await replyToExperience(experienceId, owner.id, body);
    expect(reply?.body).toBe("that was a s*** review");
  });

  it("refuses a reply containing a link", () => {
    const r = shopReplySchema.safeParse({ body: "see https://spam.example.com" });
    expect(r.success).toBe(false);
  });

  it("gets NOT_FOUND replying to a report that does not exist", async () => {
    const owner = await makeUser();
    expect(
      await codeOf(() => replyToExperience("does-not-exist", owner.id, "Hello there")),
    ).toBe("NOT_FOUND");
  });
});

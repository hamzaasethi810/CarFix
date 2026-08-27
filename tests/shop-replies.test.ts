import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { AppError } from "../lib/errors";
import { addVehicle } from "../lib/services/vehicles";
import { submitExperience } from "../lib/services/experiences";
import { getReply, postReply } from "../lib/services/shop-replies";
import { shopReplySchema } from "../lib/validation/schemas";
import { fixtures, makeUser, resetData, validExperience } from "./helpers";

const codeOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return "NO_ERROR";
  } catch (e) {
    return e instanceof AppError ? e.code : "UNEXPECTED";
  }
};

/** A shop, optionally claimed by the given user. Never reused across tests. */
async function makeShop(ownerId?: string) {
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
      ...(ownerId ? { claimedById: ownerId } : {}),
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
    const shop = await makeShop(owner.id);
    const experienceId = await makeReport(shop.id, reporter.id);

    const reply = await postReply({
      experienceId,
      userId: owner.id,
      body: "We stand by this repair.",
    });
    expect(reply.body).toBe("We stand by this repair.");

    const fetched = await getReply(experienceId);
    expect(fetched?.body).toBe("We stand by this repair.");
  });

  it("refuses someone who does not own the shop", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const reporter = await makeUser();
    const shop = await makeShop(owner.id);
    const experienceId = await makeReport(shop.id, reporter.id);

    expect(
      await codeOf(() => postReply({ experienceId, userId: stranger.id, body: "Not us." })),
    ).toBe("FORBIDDEN");

    // And the reply table stays empty: the wrong account never got to write.
    expect(await prisma.shopReply.count({ where: { experienceId } })).toBe(0);
  });

  it("gets CONFLICT on a second reply, without a duplicate row", async () => {
    const owner = await makeUser();
    const reporter = await makeUser();
    const shop = await makeShop(owner.id);
    const experienceId = await makeReport(shop.id, reporter.id);

    await postReply({ experienceId, userId: owner.id, body: "First reply." });
    expect(
      await codeOf(() => postReply({ experienceId, userId: owner.id, body: "Second reply." })),
    ).toBe("CONFLICT");

    expect(await prisma.shopReply.count({ where: { experienceId } })).toBe(1);
  });

  it("stores a reply containing profanity masked", async () => {
    const owner = await makeUser();
    const reporter = await makeUser();
    const shop = await makeShop(owner.id);
    const experienceId = await makeReport(shop.id, reporter.id);

    const { body } = shopReplySchema.parse({ body: "that was a shit review" });
    const reply = await postReply({ experienceId, userId: owner.id, body });
    expect(reply.body).toBe("that was a s*** review");
  });

  it("refuses a reply containing a link", () => {
    const r = shopReplySchema.safeParse({ body: "see https://spam.example.com" });
    expect(r.success).toBe(false);
  });

  it("gets NOT_FOUND replying to a report that does not exist", async () => {
    const owner = await makeUser();
    expect(
      await codeOf(() =>
        postReply({ experienceId: "does-not-exist", userId: owner.id, body: "Hello" }),
      ),
    ).toBe("NOT_FOUND");
  });
});

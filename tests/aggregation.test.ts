import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { addVehicle } from "../lib/services/vehicles";
import { getPricing, submitExperience, decideReceiptVerification, uploadReceipt } from "../lib/services/experiences";
import { search } from "../lib/services/mechanics";
import { fixtures, makeUser, resetData, validExperience, fakeFile, PNG_BYTES } from "./helpers";

describe("pricing and generation aggregation", () => {
  let fx: Awaited<ReturnType<typeof fixtures>>;
  let g80Id: string;

  beforeAll(async () => {
    await resetData();
    fx = await fixtures();

    // Three owners of different G80 model years plus one F80, so generation
    // aggregation can be distinguished from make/model aggregation.
    const prices = [800, 1000, 1200];
    for (const [i, price] of prices.entries()) {
      const owner = await makeUser();
      const vehicle = await addVehicle(owner.id, {
        makeId: fx.make.id,
        modelId: fx.model.id,
        year: 2022 + i,
      });
      g80Id = vehicle.generationId;
      await submitExperience(owner.id, {
        ...validExperience({ totalPrice: price }),
        vehicleId: vehicle.id,
        mechanicId: fx.mechanic.id,
        serviceId: fx.service.id,
      } as Parameters<typeof submitExperience>[1]);
    }

    const f80Owner = await makeUser();
    const f80 = await addVehicle(f80Owner.id, {
      makeId: fx.make.id,
      modelId: fx.model.id,
      year: 2016,
    });
    await submitExperience(f80Owner.id, {
      ...validExperience({ totalPrice: 99_000 }),
      vehicleId: f80.id,
      mechanicId: fx.mechanic.id,
      serviceId: fx.service.id,
    } as Parameters<typeof submitExperience>[1]);
  });

  it("derives the generation from the model year rather than trusting the client", async () => {
    const gen = await prisma.generation.findUniqueOrThrow({
      where: { id: g80Id },
      select: { code: true },
    });
    expect(gen.code).toBe("G80");
  });

  it("aggregates at generation level without mixing in other generations", async () => {
    const stats = await getPricing({ generationId: g80Id });
    expect(stats.count).toBe(3);
    expect(stats.median).toBe(1000);
    expect(stats.min).toBe(800);
    expect(stats.max).toBe(1200);
  });

  it("reports the sample size instead of implying a quote", async () => {
    const stats = await getPricing({ generationId: g80Id });
    expect(stats.label).toBe("Based on 3 reported experiences");
  });

  it("uses singular wording for a lone data point", async () => {
    const owner = await makeUser();
    const solo = await prisma.model.findFirstOrThrow({ where: { name: "WRX" } });
    const make = await prisma.make.findFirstOrThrow({ where: { name: "Subaru" } });
    const vehicle = await addVehicle(owner.id, { makeId: make.id, modelId: solo.id, year: 2023 });
    await submitExperience(owner.id, {
      ...validExperience({ totalPrice: 500 }),
      vehicleId: vehicle.id,
      mechanicId: fx.mechanic.id,
      serviceId: fx.service.id,
    } as Parameters<typeof submitExperience>[1]);

    const stats = await getPricing({ generationId: vehicle.generationId });
    expect(stats.label).toBe("1 reported experience");
  });

  it("says so plainly when there is no data at all", async () => {
    const stats = await getPricing({ generationId: "does-not-exist" });
    expect(stats.count).toBe(0);
    expect(stats.label).toBe("No reported experiences yet");
  });

  it("counts verified experiences separately from the total", async () => {
    const before = await getPricing({ generationId: g80Id });
    expect(before.verifiedCount).toBe(0);

    const target = await prisma.mechanicExperience.findFirstOrThrow({
      where: { vehicle: { generationId: g80Id } },
      select: { id: true, userId: true },
    });
    const admin = await makeUser("ADMIN");
    await uploadReceipt(target.id, target.userId, fakeFile(PNG_BYTES));
    await decideReceiptVerification({
      experienceId: target.id,
      adminId: admin.id,
      decision: "VERIFIED",
    });

    const after = await getPricing({ generationId: g80Id });
    expect(after.verifiedCount).toBe(1);
    expect(after.count).toBe(3);
  });

  it("filters search server-side to verified experiences only", async () => {
    const verified = await search({
      serviceId: fx.service.id,
      verifiedOnly: true,
      limit: 20,
      offset: 0,
    });
    expect(verified.items[0]?.verifiedCount).toBe(1);
    expect(verified.items[0]?.experienceCount).toBe(1);
  });
});

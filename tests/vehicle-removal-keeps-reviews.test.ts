import { beforeEach, describe, expect, it } from "vitest";
import { addVehicle, removeVehicle } from "../lib/services/vehicles";
import { submitExperience, browseExperiences, getPricing } from "../lib/services/experiences";
import { fixtures, makeUser, resetData, validExperience } from "./helpers";

/*
  Removing a car from a garage must not remove the reviews written about it.

  A logged service is a review of a shop and a data point in that generation's
  prices — value that belongs to the community, not only to the owner's garage.
  Removal is a soft delete of the Vehicle alone; the experiences keep their own
  deletedAt: null and stay in every aggregation that filters on the experience
  rather than on its car (pricingStats, listExperiences). This pins that: a
  shop's reported price and its review list survive the car being removed.
*/
describe("removing a car keeps its reviews", () => {
  beforeEach(resetData);

  it("keeps the review on the shop and in the generation's prices after removal", async () => {
    const fx = await fixtures();
    const owner = await makeUser();

    const car = await addVehicle(owner.id, {
      makeId: fx.make.id,
      modelId: fx.model.id,
      year: 2025,
    });

    await submitExperience(owner.id, {
      ...validExperience(),
      vehicleId: car.id,
      mechanicId: fx.mechanic.id,
      serviceId: fx.service.id,
    } as Parameters<typeof submitExperience>[1]);

    // Before removal: the shop has one reported price and one visible review.
    const shopPriceBefore = await getPricing({ mechanicId: fx.mechanic.id });
    const genPriceBefore = await getPricing({ generationId: car.generationId });
    const shopReviewsBefore = await browseExperiences({ mechanicId: fx.mechanic.id, limit: 20, offset: 0 });
    expect(shopPriceBefore.count).toBe(1);
    expect(genPriceBefore.count).toBe(1);
    expect(shopReviewsBefore.items).toHaveLength(1);

    await removeVehicle(car.id, owner.id);

    // After removal: the review and the price are still there — the car left
    // the garage, its contribution to the community did not.
    const shopPriceAfter = await getPricing({ mechanicId: fx.mechanic.id });
    const genPriceAfter = await getPricing({ generationId: car.generationId });
    const shopReviewsAfter = await browseExperiences({ mechanicId: fx.mechanic.id, limit: 20, offset: 0 });
    expect(shopPriceAfter.count).toBe(1);
    expect(genPriceAfter.count).toBe(1);
    expect(shopReviewsAfter.items).toHaveLength(1);
  });
});

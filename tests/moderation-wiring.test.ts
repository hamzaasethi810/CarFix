import { describe, expect, it } from "vitest";
import { createExperienceSchema } from "../lib/validation/schemas";

const base = {
  // `id` in the schema is just a bounded string, so these need not be real cuids.
  vehicleId: "c000000000000000000000000",
  mechanicId: "c000000000000000000000001",
  serviceId: "c000000000000000000000002",
  totalPrice: 100,
  serviceDate: "2026-01-01",
  mileageAtService: 1000,
  overallRating: 4, qualityRating: 4, priceRating: 4,
  communicationRating: 4, turnaroundRating: 4, knowledgeRating: 4,
  wouldRecommend: true, wouldReturn: true,
};

describe("review text is moderated by the schema", () => {
  it("masks profanity in place", () => {
    const parsed = createExperienceSchema.parse({ ...base, reviewText: "a shit job" });
    expect(parsed.reviewText).toBe("a s*** job");
  });

  it("refuses a link", () => {
    const r = createExperienceSchema.safeParse({
      ...base, reviewText: "see https://spam.example.com",
    });
    expect(r.success).toBe(false);
  });

  it("leaves a clean review untouched", () => {
    const parsed = createExperienceSchema.parse({ ...base, reviewText: "Great work." });
    expect(parsed.reviewText).toBe("Great work.");
  });

  it("still accepts no review at all", () => {
    expect(createExperienceSchema.parse({ ...base }).reviewText).toBeUndefined();
  });
});

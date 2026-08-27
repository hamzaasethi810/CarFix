import { describe, expect, it } from "vitest";
import {
  createExperienceSchema,
  createVehicleSchema,
  registerSchema,
  updateProfileSchema,
  updateVehicleSchema,
} from "../lib/validation/schemas";

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

const registerBase = {
  email: "person@example.com",
  password: "supersecretpassword",
  username: "person1",
};

describe("registration display name is moderated by the schema", () => {
  it("masks profanity in place", () => {
    const parsed = registerSchema.parse({ ...registerBase, displayName: "shit mechanic" });
    expect(parsed.displayName).toBe("s*** mechanic");
  });

  it("refuses a slur", () => {
    const r = registerSchema.safeParse({ ...registerBase, displayName: "faggot" });
    expect(r.success).toBe(false);
  });

  it("leaves a clean display name untouched", () => {
    const parsed = registerSchema.parse({ ...registerBase, displayName: "Dana" });
    expect(parsed.displayName).toBe("Dana");
  });

  it("still requires a non-empty display name", () => {
    const r = registerSchema.safeParse({ ...registerBase, displayName: "" });
    expect(r.success).toBe(false);
  });
});

describe("profile fields are moderated by the schema", () => {
  it("masks profanity in the display name", () => {
    const parsed = updateProfileSchema.parse({ displayName: "shit mechanic" });
    expect(parsed.displayName).toBe("s*** mechanic");
  });

  it("masks profanity in the bio", () => {
    const parsed = updateProfileSchema.parse({ bio: "does shit work" });
    expect(parsed.bio).toBe("does s*** work");
  });

  it("masks profanity in the general location", () => {
    const parsed = updateProfileSchema.parse({ generalLocation: "Shitsville" });
    expect(parsed.generalLocation).toBe("S***sville");
  });

  it("refuses a link in the bio", () => {
    const r = updateProfileSchema.safeParse({ bio: "see https://spam.example.com" });
    expect(r.success).toBe(false);
  });

  it("still accepts no profile fields at all", () => {
    const parsed = updateProfileSchema.parse({});
    expect(parsed.displayName).toBeUndefined();
    expect(parsed.bio).toBeUndefined();
    expect(parsed.generalLocation).toBeUndefined();
  });
});

const vehicleBase = {
  makeId: "c000000000000000000000003",
  modelId: "c000000000000000000000004",
  year: 2020,
};

describe("vehicle nickname is moderated by the schema", () => {
  it("masks profanity in place on create", () => {
    const parsed = createVehicleSchema.parse({ ...vehicleBase, nickname: "shit box" });
    expect(parsed.nickname).toBe("s*** box");
  });

  it("refuses a slur on create", () => {
    const r = createVehicleSchema.safeParse({ ...vehicleBase, nickname: "faggot wagon" });
    expect(r.success).toBe(false);
  });

  it("still accepts no nickname at all on create", () => {
    expect(createVehicleSchema.parse({ ...vehicleBase }).nickname).toBeUndefined();
  });

  it("masks profanity in place on update, and stays optional", () => {
    const parsed = updateVehicleSchema.parse({ nickname: "shit box" });
    expect(parsed.nickname).toBe("s*** box");
    expect(updateVehicleSchema.parse({}).nickname).toBeUndefined();
  });

  it("refuses a slur on update", () => {
    const r = updateVehicleSchema.safeParse({ nickname: "faggot wagon" });
    expect(r.success).toBe(false);
  });
});

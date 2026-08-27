import { describe, expect, it } from "vitest";
import { toErrorResponse } from "../lib/api/handler";
import {
  createExperienceSchema,
  createVehicleSchema,
  registerSchema,
  shopPriceSchema,
  shopReplySchema,
  submitShopSchema,
  updateProfileSchema,
  updateShopLocationSchema,
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

describe("registration display name is a moderated label: rejects rather than masks", () => {
  it("refuses profanity outright, rather than masking it", () => {
    const r = registerSchema.safeParse({ ...registerBase, displayName: "shit mechanic" });
    expect(r.success).toBe(false);
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

  it("still requires a non-empty display name for whitespace-only input", () => {
    // `.min()` used to run on the raw string, before screenText's transform
    // trimmed it — so a whitespace-only name passed the minimum-length check
    // and was stored as "". `.trim()` now runs before `.min()`.
    const r = updateProfileSchema.safeParse({ displayName: " " });
    expect(r.success).toBe(false);
  });
});

describe("moderatedText also enforces its minimum on whitespace-only input", () => {
  it("refuses a whitespace-only shop reply", () => {
    // Same bug, prose side: shopReplySchema's `body` has a minimum of 2.
    const r = shopReplySchema.safeParse({ body: "  " });
    expect(r.success).toBe(false);
  });
});

describe("profile fields are moderated by the schema", () => {
  it("refuses profanity in the display name, rather than masking it", () => {
    const r = updateProfileSchema.safeParse({ displayName: "shit mechanic" });
    expect(r.success).toBe(false);
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

describe("vehicle nickname is a moderated label: rejects rather than masks", () => {
  it("refuses profanity outright on create, rather than masking it", () => {
    const r = createVehicleSchema.safeParse({ ...vehicleBase, nickname: "shit box" });
    expect(r.success).toBe(false);
  });

  it("refuses a slur on create", () => {
    const r = createVehicleSchema.safeParse({ ...vehicleBase, nickname: "faggot wagon" });
    expect(r.success).toBe(false);
  });

  it("leaves a clean nickname untouched on create", () => {
    const parsed = createVehicleSchema.parse({ ...vehicleBase, nickname: "The Beast" });
    expect(parsed.nickname).toBe("The Beast");
  });

  it("still accepts no nickname at all on create", () => {
    expect(createVehicleSchema.parse({ ...vehicleBase }).nickname).toBeUndefined();
  });

  it("refuses profanity outright on update, and stays optional when absent", () => {
    const r = updateVehicleSchema.safeParse({ nickname: "shit box" });
    expect(r.success).toBe(false);
    expect(updateVehicleSchema.parse({}).nickname).toBeUndefined();
  });

  it("refuses a slur on update", () => {
    const r = updateVehicleSchema.safeParse({ nickname: "faggot wagon" });
    expect(r.success).toBe(false);
  });
});

describe("moderatedLabel rejection message names no term and tells the person to choose again", () => {
  it("uses the same generic message whether profanity was merely masked-worthy or an outright slur", () => {
    const maskWorthy = registerSchema.safeParse({ ...registerBase, displayName: "shit mechanic" });
    const outright = registerSchema.safeParse({ ...registerBase, displayName: "faggot" });
    expect(maskWorthy.success).toBe(false);
    expect(outright.success).toBe(false);
    if (!maskWorthy.success) {
      expect(maskWorthy.error.issues[0].message).toBe(
        "This can't be used as written. Please choose a different one.",
      );
      expect(maskWorthy.error.issues[0].message).not.toContain("shit");
    }
  });
});

describe("a single validation issue surfaces its own message; several fall back to the generic one", () => {
  it("puts the specific reason at the top level for registration with a profane display name", async () => {
    const result = registerSchema.safeParse({ ...registerBase, displayName: "shit mechanic" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const body = await toErrorResponse(result.error).json();
    expect(body.error.message).toBe("This can't be used as written. Please choose a different one.");
    // details still carries the per-field breakdown for any form that wants it.
    expect(body.error.details).toEqual([
      { path: "displayName", message: "This can't be used as written. Please choose a different one." },
    ]);
  });

  it("keeps the generic message when more than one field fails, so no single field is misleadingly singled out", async () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "short",
      username: "abc123",
      displayName: "shit mechanic",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues.length).toBeGreaterThan(1);
    const body = await toErrorResponse(result.error).json();
    expect(body.error.message).toBe("Some of the information provided was not valid.");
    expect(body.error.details.length).toBe(result.error.issues.length);
  });

  /*
    The handle is as public as the display name — it shows as @name on the
    profile and beside every report its owner files — so it is screened the
    same way. The character rule still runs first, and ordinary handles that
    merely contain an awkward substring must survive.
  */
  describe("the username is screened like a label", () => {
    const register = (username: string) =>
      registerSchema.safeParse({
        email: "a@b.co",
        password: "Str0ngPassw0rd!",
        username,
        displayName: "Dave",
      });

    it("refuses a profane handle", () => {
      const result = register("shitmechanic");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues[0].message).toBe(
        "This can't be used as written. Please choose a different one.",
      );
    });

    it("accepts ordinary handles, including ones with awkward substrings", () => {
      for (const handle of ["dave_smith", "scunthorpe", "classic_cars", "assessor99"]) {
        expect(register(handle).success, handle).toBe(true);
      }
    });

    it("still reports the character rule rather than the screening", () => {
      const result = register("Dave Smith");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues[0].message).toContain("lowercase letters");
    });

    it("does not gate a handle on prose-only heuristics (character wall, shouting)", () => {
      // CHARACTER_WALL and isShouting are written for prose. A run of
      // repeated letters, or an underscore run, in a handle is ordinary —
      // labels use screenText's "label" mode, which skips both checks.
      for (const handle of ["woooooot", "aaaaaaa", "x_______y"]) {
        expect(register(handle).success, handle).toBe(true);
      }
    });

    it("still refuses a handle containing a slur", () => {
      const result = register("faggot123");
      expect(result.success).toBe(false);
    });
  });

  it("still refuses a label containing a URL — label mode keeps the link check", () => {
    // The username regex (lowercase/digits/underscore only) can't itself
    // contain a URL, so this exercises the same moderatedLabel path via
    // displayName instead: label mode must keep the slur/link/email/
    // embedded-file checks even though it skips the prose-only heuristics.
    const r = registerSchema.safeParse({ ...registerBase, displayName: "http://example.com" });
    expect(r.success).toBe(false);
  });
});

const shopBase = { address: "1 Main St", city: "Austin", country: "US" };

describe("a submitted shop's name and description are moderated by the schema", () => {
  it("refuses a profane shop name outright, rather than masking it", () => {
    const r = submitShopSchema.safeParse({ ...shopBase, name: "shit mechanics" });
    expect(r.success).toBe(false);
  });

  it("refuses a slur in the shop name", () => {
    const r = submitShopSchema.safeParse({ ...shopBase, name: "faggot motors" });
    expect(r.success).toBe(false);
  });

  it("leaves a clean shop name untouched", () => {
    const parsed = submitShopSchema.parse({ ...shopBase, name: "Joe's Garage" });
    expect(parsed.name).toBe("Joe's Garage");
  });

  it("masks profanity in the description rather than refusing it", () => {
    const parsed = submitShopSchema.parse({
      ...shopBase, name: "Joe's Garage", description: "does shit work",
    });
    expect(parsed.description).toBe("does s*** work");
  });

  it("refuses a link in the description", () => {
    const r = submitShopSchema.safeParse({
      ...shopBase, name: "Joe's Garage", description: "see https://spam.example.com",
    });
    expect(r.success).toBe(false);
  });

  it("still accepts a submission with no description at all", () => {
    expect(submitShopSchema.parse({ ...shopBase, name: "Joe's Garage" }).description).toBeUndefined();
  });
});

describe("a claimant correcting the shop name is moderated the same way", () => {
  it("refuses a profane name on update", () => {
    const r = updateShopLocationSchema.safeParse({ ...shopBase, name: "shit mechanics" });
    expect(r.success).toBe(false);
  });

  it("leaves a clean name untouched on update", () => {
    const parsed = updateShopLocationSchema.parse({ ...shopBase, name: "Corrected Motors" });
    expect(parsed.name).toBe("Corrected Motors");
  });
});

describe("a shop's public price note is moderated by the schema", () => {
  const priceBase = { serviceId: "c000000000000000000000005", minPrice: 100 };

  it("masks profanity in the note rather than refusing it", () => {
    const parsed = shopPriceSchema.parse({ ...priceBase, note: "shit parts but fair labour" });
    expect(parsed.note).toBe("s*** parts but fair labour");
  });

  it("refuses a link in the note", () => {
    const r = shopPriceSchema.safeParse({ ...priceBase, note: "see https://spam.example.com" });
    expect(r.success).toBe(false);
  });

  it("still accepts a price with no note at all", () => {
    expect(shopPriceSchema.parse(priceBase).note).toBeUndefined();
  });
});

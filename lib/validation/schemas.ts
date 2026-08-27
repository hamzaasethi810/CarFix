import { z } from "zod";
import { screenText } from "../moderation/text";

const id = z.string().min(1).max(64);
const rating = z.coerce.number().int().min(1).max(5);
const money = z.coerce.number().min(0).max(1_000_000);

/**
 * Free text a person wrote. Screened on the way in, so no route can forget:
 * profanity is masked, slurs and spam are refused with the reason.
 *
 * `min` defaults to 0 (a no-op, since strings can't have negative length) so
 * every existing call site is unaffected; pass it explicitly for a field
 * that also carries a minimum length, e.g. `moderatedText(60, 1)` for a
 * display name that must not be empty. It has to be applied here, before the
 * transform, because `.min()` is a `ZodString` method and the transform's
 * output is no longer a `ZodString`.
 */
export const moderatedText = (max: number, min = 0) =>
  z
    .string()
    .min(min)
    .max(max)
    .transform((value, ctx) => {
      const result = screenText(value);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.message });
        return z.NEVER;
      }
      return result.text;
    });

export const registerSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(200),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only."),
    displayName: moderatedText(60, 1),
  })
  .strict();

export const loginSchema = z
  .object({ email: z.string().email().max(254), password: z.string().min(1).max(200) })
  .strict();

export const updateProfileSchema = z
  .object({
    displayName: moderatedText(60, 1).optional(),
    bio: moderatedText(1000).nullable().optional(),
    generalLocation: moderatedText(100).nullable().optional(),
  })
  .strict();

export const createVehicleSchema = z
  .object({
    makeId: id,
    modelId: id,
    year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 2),
    trimId: id.nullable().optional(),
    engineId: id.nullable().optional(),
    drivetrainId: id.nullable().optional(),
    mileage: z.coerce.number().int().min(0).max(2_000_000).nullable().optional(),
    nickname: moderatedText(60).nullable().optional(),
  })
  .strict();

export const updateVehicleSchema = createVehicleSchema.partial().strict();

export const createExperienceSchema = z
  .object({
    vehicleId: id,
    mechanicId: id,
    serviceId: id,
    totalPrice: money,
    partsCost: money.nullable().optional(),
    laborCost: money.nullable().optional(),
    serviceDate: z.coerce.date(),
    mileageAtService: z.coerce.number().int().min(0).max(2_000_000),
    overallRating: rating,
    qualityRating: rating,
    priceRating: rating,
    communicationRating: rating,
    turnaroundRating: rating,
    knowledgeRating: rating,
    wouldRecommend: z.coerce.boolean(),
    wouldReturn: z.coerce.boolean(),
    reviewText: moderatedText(5000).nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.serviceDate > new Date())
      ctx.addIssue({ code: "custom", path: ["serviceDate"], message: "Service date cannot be in the future." });

    const parts = v.partsCost ?? 0;
    const labor = v.laborCost ?? 0;
    if ((v.partsCost != null || v.laborCost != null) && parts + labor > v.totalPrice + 0.01)
      ctx.addIssue({
        code: "custom",
        path: ["totalPrice"],
        message: "Parts and labor cannot exceed the total price.",
      });
  });

export const updateExperienceSchema = z
  .object({
    totalPrice: money.optional(),
    partsCost: money.nullable().optional(),
    laborCost: money.nullable().optional(),
    serviceDate: z.coerce.date().optional(),
    mileageAtService: z.coerce.number().int().min(0).max(2_000_000).optional(),
    overallRating: rating.optional(),
    qualityRating: rating.optional(),
    priceRating: rating.optional(),
    communicationRating: rating.optional(),
    turnaroundRating: rating.optional(),
    knowledgeRating: rating.optional(),
    wouldRecommend: z.coerce.boolean().optional(),
    wouldReturn: z.coerce.boolean().optional(),
    reviewText: moderatedText(5000).nullable().optional(),
  })
  .strict();

export const mechanicSearchSchema = z
  .object({
    serviceId: id.optional(),
    makeId: id.optional(),
    modelId: id.optional(),
    generationId: id.optional(),
    platformId: id.optional(),
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    // 20 miles is the default catchment; the reader can widen it up to 200.
    radiusMiles: z.coerce.number().int().min(1).max(200).default(20),
    verifiedOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    subscribedOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    minRating: z.coerce.number().min(1).max(5).optional(),
    maxPrice: money.optional(),
    /*
      How to order. "relevant" is the only one that weighs the filters and the
      only one that lifts a subscribing shop; the rest are literal, because a
      paid placement dressed as a price sort misreports the data.
    */
    sort: z.enum(["relevant", "price", "rating", "distance"]).default("relevant"),
    /*
      Map pins, not a page of text results.

      This was capped at 50, which quietly truncated the map: an ordinary
      search around a city centre matches several hundred shops, so the nearest
      50 were drawn and the rest were simply absent. Anyone who added a shop
      and then went looking for it found nothing unless it happened to be one
      of the fifty closest.

      The query filters by bounding box on an index before it measures any
      distances, and the markers cluster once they are drawn, so a few hundred
      rows costs little at either end.
    */
    limit: z.coerce.number().int().min(1).max(500).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict()
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: "Latitude and longitude must be provided together.",
  });

export const experienceListSchema = z
  .object({
    mechanicId: id.optional(),
    vehicleId: id.optional(),
    generationId: id.optional(),
    serviceId: id.optional(),
    verifiedOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export const verificationDecisionSchema = z
  .object({ decision: z.enum(["VERIFIED", "REJECTED"]) })
  .strict();

export const createReportSchema = z
  .object({
    targetType: z.enum(["EXPERIENCE", "MECHANIC", "PROFILE"]),
    experienceId: id.optional(),
    // Deliberately NOT moderatedText: this is the abuse-report field, and
    // someone reporting a slur needs to be able to quote it verbatim. Running
    // it through screenText would block the exact report we most want to
    // receive. Do not "fix" this for consistency with the other free-text
    // fields.
    reason: z.string().min(5).max(1000),
  })
  .strict();

export const resolveReportSchema = z
  .object({ status: z.enum(["ACTIONED", "DISMISSED"]) })
  .strict();

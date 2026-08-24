import "server-only";
import { z } from "zod";

const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_PHOTOS: z.string().min(1),
  S3_BUCKET_RECEIPTS: z.string().min(1),

  // Blank is treated as absent so an unset optional in .env does not fail boot.
  /*
    Stripe. Optional so the app runs without billing configured; the
    subscription routes refuse to operate when they are absent rather than
    half-working.
  */
  STRIPE_SECRET_KEY: blankAsUndefined(z.string().startsWith("sk_")),
  STRIPE_WEBHOOK_SECRET: blankAsUndefined(z.string().startsWith("whsec_")),
  STRIPE_PRICE_ID: blankAsUndefined(z.string().startsWith("price_")),
  /** Absolute origin used to build Stripe return URLs. */
  APP_URL: blankAsUndefined(z.string().url()),

  UPSTASH_REDIS_REST_URL: blankAsUndefined(z.string().url()),
  UPSTASH_REDIS_REST_TOKEN: blankAsUndefined(z.string().min(1)),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = serverEnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";

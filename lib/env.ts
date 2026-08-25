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

  /*
    Email. Optional so the app runs without a mail provider; password reset
    links are written to the server log instead of being sent.
  */
  RESEND_API_KEY: blankAsUndefined(z.string().startsWith("re_")),
  EMAIL_FROM: blankAsUndefined(z.string().min(3)),

  UPSTASH_REDIS_REST_URL: blankAsUndefined(z.string().url()),
  UPSTASH_REDIS_REST_TOKEN: blankAsUndefined(z.string().min(1)),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/*
  Vercel's marketplace integrations inject their own variable names, and they
  do not all match the ones this app was written against.

  Upstash for Redis arrives as KV_REST_API_URL and KV_REST_API_TOKEN. Nothing
  fails when those go unrecognised — rate limiting simply falls back to
  counting inside a single process, which on serverless means every instance
  counts separately and brute-force protection quietly stops working. A silent
  downgrade of a security control is the worst possible failure mode, so the
  provider's names are accepted directly rather than relying on somebody
  remembering to copy them across by hand.

  Neon does inject DATABASE_URL, so that one needs no help; the unpooled
  variant is mapped through because migrations want a direct connection rather
  than the pooler.
*/
const withVercelAliases = (raw: NodeJS.ProcessEnv) => ({
  ...raw,
  UPSTASH_REDIS_REST_URL: raw.UPSTASH_REDIS_REST_URL || raw.KV_REST_API_URL,
  UPSTASH_REDIS_REST_TOKEN: raw.UPSTASH_REDIS_REST_TOKEN || raw.KV_REST_API_TOKEN,
  MIGRATE_DATABASE_URL: raw.MIGRATE_DATABASE_URL || raw.DATABASE_URL_UNPOOLED,
});

export const env = serverEnvSchema.parse(withVercelAliases(process.env));
export const isProd = env.NODE_ENV === "production";

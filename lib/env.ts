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

  /*
    Map tiles. Optional — without it the map falls back to a keyless dark
    style (see lib/map/style.ts).

    Read on the server and handed to the browser as a finished style URL by
    app/page.tsx, rather than inlined with a NEXT_PUBLIC_ prefix. The value
    still reaches the client either way — the browser is what fetches tiles,
    so it has to — but Vercel will not let a variable marked Sensitive carry
    that prefix, and requiring it would mean choosing between the dashboard's
    protection and the app working at all.

    What actually protects this key is the domain allowlist in the MapTiler
    dashboard, not secrecy. Set it there.

    NEXT_PUBLIC_MAPTILER_KEY is still accepted so existing local .env files
    keep working.
  */
  MAPTILER_KEY: blankAsUndefined(z.string().min(1)),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /*
    How many reverse proxies your own infrastructure puts in front of the app.

    Rate limiting keys unauthenticated requests on the caller's IP, and that IP
    comes from X-Forwarded-For — a header the client can send. Each trusted
    proxy APPENDS the address it saw, so the trustworthy client address is the
    Nth value counting from the right, where N is the number of proxies you
    control. Everything to the left of that is whatever the client typed and
    must never be believed: taking the leftmost value let anyone rotate the
    header to get a fresh rate-limit bucket per request and brute-force logins
    unbounded.

    1 matches the common single-proxy PaaS case (Vercel, Fly, Railway, a lone
    nginx). Set it to the exact number of hops you run; set it to 0 only when
    nothing proxies the app, in which case X-Forwarded-For is ignored entirely.
    Too high is the dangerous direction — it reads back into client-controlled
    territory — so the default is deliberately low rather than generous.
  */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
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
  // Either spelling works, so an existing .env with the NEXT_PUBLIC_ name
  // keeps running while Vercel gets the unprefixed one it will accept.
  MAPTILER_KEY: raw.MAPTILER_KEY || raw.NEXT_PUBLIC_MAPTILER_KEY,
});

export const env = serverEnvSchema.parse(withVercelAliases(process.env));
export const isProd = env.NODE_ENV === "production";

/*
  Google OAuth, optional.

  Returns null when either half is missing so the provider is simply not
  registered — a half-configured provider that renders a button and then
  fails on click is worse than no button.
*/
export const googleOAuth = () => {
  /*
    Trimmed, because credentials pasted into a dashboard routinely arrive with
    a trailing space or newline, and Google rejects a client_id with one stray
    character as invalid_client — "the OAuth client was not found" — which
    looks like a broken app rather than a typo. A real client id or secret
    never has meaningful surrounding whitespace, so trimming only ever helps.
    An empty-after-trim value falls through to null, hiding the button rather
    than showing one that cannot work.
  */
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
};

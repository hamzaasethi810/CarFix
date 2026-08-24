import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";
import { rateLimited } from "./errors";

export type LimitName =
  | "login"
  | "register"
  | "experienceSubmit"
  | "receiptUpload"
  | "search"
  | "report"
  | "vinLookup"
  | "mechanicIngest"
  | "geocode";

const WINDOWS: Record<LimitName, { tokens: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  login: { tokens: 8, window: "5 m" },
  register: { tokens: 5, window: "1 h" },
  experienceSubmit: { tokens: 10, window: "1 h" },
  // Receipts are the heaviest path on the site: an upload, an object write,
  // and eventually a human review. Kept deliberately tight.
  receiptUpload: { tokens: 4, window: "1 h" },
  search: { tokens: 120, window: "1 m" },
  report: { tokens: 15, window: "1 h" },
  vinLookup: { tokens: 40, window: "1 h" },
  // Ingestion hits a shared community API, so it is deliberately conservative.
  mechanicIngest: { tokens: 20, window: "10 m" },
  // Nominatim asks for no more than one request a second; this stays well under.
  geocode: { tokens: 20, window: "5 m" },
};

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = new Map<LimitName, Ratelimit>();

function limiterFor(name: LimitName) {
  if (!redis) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    const { tokens, window } = WINDOWS[name];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `rl:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

// Throws AppError("RATE_LIMITED") when the caller is over budget. Without Redis
// configured (local dev) it is a no-op, so the app still runs offline.
export async function enforceRateLimit(name: LimitName, identifier: string) {
  const limiter = limiterFor(name);
  if (!limiter) return;
  const { success } = await limiter.limit(identifier);
  if (!success) throw rateLimited();
}

export function clientIdentifier(req: Request, userId?: string) {
  if (userId) return `u:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

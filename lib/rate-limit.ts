import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, isProd } from "./env";
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
  | "geocode"
  | "billing"
  | "shopClaim"
  | "mfa"
  | "read"
  | "mutation"
  | "accountDelete"
  | "workPhoto"
  | "shopSubmit"
  | "passwordReset"
  | "usernameChange";

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
  billing: { tokens: 10, window: "10 m" },
  shopClaim: { tokens: 5, window: "1 h" },
  // A six-digit code has a million possibilities; this makes guessing hopeless.
  mfa: { tokens: 10, window: "15 m" },
  // Generous, but enough to stop wholesale scraping of public endpoints.
  read: { tokens: 300, window: "1 m" },
  // Ordinary edits: nobody legitimately changes their garage 200 times an hour.
  mutation: { tokens: 60, window: "1 h" },
  // Irreversible, so deliberately tiny.
  accountDelete: { tokens: 3, window: "24 h" },
  workPhoto: { tokens: 20, window: "1 h" },
  // Each submission geocodes, so this shares Nominatim's conservative budget.
  shopSubmit: { tokens: 8, window: "1 h" },
  // Tight: this endpoint sends mail and is reachable without signing in.
  passwordReset: { tokens: 6, window: "1 h" },
  // A handle is public and points at a person; changing it should be rare, so
  // this is deliberately small to stop squatting churn and impersonation games.
  usernameChange: { tokens: 4, window: "24 h" },
};

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

if (!redis && isProd) {
  // Loud, because the alternative is a production deployment that silently
  // accepts unlimited login attempts.
  console.error(
    "[rate-limit] No Redis configured. Falling back to per-instance limiting, " +
      "which does NOT hold across multiple instances. Set UPSTASH_REDIS_REST_URL.",
  );
}

/*
  In-memory fallback for when Redis is absent.

  It only counts within one process, so it is not a substitute for the real
  thing behind several instances — but the previous behaviour was to skip
  limiting entirely, which meant a misconfigured deployment had no brute-force
  protection at all. Something local is strictly better than nothing.
*/
const memory = new Map<string, { count: number; resetAt: number }>();

function windowMs(window: string): number {
  const [amount, unit] = window.split(" ");
  const n = Number(amount);
  return unit === "s" ? n * 1000 : unit === "m" ? n * 60_000 : n * 3_600_000;
}

function memoryAllow(name: LimitName, identifier: string): boolean {
  const { tokens, window } = WINDOWS[name];
  const key = `${name}:${identifier}`;
  const now = Date.now();

  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs(window) });
    // Opportunistic sweep so the map cannot grow without bound.
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return true;
  }

  entry.count += 1;
  return entry.count <= tokens;
}

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

/**
 * Throws AppError("RATE_LIMITED") when the caller is over budget.
 *
 * Uses Redis when configured so the count is shared across instances, and an
 * in-process counter otherwise.
 */
export async function enforceRateLimit(name: LimitName, identifier: string) {
  const limiter = limiterFor(name);

  if (!limiter) {
    if (!memoryAllow(name, identifier)) throw rateLimited();
    return;
  }

  const { success } = await limiter.limit(identifier);
  if (!success) throw rateLimited();
}

/**
 * The caller's IP as attributed by trusted infrastructure — never a value the
 * client can choose.
 *
 * X-Forwarded-For is a list each proxy appends to, so with N proxies of our own
 * in front (env.TRUSTED_PROXY_HOPS) the real client address is the Nth entry
 * from the right. Anything further left was put there by the client and is
 * ignored: reading the leftmost value, as this once did, let an attacker send a
 * different X-Forwarded-For on every request to land in a fresh rate-limit
 * bucket each time — defeating login brute-force protection outright (proven in
 * tests/rate-limit-ip.test.ts).
 *
 * Returns null — a shared "unknown" bucket, which fails toward limiting rather
 * than away from it — when there is no trusted proxy configured, or when the
 * header is shorter than the configured hop count (a stripped or forged header
 * that cannot be trusted to carry a real client address in the expected slot).
 */
export function clientIp(req: Request): string | null {
  const hops = env.TRUSTED_PROXY_HOPS;

  // No trusted proxy: X-Forwarded-For is entirely client-authored, so it is
  // not evidence of anything. x-real-ip has the same problem when nothing
  // trusted sets it, so it is not consulted here either.
  if (hops <= 0) return null;

  const chain = req.headers.get("x-forwarded-for");
  if (chain) {
    const parts = chain.split(",").map((p) => p.trim()).filter(Boolean);
    // The last `hops` entries were written by our own proxies. The client's
    // real address is the one the outermost trusted proxy recorded.
    if (parts.length >= hops) return parts[parts.length - hops] || null;
    // Fewer entries than trusted hops means the chain is not shaped the way
    // this deployment claims — treat it as untrusted rather than reading a
    // client-supplied slot.
    return null;
  }

  // x-real-ip is trusted only because a proxy is in front to set it; a single
  // trusted hop that uses this header instead of X-Forwarded-For is the common
  // nginx case.
  return req.headers.get("x-real-ip")?.trim() || null;
}

export function clientIdentifier(req: Request, userId?: string) {
  if (userId) return `u:${userId}`;
  return `ip:${clientIp(req) ?? "unknown"}`;
}

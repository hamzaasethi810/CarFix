import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Next injects inline hydration scripts; dev additionally needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  // MapLibre GL fetches style/tile/sprite/glyph data itself (not <img> tags),
  // so the map's tile sources are allowed here rather than in img-src.
  // MapTiler is the preferred source when NEXT_PUBLIC_MAPTILER_KEY is set;
  // OpenFreeMap is the always-available keyless fallback (see lib/map/style.ts).
  "connect-src 'self' https://api.maptiler.com https://tiles.openfreemap.org",
  // MapLibre's worker is spawned from a blob URL.
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/*
  BotID is wrapped around the config rather than configured inside it.

  The wrapper adds the rewrites that let the bot-detection script and its
  challenge endpoint be served from THIS origin instead of a third party.
  That is what keeps the strict CSP above intact: everything stays
  `script-src 'self'`, and no vendor domain has to be allowlisted.
*/
export default withBotId(nextConfig);

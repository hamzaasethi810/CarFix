import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Next injects inline hydration scripts; dev additionally needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // OpenStreetMap raster tiles for the mechanic map (no API key, no billing).
  "img-src 'self' blob: data: https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self'",
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

export default nextConfig;

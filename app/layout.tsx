import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { currentUser, isPrivileged } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "CarFix — owner-reported mechanic pricing",
  description:
    "Find local mechanics who have worked on cars like yours, and see what owners actually paid.",
};

export const viewport: Viewport = {
  // No maximum-scale: pinch-zoom must stay available.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en" className="h-full">
      {/*
        The grouped tone (#f5f5f7) rather than pure white. White cards need
        something marginally darker behind them or they do not read as cards at
        all — which is why every panel looked like plain text on a page. The
        map route paints its own full-bleed background over this.
      */}
      <body className="min-h-full flex flex-col bg-grouped">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:m-3 focus:rounded-control focus:bg-elevated focus:px-4 focus:py-3 focus:shadow-raised"
        >
          Skip to content
        </a>

        <SiteHeader
          isAuthed={Boolean(user)}
          isAdmin={user?.role === "ADMIN"}
          isReviewer={Boolean(user && isPrivileged(user.role))}
        />

        <main
          id="main"
          className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          {children}
        </main>

        <footer className="border-t border-separator mt-8">
          <div
            className="max-w-5xl mx-auto px-4 py-6 text-footnote text-secondary"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            Prices are reported by owners, not quotes from shops.{" "}
            <a href="/policies/terms" className="text-accent">
              Terms and ground rules
            </a>
            {" · "}
            <a href="/policies/receipts" className="text-accent">
              How we handle receipts
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

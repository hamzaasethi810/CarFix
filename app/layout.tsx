import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { currentUser, isPrivileged } from "@/lib/auth/guards";

/*
  Self-hosted at build time via next/font/google: no runtime request to
  Google, so the CSP stays intact and nothing about a visitor leaks to a
  third party on page load.

  Barlow carries body text; Barlow Condensed carries display sizes only
  (headings, prices, the title-scale text styles) — see globals.css. They're
  the same superfamily, so the two sit together without clashing.
*/
const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Gaari",
  description:
    "Find local mechanics who have worked on cars like yours, and see what owners actually paid.",
};

export const viewport: Viewport = {
  // No maximum-scale: pinch-zoom must stay available.
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Dark appearance only, by request (see globals.css) — the page is the same
  // deep forest ground regardless of the visitor's system preference, so
  // there is no separate light-mode colour to declare here. `#12271A` is
  // `--bg-grouped`, the tone `<body>` actually paints (see the comment
  // there), not the raw `--bg`, so mobile browser chrome matches the page.
  themeColor: "#12271A",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en" className={`h-full ${body.variable} ${display.variable}`}>
      {/*
        The grouped tone (`--bg-grouped`, app/globals.css) rather than the
        plain ground. Cards need something marginally different behind them
        or they do not read as cards at all — which is why every panel used
        to look like plain text on a page. The map route paints its own
        full-bleed background over this.
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
            <a href="/policies/privacy" className="text-accent">
              Privacy
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

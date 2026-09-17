import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BotIdClient } from "botid/client";
import { SessionGuard } from "@/components/session-guard";
import { SiteHeader } from "@/components/site-header";
import { currentUser, isPrivileged } from "@/lib/auth/guards";

/*
  Self-hosted at build time by next/font/google: no runtime request to a font
  host, so the CSP in next.config.ts stays intact and nothing about a visitor
  leaks to a third party on page load.

  Geist carries prose and headings; Geist Mono carries every chassis code, VIN
  and money figure.

  This replaced Archivo with Martian Mono. Martian Mono is a wide, quirky face
  with a lot of personality, and personality is the last thing wanted on a
  column of prices: it made money look like a novelty rather than a figure. The
  pair here is quieter and more precise, which is what a product asking to be
  trusted with numbers should sound like.

  The variables are named for their faces, not for their roles. Tailwind v4
  derives font-* utilities from the --font-* namespace, so a variable named
  --font-mono here would be mapped to itself in @theme and resolve to nothing.
*/
const sans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "WrenchRates",
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
  // Matches --bg, the tone <body> actually paints, so mobile browser chrome
  // sits flush with the page instead of capping it with a dark green bar
  // left over from the forest palette this replaced.
  themeColor: "#FBFAF8",
};

/*
  Inline-flex with a real min-height, so each policy link is a 44px target
  without breaking the sentence they sit inside. They were 16px tall.

  R27: the footer wrapper stays plain inline flow (no flex/flex-wrap) on
  purpose. A flex container turns each child — including the sentence and
  the link — into a sibling flex item, and flex items wrap BETWEEN items,
  not within the running text: at 360px that stranded a dangling middot at
  the end of one line and orphaned the last link alone on the next. An
  inline-flex element is still an atomic inline-level box, so it sits inside
  the surrounding paragraph's own line box and wraps exactly like a long
  word would — with the sentence, not against it.
*/
const policyLink =
  "text-accent inline-flex items-center min-h-11 py-2 " +
  "[@media(hover:hover)_and_(pointer:fine)]:hover:underline underline-offset-4";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en" className={`h-full ${sans.variable} ${mono.variable}`}>
      {/*
        <body> below paints the plain ground (`--bg`), not the grouped tone.
        Cards are retired — the document reads off ruling and figures rather
        than panels set apart from the page — so there is nothing left that
        needed a marginally different backdrop to read as a card. The map
        route still paints its own full-bleed background over this.
      */}
      <head>
        {/*
          Instruments only the routes named here. The server side of the check
          lives in each route (see app/api/register), and it can only verify a
          session this component started — without it, checkBotId has nothing
          to look at and would let everything through.
        */}
        <BotIdClient protect={[{ path: "/api/register", method: "POST" }]} />
      </head>
      <body className="min-h-full flex flex-col bg-bg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:m-3 focus:rounded-control focus:bg-elevated focus:px-4 focus:py-3 focus:shadow-raised"
        >
          Skip to content
        </a>

        {/* Only for someone who has a session to lose. */}
        {user && <SessionGuard />}
        <SiteHeader
          isAuthed={Boolean(user)}
          isAdmin={user?.role === "ADMIN"}
          isReviewer={Boolean(user && isPrivileged(user.role))}
        />

        <main
          id="main"
          className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
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
            <span className="footer-tagline">
              Prices are reported by owners, not quotes from shops.{" "}
            </span>
            <a href="/policies/terms" className={policyLink}>
              Terms and ground rules
            </a>
            <span aria-hidden="true"> · </span>
            <a href="/policies/privacy" className={policyLink}>
              Privacy
            </a>
            <span aria-hidden="true"> · </span>
            <a href="/policies/receipts" className={policyLink}>
              How we handle receipts
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

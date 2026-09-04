import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, Martian_Mono } from "next/font/google";
import "./globals.css";
import { BotIdClient } from "botid/client";
import { SessionGuard } from "@/components/session-guard";
import { SiteHeader } from "@/components/site-header";
import { currentUser, isPrivileged } from "@/lib/auth/guards";

/*
  Self-hosted at build time by next/font/google: no runtime request to a font
  host, so the CSP in next.config.ts stays intact and nothing about a visitor
  leaks to a third party on page load.

  Archivo carries prose and headings. Martian Mono carries every operation
  code, part number, VIN, chassis code and money figure — the impact-printer
  voice, and the thing that makes the document unmistakable.

  The variables are named for their faces, not for their roles. Tailwind v4
  derives font-* utilities from the --font-* namespace, so a variable named
  --font-mono here would be mapped to itself in @theme and resolve to nothing.
*/
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
});

const martian = Martian_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-martian",
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
  // Matches --bg, the tone <body> actually paints, so mobile browser chrome
  // sits flush with the page instead of capping it with a dark green bar
  // left over from the forest palette this replaced.
  themeColor: "#FBFAF8",
};

/*
  Inline-flex with a real min-height, so each policy link is a 44px target
  without breaking the sentence they sit inside. They were 16px tall. The
  footer wrapper below switches to flex-wrap so these targets sit on a line
  instead of forcing the surrounding prose to reflow around them.
*/
const policyLink =
  "text-accent inline-flex items-center min-h-11 py-2 align-baseline " +
  "[@media(hover:hover)_and_(pointer:fine)]:hover:underline underline-offset-4";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en" className={`h-full ${archivo.variable} ${martian.variable}`}>
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
            className="max-w-5xl mx-auto px-4 py-6 text-footnote text-secondary flex flex-wrap items-center gap-x-2 gap-y-1"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <span>Prices are reported by owners, not quotes from shops.</span>
            <a href="/policies/terms" className={policyLink}>
              Terms and ground rules
            </a>
            <span aria-hidden="true">·</span>
            <a href="/policies/privacy" className={policyLink}>
              Privacy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/policies/receipts" className={policyLink}>
              How we handle receipts
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

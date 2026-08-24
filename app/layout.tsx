import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/auth/guards";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarFix — owner-reported mechanic pricing",
  description:
    "Find local mechanics who have worked on cars like yours, and see what owners actually paid.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader isAuthed={Boolean(user)} isAdmin={user?.role === "ADMIN"} />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-border text-muted text-sm">
          <div className="max-w-5xl mx-auto px-4 py-6">
            Prices shown are owner-reported, not quotes.
          </div>
        </footer>
      </body>
    </html>
  );
}

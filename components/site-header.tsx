import Link from "next/link";
import { signOut } from "@/lib/auth";
import Image from "next/image";

const navLink =
  "inline-flex items-center min-h-11 px-3 -mx-1 rounded-control text-subhead text-secondary hover:text-label hover:bg-fill transition-colors duration-150";

export function SiteHeader({
  isAuthed,
  isAdmin,
  isReviewer,
}: {
  isAuthed: boolean;
  isAdmin: boolean;
  isReviewer: boolean;
}) {
  return (
    /*
      The bar is a translucent material on its own plane above the content,
      rather than an opaque block sharing the content's plane.
    */
    <header className="sticky top-0 z-50 border-b border-separator bg-[color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] backdrop-blur-xl backdrop-saturate-150">
      <nav
        aria-label="Primary"
        className="w-full max-w-none px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-4"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-11 pr-2 sm:pr-4 text-title3 font-bold tracking-tight"
        >
          {/*
            The plate carries the name, so no wordmark sits beside it.

            The white it was drawn on has been cut away rather than left in:
            this header is translucent and blurs whatever is behind it, which
            on the map page is the map, so a white rectangle would have shown
            as a white rectangle.

            priority, because it is the first thing above the fold on every
            page and lazy-loading it only buys a flash of empty header.
          */}
          <Image
            src="/gaari-logo.png"
            alt="Gaari"
            width={284}
            height={132}
            priority
            className="h-10 w-auto shrink-0"
          />
        </Link>

        {isAuthed && (
          <>
            <Link href="/garage" className={navLink}>
              Garage
            </Link>
            {/*
              max-sm:hidden rather than "hidden sm:inline-flex": navLink already
              sets inline-flex unconditionally, and Tailwind emits .inline-flex
              after .hidden, so the plain .hidden lost the cascade and this link
              never actually hid — it wrapped the header onto two lines on a
              360px screen. A media-query variant wins regardless of order.
            */}
            <Link href="/experiences/new" className={`${navLink} max-sm:hidden`}>
              Log a service
            </Link>
          </>
        )}

        {/* Only shown to those who hold the role; the page itself 404s otherwise. */}
        {isReviewer && (
          <Link href="/review" className={navLink}>
            Review
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin" className={navLink}>
            Admin
          </Link>
        )}

        {/* Pushes sign in and join hard to the right at every width. */}
        <span className="flex-1" />

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthed ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className={navLink}>
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className={navLink}>
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center min-h-11 px-4 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold hover:bg-accent-hover transition-colors duration-150"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

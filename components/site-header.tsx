import Link from "next/link";
import { buttonStyles } from "@/components/ui";
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
      No banner. The reference has the wordmark and the nav floating straight
      over the ground with nothing behind them — a solid strip cuts the page in
      two and hides the roads the design is built on. What is left is a blur
      just strong enough to keep white type legible when the globe drifts under
      it, and no border, because a rule across the top is the banner again.
    */
    <header className="sticky top-0 z-50 bg-transparent backdrop-blur-sm">
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
                className={`${buttonStyles.primary} text-subhead`}
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

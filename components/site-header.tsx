import Link from "next/link";
import { buttonStyles } from "@/components/ui";
import { signOut } from "@/lib/auth";

const navLink =
  "inline-flex items-center min-h-11 px-3 -mx-1 rounded-control text-subhead text-secondary " +
  "[@media(hover:hover)_and_(pointer:fine)]:hover:text-label " +
  "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-fill " +
  "transition-[color,background-color] duration-150";

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
    <header className="sticky top-0 z-50 border-b border-separator bg-elevated">
      <nav
        aria-label="Primary"
        /*
          h-12 on a short window.

          4rem of header is fine when there is height to spend and expensive
          when there is not: on a 956x440 landscape phone it was a sixth of the
          screen, and the globe below it was starved down to a 114px marble.
          Keyed on height rather than width because that is what is actually
          scarce — a wide landscape phone is not a desktop.
        */
        className="w-full max-w-none px-3 sm:px-6 h-12 [@media(min-height:481px)]:h-16 flex items-center gap-2 sm:gap-4"
      >
        {/*
          The wordmark, in the brand's own green.

          items-center rather than items-baseline: the baseline was fine while
          the wordmark was the same size as the links beside it, but at 30px it
          hangs the name low on the bar instead of seating it. The bar's height
          is keyed on window height, so the size is too — 30px in 64px of header
          has room to breathe, and the same 30px in the 48px bar a landscape
          phone gets would leave 9px above and below.
        */}
        <Link
          href="/"
          className="inline-flex items-center min-h-11 pr-2 sm:pr-4 rounded-control"
        >
          {/*
            Sized to the space, not just the window height. "WrenchRates" is a
            long wordmark; at 30px it crowds the nav on a 360px phone and pushes
            "Sign in" onto two lines. So the large size needs width AND height
            to spend — narrow phones (and short landscape bars) keep the 22px
            size, everything from 380px up gets the full 30px.
          */}
          <span className="text-title2 [@media(min-width:380px)_and_(min-height:481px)]:text-title1 font-bold tracking-tight text-accent">
            WrenchRates
          </span>
        </Link>

        {isAuthed && (
          <>
            <Link href="/search" className={navLink}>
              Find shops
            </Link>
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

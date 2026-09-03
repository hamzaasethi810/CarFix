import Image from "next/image";
import Link from "next/link";
import { buttonStyles } from "@/components/ui";
import { signOut } from "@/lib/auth";

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
      Translucent, blurred, with a hairline underneath.

      It used to be fully transparent, which worked when it floated over a
      dark globe and nothing else. On a light page with real content beneath
      it, transparency means paragraphs scroll visibly through the wordmark
      and the nav, which reads as a rendering fault rather than a design.

      A blur plus a partial ground keeps the page feeling continuous without
      letting text collide with the controls, and the rule only has to be a
      hairline to stop the header dissolving into the section under it.
    */
    <header className="sticky top-0 z-50 border-b border-separator bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-bg">
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

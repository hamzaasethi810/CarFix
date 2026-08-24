import Link from "next/link";
import { signOut } from "@/lib/auth";

const navLink =
  "inline-flex items-center min-h-11 px-3 -mx-1 rounded-control text-subhead text-secondary hover:text-label hover:bg-fill transition-colors duration-150";

export function SiteHeader({ isAuthed, isAdmin }: { isAuthed: boolean; isAdmin: boolean }) {
  return (
    /*
      The bar is a translucent material on its own plane above the content,
      rather than an opaque block sharing the content's plane.
    */
    <header className="sticky top-0 z-50 border-b border-separator bg-[color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] backdrop-blur-xl backdrop-saturate-150">
      <nav
        aria-label="Primary"
        className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-1 sm:gap-2"
      >
        <Link
          href="/"
          className="inline-flex items-center min-h-11 pr-3 text-title3 font-bold tracking-tight"
        >
          Car<span className="text-brand">Fix</span>
        </Link>

        <Link href="/" className={navLink}>
          Find a shop
        </Link>

        {isAuthed && (
          <>
            <Link href="/garage" className={navLink}>
              Garage
            </Link>
            <Link href="/experiences/new" className={`${navLink} hidden sm:inline-flex`}>
              Log a service
            </Link>
          </>
        )}

        {isAdmin && (
          <Link href="/admin" className={navLink}>
            Admin
          </Link>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
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
                className="inline-flex items-center min-h-11 px-4 rounded-control bg-accent text-on-accent text-subhead font-semibold hover:bg-accent-hover transition-colors duration-150"
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

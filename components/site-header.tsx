import Link from "next/link";
import { signOut } from "@/lib/auth";

export function SiteHeader({ isAuthed, isAdmin }: { isAuthed: boolean; isAdmin: boolean }) {
  return (
    <header className="border-b border-border bg-surface">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6 text-sm">
        <Link href="/" className="font-semibold tracking-tight text-base">
          Car<span className="text-accent">Fix</span>
        </Link>

        <Link href="/mechanics" className="text-muted hover:text-foreground">
          Find a mechanic
        </Link>

        {isAuthed && (
          <>
            <Link href="/garage" className="text-muted hover:text-foreground">
              Garage
            </Link>
            <Link href="/experiences/new" className="text-muted hover:text-foreground">
              Log a service
            </Link>
          </>
        )}

        {isAdmin && (
          <Link href="/admin" className="text-muted hover:text-foreground">
            Admin
          </Link>
        )}

        <div className="ml-auto flex items-center gap-4">
          {isAuthed ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-muted hover:text-foreground">
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-accent text-accent-fg px-3 py-1.5 font-medium"
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

"use client";

import { signIn } from "next-auth/react";

/*
  The federated sign-in option, shared by the sign-in and join screens.

  One component so the two screens cannot drift apart — the same button, the
  same divider. It is gated on the server having Google configured, passed down
  as a boolean rather than read here, because the credentials live in lib/env
  and must never be reachable from a client component. When Google is not
  configured this renders nothing, and the email form below it stands alone.

  OAuth makes no distinction between signing in and signing up: the first time
  through creates the account, every time after signs in. So "Continue with"
  is the honest verb on both screens, and both send the finished session to the
  garage.
*/
export function SocialSignIn({ googleEnabled }: { googleEnabled: boolean }) {
  if (!googleEnabled) return null;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => signIn("google", { redirectTo: "/welcome" })}
        className="w-full min-h-11 flex items-center justify-center gap-2.5 rounded-control border border-separator bg-elevated text-subhead font-medium transition-transform duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-tertiary"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="relative text-center">
        <span className="absolute inset-x-0 top-1/2 border-t border-separator" />
        <span className="relative bg-bg px-3 text-footnote text-tertiary-label">
          or use your email
        </span>
      </div>
    </div>
  );
}

/* Google's mark is a fixed brand asset; lucide has no equivalent. */
function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/*
  Sends a reviewer or administrator who has no second factor to enrolment, and
  keeps them there.

  This lives in middleware rather than the root layout because middleware is
  the only place the request path is reliably available. The layout previously
  read it from a header this file set, which worked for a plain page load but
  not for the RSC payload the client router fetches — those arrived without it,
  the guard could not tell it was already on /setup-2fa, and redirected again.
  The result was an infinite redirect that exhausted the browser.

  This is a convenience, not the security boundary. requireReviewer and
  requireAdmin refuse the request regardless, so a gap here cannot expose
  anything; it would only mean somebody sees an error instead of a helpful
  redirect.
*/

const ENROLMENT_PATH = "/setup-2fa";

/** Paths that must stay reachable, or enrolment itself becomes impossible. */
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith(ENROLMENT_PATH) ||
    // The enrolment page calls these to stage a secret and confirm a code.
    pathname.startsWith("/api/mfa") ||
    // Signing in and out must always work.
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    // Never interfere with assets.
    pathname.startsWith("/_next")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isExempt(pathname)) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    // Must match the cookie the auth config writes, or the token reads as absent.
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) return NextResponse.next();

  const role = token.role;
  const privileged = role === "REVIEWER" || role === "ADMIN";
  if (!privileged || token.mfaEnabled) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = ENROLMENT_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse, type NextRequest } from "next/server";

/*
  Server components cannot read the current path, and the root layout needs it
  to push a privileged account into enrolment. Passing it through as a header
  is the supported way to make it available.
*/
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Static assets do not need it, and matching them would be wasteful.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

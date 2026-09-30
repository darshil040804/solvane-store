import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Optimistic check only: it looks for a session cookie without touching the
// database. Protected pages still validate the session with requireSession().
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const { pathname, search } = request.nextUrl;
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("redirectTo", pathname + search);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/cart", "/checkout/:path*"],
};

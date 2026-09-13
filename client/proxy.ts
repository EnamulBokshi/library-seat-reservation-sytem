import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/auth/login", "/auth/register", "/auth/verify-email"];
/// Signed-in-only areas. Cookie presence only — real authorization is server-side.
const PROTECTED_ROUTE_PREFIXES = ["/admin", "/dashboard"];

/**
 * Next.js Centralized Request Proxy & Auth Access Control
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const hasAuthToken = Boolean(accessToken || refreshToken);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // 1. Redirect signed-in users away from public auth pages to home.
  //    Only a live access token counts here. A lone refreshToken cookie may be
  //    stale or revoked, and bouncing on it locks the user out of the login and
  //    register pages entirely. `?redirect=` means the app itself sent the user
  //    here after a 401, so never bounce that back.
  const cameFromAuthFailure = searchParams.has("redirect");
  if (accessToken && isPublicRoute && !cameFromAuthFailure) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Protect signed-in areas — redirect unauthenticated visitors to login
  if (!hasAuthToken && isProtectedRoute) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Pass request to destination
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|widget).*)"],
};

import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/auth/login", "/auth/register"];
const ADMIN_ROUTES_PREFIX = "/admin";

/**
 * Next.js Centralized Request Proxy & Auth Access Control
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const hasAuthToken = Boolean(accessToken || refreshToken);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith(ADMIN_ROUTES_PREFIX);

  // 1. Redirect authenticated users away from public auth pages to home or dashboard
  if (hasAuthToken && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Protect Admin dashboard routes — redirect unauthenticated visitors to login
  if (!hasAuthToken && isAdminRoute) {
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

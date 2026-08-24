import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/auth/login", "/auth/register"];

/**
 * Next.js 16+ Centralized Request Proxy & Auth Access Control
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // 1. Redirect authenticated users away from public auth pages to home
  if (accessToken && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Pass request to destination
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

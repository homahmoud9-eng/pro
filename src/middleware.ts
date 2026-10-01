import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/employees",
  "/business",
  "/operations",
  "/finance",
  "/compliance",
  "/reports",
  "/notifications",
  "/audit",
  "/settings",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const sessionCookie = req.cookies.get("uae_restaurant_session")?.value;
    if (!sessionCookie) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/employees",
    "/employees/:path*",
    "/business",
    "/business/:path*",
    "/operations",
    "/operations/:path*",
    "/finance",
    "/finance/:path*",
    "/compliance",
    "/compliance/:path*",
    "/reports",
    "/reports/:path*",
    "/notifications",
    "/notifications/:path*",
    "/audit",
    "/audit/:path*",
    "/settings",
    "/settings/:path*",
  ],
};

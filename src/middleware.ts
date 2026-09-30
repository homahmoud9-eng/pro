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

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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
    "/dashboard/:path*",
    "/employees/:path*",
    "/business/:path*",
    "/operations/:path*",
    "/finance/:path*",
    "/compliance/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/audit/:path*",
    "/settings/:path*",
  ],
};

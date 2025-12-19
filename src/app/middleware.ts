  // TODO: protect authenticated routes, redirect unauthenticated users, and handle public exceptions.

  import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "bm_session";

/**
 * Public paths that should NOT require auth:
 * - Landing: /
 * - Auth pages: /auth/*
 * - Auth APIs: /api/auth/*
 */
function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  return false;
}

/**
 * Protected app area:
 * In your structure, the main app lives under:
 *   src/app/(protected)/app/...
 * which is accessible as:
 *   /app/...
 */
function isProtectedAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next internals & static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // Allow all public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (isProtectedAppPath(pathname)) {
    const session = req.cookies.get(COOKIE_NAME)?.value;

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // All other routes continue
  return NextResponse.next();
}

/**
 * Match only routes we care about:
 * - All /app routes
 * - All /auth routes (so we can still allow them explicitly)
 * - All /api routes (so /api/auth stays public; others can be protected later if needed)
 */
export const config = {
  matcher: ["/app/:path*", "/auth/:path*", "/api/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "tazelenme-session";

function getSessionRole(request: NextRequest): string | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw);
    const session = JSON.parse(decoded);
    return session?.user?.role || null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const role = getSessionRole(request);
  const { pathname } = request.nextUrl;

  // /admin/* → oturum yoksa veya STUDENT ise login'e gönder
  if (pathname.startsWith("/admin")) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student", request.url));
    }
  }

  // /student/* → oturum yoksa login'e, ADMIN ise admin'e gönder
  if (pathname.startsWith("/student")) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // /login → oturum varsa role'a göre yönlendir
  if (pathname === "/login") {
    if (sessionCookie && role) {
      const target = role === "ADMIN" ? "/admin" : "/student";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/login"],
};

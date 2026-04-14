import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "tazelenme-session";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  // /admin/* → oturum yoksa login'e gönder
  if (pathname.startsWith("/admin")) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // /login → oturum varsa admin'e gönder
  if (pathname === "/login") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};

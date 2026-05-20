import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const { pathname } = req.nextUrl;

    // Admin redirect logic
    if (pathname.startsWith("/dashboard")) {
      if (token?.role && ["admin", "superadmin", "imprenta"].includes(token.role as string)) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    if (pathname.startsWith("/admin")) {
        if (!token?.role || !["admin", "superadmin", "imprenta"].includes(token.role as string)) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

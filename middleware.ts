import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const { pathname } = req.nextUrl;

    const host = req.headers.get("host");

    // Domain redirect: Old Vercel URL to Official Domain
    if (host === "pre-rescate-pty.vercel.app") {
      const url = req.nextUrl.clone();
      url.host = "www.prerescatepty.com";
      url.protocol = "https";
      url.port = "";
      return NextResponse.redirect(url, 308);
    }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

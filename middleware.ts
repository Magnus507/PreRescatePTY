import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import {
  buildContentSecurityPolicy,
  isProtectedAppRoute,
} from "@/lib/security/csp";

const ADMIN_ROLES = ["admin", "superadmin", "imprenta"];

function applyCsp(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function createCspContext(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  return { csp, requestHeaders };
}

function continueWithCsp(req: NextRequest) {
  const { csp, requestHeaders } = createCspContext(req);

  return applyCsp(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp,
  );
}

const protectedMiddleware = withAuth(
  function authenticatedMiddleware(req) {
    const { csp, requestHeaders } = createCspContext(req);
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/dashboard")) {
      if (token?.role && ADMIN_ROLES.includes(token.role as string)) {
        return applyCsp(
          NextResponse.redirect(new URL("/admin", req.url)),
          csp,
        );
      }
    }

    if (pathname.startsWith("/admin")) {
      if (!token?.role || !ADMIN_ROLES.includes(token.role as string)) {
        return applyCsp(
          NextResponse.redirect(new URL("/dashboard", req.url)),
          csp,
        );
      }
    }

    return applyCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!isProtectedAppRoute(req.nextUrl.pathname)) {
    return continueWithCsp(req);
  }

  return protectedMiddleware(req as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml).*)",
  ],
};

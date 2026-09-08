import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import {
  buildContentSecurityPolicy,
  buildStaticPublicContentSecurityPolicy,
  isProtectedAppRoute,
  isStaticPublicRoute,
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

function continueWithNonceCsp(req: NextRequest) {
  const { csp, requestHeaders } = createCspContext(req);

  return applyCsp(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp,
  );
}

function continueWithStaticPublicCsp() {
  return applyCsp(
    NextResponse.next(),
    buildStaticPublicContentSecurityPolicy(
      process.env.NODE_ENV === "development",
    ),
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
  const pathname = req.nextUrl.pathname;

  if (isProtectedAppRoute(pathname)) {
    return protectedMiddleware(req as NextRequestWithAuth, event);
  }

  if (isStaticPublicRoute(pathname)) {
    return continueWithStaticPublicCsp();
  }

  // Fail closed: unknown/new routes remain request-scoped with nonce CSP until
  // they are explicitly reviewed and added to the static public allowlist.
  return continueWithNonceCsp(req);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml).*)",
  ],
};

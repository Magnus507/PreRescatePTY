const YAPPY_SCRIPT_SOURCES = [
  "https://bt-cdn.yappy.cloud",
  "https://bt-cdn-uat.yappycloud.com",
] as const;

const STATIC_PUBLIC_ROUTES = new Set([
  "/",
  "/como-funciona",
  "/faq",
  "/contacto",
  "/demo",
  "/empresa",
  "/empresas",
  "/para-quien-es",
  "/legal",
]);

const STATIC_PUBLIC_PREFIXES = ["/legal/"] as const;

const NONCE_PUBLIC_PREFIXES = [
  "/activar",
  "/comprar",
  "/e",
  "/forgot-password",
  "/login",
  "/registro",
  "/reset-password",
] as const;

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedAppRoute(pathname: string) {
  return (
    matchesRoutePrefix(pathname, "/dashboard") ||
    matchesRoutePrefix(pathname, "/admin")
  );
}

export function isStaticPublicRoute(pathname: string) {
  return (
    STATIC_PUBLIC_ROUTES.has(pathname) ||
    STATIC_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function requiresNonceCsp(pathname: string) {
  return (
    isProtectedAppRoute(pathname) ||
    NONCE_PUBLIC_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))
  );
}

function buildCommonDirectives(scriptSources: string[]) {
  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://chart.googleapis.com https://api.qrserver.com https://*.supabase.co",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.sentry.io https://nominatim.openstreetmap.org https://*.supabase.co https://apipagosbg.bgeneral.cloud https://api-comecom-uat.yappycloud.com wss:",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function buildContentSecurityPolicy(
  nonce: string,
  isDevelopment = false,
) {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://browser.sentry-cdn.com",
    "https://*.vercel-insights.com",
    "https://va.vercel-scripts.com",
    ...YAPPY_SCRIPT_SOURCES,
  ];

  return buildCommonDirectives(scriptSources);
}

export function buildStaticPublicContentSecurityPolicy(
  isDevelopment = false,
) {
  const scriptSources = [
    "'self'",
    // Static App Router pages contain Next.js inline bootstrap/RSC scripts. A
    // nonce cannot be generated at build time, so unsafe-inline is scoped only
    // to the explicitly public, non-sensitive surface.
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://browser.sentry-cdn.com",
    "https://*.vercel-insights.com",
    "https://va.vercel-scripts.com",
    ...YAPPY_SCRIPT_SOURCES,
  ];

  return buildCommonDirectives(scriptSources);
}

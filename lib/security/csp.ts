const YAPPY_SCRIPT_SOURCES = [
  "https://bt-cdn.yappy.cloud",
  "https://bt-cdn-uat.yappycloud.com",
] as const;

export function isProtectedAppRoute(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
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

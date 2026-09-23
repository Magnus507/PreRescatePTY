import { getSentryPrivacyConfig } from "./lib/security/telemetry";

async function startSentry() {
  const Sentry = await import("@sentry/nextjs");
  const hostname = typeof window === "undefined" ? undefined : window.location.hostname;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    ...getSentryPrivacyConfig({
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      hostname,
    }),
    debug: false,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
  });
}

export function register() {
  if (typeof window === "undefined") return;

  const pathname = window.location.pathname;
  const monitoredSurface =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/activar") ||
    pathname.startsWith("/e/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  // Marketing and legal pages intentionally do not load the Sentry client bundle.
  // Server-side observability remains available while the public landing stays light.
  if (!monitoredSurface) return;

  void startSentry();
}

import { getSentryPrivacyConfig } from "./lib/security/telemetry";

const STATIC_PUBLIC_PATHS = new Set([
  "/",
  "/como-funciona",
  "/para-quien-es",
  "/faq",
  "/contacto",
  "/proyecto",
  "/legal",
]);

function isStaticPublicPath(pathname: string) {
  return (
    STATIC_PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/legal/")
  );
}

export function register() {
  if (typeof window === "undefined") return;

  const startSentry = async () => {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      ...getSentryPrivacyConfig({
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
        hostname: window.location.hostname,
      }),
      debug: false,
      replaysOnErrorSampleRate: 0,
      replaysSessionSampleRate: 0,
    });
  };

  if (isStaticPublicPath(window.location.pathname)) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => void startSentry(), { timeout: 5000 });
    } else {
      window.setTimeout(() => void startSentry(), 3000);
    }
    return;
  }

  void startSentry();
}

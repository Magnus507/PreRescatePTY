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
  const operationalSurface =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/activar") ||
    pathname.startsWith("/e/");

  if (operationalSurface) {
    void startSentry();
    return;
  }

  const start = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => void startSentry(), { timeout: 5000 });
    } else {
      window.setTimeout(() => void startSentry(), 2500);
    }
  };

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
}

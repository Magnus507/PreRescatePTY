import * as Sentry from "@sentry/nextjs";
import { getSentryPrivacyConfig } from "./lib/security/telemetry";

export function register() {
  const hostname =
    typeof window === "undefined" ? undefined : window.location.hostname;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    ...getSentryPrivacyConfig({
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      hostname,
    }),
    debug: false,
    // Replay is intentionally disabled for the medical-data product surface.
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import { validateStartupEnv } from "./lib/env";
import {
  getSentryPrivacyConfig,
  redactTelemetryString,
  sanitizeTelemetry,
} from "./lib/security/telemetry";

export async function register() {
  validateStartupEnv();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      ...getSentryPrivacyConfig({
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      }),
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      ...getSentryPrivacyConfig({
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      }),
      debug: false,
    });
  }
}

export const onRequestError = async (
  error: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  errorContext: { routerKind: string; routePath: string; routeType: string },
) => {
  const Sentry = await import("@sentry/nextjs");
  const safeRequest = {
    path: redactTelemetryString(request.path.split("?")[0]),
    method: request.method,
    headers: {},
  };

  Sentry.captureRequestError(
    error,
    safeRequest,
    sanitizeTelemetry(errorContext),
  );
};

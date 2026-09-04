import * as Sentry from "@sentry/nextjs";
import { getSentryPrivacyConfig } from "./lib/security/telemetry";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  ...getSentryPrivacyConfig({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  }),
  debug: false,
});

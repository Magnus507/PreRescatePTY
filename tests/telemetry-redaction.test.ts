import { describe, expect, it } from "vitest";
import {
  getSentryPrivacyConfig,
  getTelemetrySampling,
  redactTelemetryString,
  resolveTelemetryEnvironment,
  sanitizeSentryEvent,
  sanitizeTelemetry,
  TELEMETRY_REDACTED,
} from "@/lib/security/telemetry";

describe("telemetry privacy", () => {
  it("redacts sensitive structured values while preserving operational identifiers", () => {
    const sanitized = sanitizeTelemetry({
      authorization: "Bearer synthetic-secret-token",
      phone: "+507 6123-4567",
      allergies: ["penicillin"],
      medications: "warfarin",
      receiptUrl: "https://example.invalid/private-receipt.jpg",
      nested: { email: "person@example.com" },
      orderId: "ORD-SAFE-123",
    });

    const serialized = JSON.stringify(sanitized);

    expect(serialized).not.toContain("synthetic-secret-token");
    expect(serialized).not.toContain("6123-4567");
    expect(serialized).not.toContain("penicillin");
    expect(serialized).not.toContain("warfarin");
    expect(serialized).not.toContain("private-receipt.jpg");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).toContain(TELEMETRY_REDACTED);
    expect(sanitized.orderId).toBe("ORD-SAFE-123");
  });

  it("redacts common secrets, contact data and medical values embedded in strings", () => {
    const sanitized = redactTelemetryString(
      "contact person@example.com +507 6123-4567 token=synthetic-secret allergies: penicillin receipt=https://example.invalid/proof.jpg",
    );

    expect(sanitized).not.toContain("person@example.com");
    expect(sanitized).not.toContain("6123-4567");
    expect(sanitized).not.toContain("synthetic-secret");
    expect(sanitized).not.toContain("penicillin");
    expect(sanitized).not.toContain("proof.jpg");
  });

  it("minimizes Sentry request and user context", () => {
    const sanitized = sanitizeSentryEvent({
      request: {
        url: "https://www.prerescatepty.com/api/example?token=synthetic-secret",
        headers: {
          authorization: "Bearer synthetic-secret-token",
          cookie: "session=synthetic-cookie",
        },
        query_string: "token=synthetic-secret",
        data: { medicalNotes: "synthetic-medical-note" },
        cookies: { session: "synthetic-cookie" },
      },
      user: {
        id: "USER-SAFE-123",
        email: "person@example.com",
        phone: "+507 6123-4567",
      },
    });

    const serialized = JSON.stringify(sanitized);

    expect(sanitized.request.url).toBe(
      "https://www.prerescatepty.com/api/example",
    );
    expect(sanitized.request.query_string).toBe(TELEMETRY_REDACTED);
    expect(sanitized.request.data).toBe(TELEMETRY_REDACTED);
    expect(sanitized.request.cookies).toBe(TELEMETRY_REDACTED);
    expect(sanitized.user).toEqual({ id: "USER-SAFE-123" });
    expect(serialized).not.toContain("synthetic-secret");
    expect(serialized).not.toContain("synthetic-cookie");
    expect(serialized).not.toContain("synthetic-medical-note");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("6123-4567");
  });

  it("uses bounded tracing and disables Replay in every environment", () => {
    expect(resolveTelemetryEnvironment({ vercelEnv: "production" })).toBe(
      "production",
    );
    expect(resolveTelemetryEnvironment({ vercelEnv: "preview" })).toBe(
      "preview",
    );
    expect(
      resolveTelemetryEnvironment({
        nodeEnv: "production",
        hostname: "candidate.vercel.app",
      }),
    ).toBe("preview");
    expect(resolveTelemetryEnvironment({ nodeEnv: "test" })).toBe("test");

    expect(getTelemetrySampling("production")).toEqual({
      tracesSampleRate: 0.1,
      replaySessionSampleRate: 0,
      replayErrorSampleRate: 0,
    });
    expect(getTelemetrySampling("preview")).toEqual({
      tracesSampleRate: 0.25,
      replaySessionSampleRate: 0,
      replayErrorSampleRate: 0,
    });
    expect(getTelemetrySampling("development").tracesSampleRate).toBe(0);
    expect(getTelemetrySampling("test").tracesSampleRate).toBe(0);
  });

  it("disables default PII collection in the shared Sentry config", () => {
    const config = getSentryPrivacyConfig({ vercelEnv: "production" });

    expect(config.sendDefaultPii).toBe(false);
    expect(config.tracesSampleRate).toBe(0.1);
    expect(config.beforeSend).toBe(sanitizeSentryEvent);
  });
});

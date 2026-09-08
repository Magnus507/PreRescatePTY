import { describe, expect, it } from "vitest";
import {
  sanitizeOperationalTelemetryUrl,
  sanitizePublicAnalyticsUrl,
  sanitizeSentryEvent,
} from "@/lib/security/telemetry";

describe("telemetry URL privacy", () => {
  it("allows only known public analytics routes and strips query/hash data", () => {
    expect(
      sanitizePublicAnalyticsUrl(
        "https://www.prerescatepty.com/?utm_source=tiktok&email=test@example.com#hero",
      ),
    ).toBe("https://www.prerescatepty.com/");

    expect(
      sanitizePublicAnalyticsUrl(
        "https://www.prerescatepty.com/comprar?checkout=secret#pay",
      ),
    ).toBe("https://www.prerescatepty.com/comprar");

    expect(
      sanitizePublicAnalyticsUrl(
        "https://www.prerescatepty.com/legal/privacidad?source=footer",
      ),
    ).toBe("https://www.prerescatepty.com/legal/privacidad");
  });

  it("drops private, authentication and emergency routes from Vercel analytics", () => {
    for (const url of [
      "https://www.prerescatepty.com/admin",
      "https://www.prerescatepty.com/dashboard/profile",
      "https://www.prerescatepty.com/e/ABC12345",
      "https://www.prerescatepty.com/login",
      "https://www.prerescatepty.com/activar/ABC12345",
      "https://www.prerescatepty.com/reset-password/token-value",
    ]) {
      expect(sanitizePublicAnalyticsUrl(url), url).toBeNull();
    }
  });

  it("redacts emergency short codes and UUIDs from operational telemetry", () => {
    expect(
      sanitizeOperationalTelemetryUrl(
        "/e/ABC12345?token=super-secret#medical",
      ),
    ).toBe("/e/[REDACTED]");

    expect(
      sanitizeOperationalTelemetryUrl(
        "https://www.prerescatepty.com/admin/orders/550e8400-e29b-41d4-a716-446655440000?view=full",
      ),
    ).toBe("https://www.prerescatepty.com/admin/orders/[REDACTED]");
  });

  it("sanitizes Sentry request URLs while retaining operational error context", () => {
    const event = sanitizeSentryEvent({
      request: {
        url: "https://www.prerescatepty.com/e/RESCUE77?token=secret",
        query_string: "token=secret",
        data: { medical: "private" },
        cookies: { session: "secret" },
      },
      tags: { routeType: "render" },
    });

    expect(event).toMatchObject({
      request: {
        url: "https://www.prerescatepty.com/e/[REDACTED]",
        query_string: "[REDACTED]",
        data: "[REDACTED]",
        cookies: "[REDACTED]",
      },
      tags: { routeType: "render" },
    });
  });
});

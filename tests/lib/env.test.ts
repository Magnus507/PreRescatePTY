import { describe, expect, it } from "vitest";
import {
  validateEnvForScope,
  validateStartupEnv,
} from "@/lib/env";

const validProductionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  DATABASE_URL: "postgresql://user:password@localhost:5432/app",
  NEXTAUTH_URL: "https://www.prerescatepty.com",
  NEXTAUTH_SECRET: "test-only-nextauth-secret-at-least-32-characters",
  ENCRYPTION_KEY: "0000000000000000000000000000000000000000000000000000000000000000",
  NEXT_PUBLIC_SITE_URL: "https://www.prerescatepty.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-service-role",
  CRON_SECRET: "test-only-cron-secret",
};

describe("environment contract", () => {
  it("accepts the strict production core", () => {
    expect(() => validateEnvForScope("production", validProductionEnv)).not.toThrow();
  });

  it("fails closed when a production core variable is missing", () => {
    const env = { ...validProductionEnv };
    delete env.ENCRYPTION_KEY;

    expect(() => validateEnvForScope("production", env)).toThrow(
      "Invalid environment configuration: ENCRYPTION_KEY",
    );
  });

  it("does not include secret values in validation errors", () => {
    const secretValue = "secret-value-that-must-not-appear";
    const env = { ...validProductionEnv, NEXTAUTH_SECRET: secretValue.slice(0, 12) };

    try {
      validateEnvForScope("production", env);
      throw new Error("expected validation to fail");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("NEXTAUTH_SECRET");
      expect(message).not.toContain(secretValue);
      expect(message).not.toContain(secretValue.slice(0, 12));
    }
  });

  it("rejects a partially configured Resend integration in production", () => {
    const env = {
      ...validProductionEnv,
      RESEND_API_KEY: "test-resend-key",
    };

    expect(() => validateEnvForScope("production", env)).toThrow(
      "Invalid environment configuration: RESEND_FROM_EMAIL",
    );
  });

  it("allows preview runtime to omit production-only core secrets", () => {
    expect(() =>
      validateStartupEnv({ NODE_ENV: "production", VERCEL_ENV: "preview" }),
    ).not.toThrow();
  });

  it("keeps the test database isolated as an explicit test scope", () => {
    expect(() => validateEnvForScope("test", {})).toThrow(
      "Invalid environment configuration: DATABASE_URL_TEST",
    );
    expect(() =>
      validateEnvForScope("test", {
        DATABASE_URL_TEST: "postgresql://user:password@localhost:5432/test",
      }),
    ).not.toThrow();
  });
});

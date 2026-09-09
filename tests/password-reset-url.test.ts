import { describe, expect, it } from "vitest";
import { buildPasswordResetUrl } from "@/lib/password-reset";

describe("password reset URL generation", () => {
  it("prefers the canonical production site URL", () => {
    const url = buildPasswordResetUrl("token-123", {
      siteUrl: "https://www.prerescatepty.com",
      appUrl: "http://localhost:3000",
      requestUrl: "https://preview.example.vercel.app/api/auth/forgot-password",
      nodeEnv: "production",
    });

    expect(url).toBe("https://www.prerescatepty.com/reset-password?token=token-123");
  });

  it("falls back to the request origin instead of localhost in production", () => {
    const url = buildPasswordResetUrl("token-123", {
      siteUrl: "",
      appUrl: "",
      requestUrl: "https://www.prerescatepty.com/api/auth/forgot-password",
      nodeEnv: "production",
    });

    expect(url).toBe("https://www.prerescatepty.com/reset-password?token=token-123");
    expect(url).not.toContain("localhost");
  });

  it("allows localhost only outside production when no base URL exists", () => {
    const url = buildPasswordResetUrl("dev-token", {
      siteUrl: "",
      appUrl: "",
      nodeEnv: "development",
    });

    expect(url).toBe("http://localhost:3000/reset-password?token=dev-token");
  });

  it("fails closed in production if no site, app, or request URL is available", () => {
    expect(() =>
      buildPasswordResetUrl("token-123", {
        siteUrl: "",
        appUrl: "",
        nodeEnv: "production",
      })
    ).toThrow("Password reset base URL is not configured");
  });
});

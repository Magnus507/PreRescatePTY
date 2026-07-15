import { describe, it, expect } from "vitest";
import { createPasswordResetToken, hashPasswordResetToken } from "@/lib/password-reset";

describe("password reset token helpers", () => {
  it("generates a URL-safe random token with enough entropy", () => {
    const token = createPasswordResetToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("hashes tokens deterministically with sha256", () => {
    const token = "sample-reset-token";
    const hash1 = hashPasswordResetToken(token);
    const hash2 = hashPasswordResetToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).not.toBe(token);
  });
});

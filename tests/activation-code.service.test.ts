import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activationCodeLookupWhere,
  activationCodeNeedsBackfill,
  hashActivationCode,
  normalizeActivationCode,
  protectActivationCode,
  revealActivationCode,
} from "@/domains/chips/activation-code.service";

const originalKey = process.env.ENCRYPTION_KEY;

describe("activation code protection", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = originalKey;
  });

  it("normalizes before hashing and lookup", () => {
    expect(normalizeActivationCode("  abcd-1234  ")).toBe("ABCD-1234");
    expect(hashActivationCode("abcd-1234")).toBe(hashActivationCode(" ABCD-1234 "));
    expect(activationCodeLookupWhere("abcd-1234")).toEqual({
      OR: [
        { activationCodeHash: hashActivationCode("ABCD-1234") },
        { activationCode: "ABCD-1234" },
      ],
    });
  });

  it("stores authenticated ciphertext, lookup hash and safe suffix", () => {
    const protectedCode = protectActivationCode("abcd-efgh-jklm");

    expect(protectedCode.activationCode).toMatch(/^v2:gcm:/);
    expect(protectedCode.activationCode).not.toContain("ABCD-EFGH-JKLM");
    expect(protectedCode.activationCodeHash).toBe(hashActivationCode("ABCD-EFGH-JKLM"));
    expect(protectedCode.activationCodeLast4).toBe("JKLM");
    expect(revealActivationCode(protectedCode.activationCode)).toBe("ABCD-EFGH-JKLM");
    expect(activationCodeNeedsBackfill(protectedCode)).toBe(false);
  });

  it("keeps legacy plaintext readable only for the migration window", () => {
    expect(revealActivationCode("LEGACY-CODE")).toBe("LEGACY-CODE");
    expect(activationCodeNeedsBackfill({ activationCode: "LEGACY-CODE" })).toBe(true);
  });

  it("rejects tampered ciphertext", () => {
    const protectedCode = protectActivationCode("ABCD-EFGH-JKLM");
    expect(() => revealActivationCode(`${protectedCode.activationCode}x`)).toThrow("authentication_failed");
  });
});

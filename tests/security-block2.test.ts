import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MFA_SETUP_CHALLENGE_TTL_MS,
  consumeMfaRecoveryCode,
  consumeVerifiedMfaTotp,
  createMfaSetupChallenge,
  generateMfaRecoveryCodes,
  isRecoveryCode,
  normalizeRecoveryCode,
  openMfaSetupChallenge,
  replaceMfaRecoveryCodes,
} from "@/domains/users/services/mfa.service";
import {
  PASSWORD_MIN_LENGTH,
  queryPwnedPasswordCount,
  validatePasswordPolicy,
} from "@/lib/password-policy";

const encryptionKey = "0".repeat(64);

describe("Block 2 security invariants", () => {
  const oldKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = encryptionKey;
  });

  afterEach(() => {
    if (oldKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = oldKey;
    vi.restoreAllMocks();
  });

  it("binds MFA enrollment challenge to user and expires it", () => {
    const issuedAt = new Date("2026-09-09T15:00:00.000Z");
    const challenge = createMfaSetupChallenge("user-a", "SECRET123", issuedAt);
    expect(openMfaSetupChallenge(challenge, "user-a", new Date(issuedAt.getTime() + 60_000))?.secret).toBe("SECRET123");
    expect(openMfaSetupChallenge(challenge, "user-b", new Date(issuedAt.getTime() + 60_000))).toBeNull();
    expect(openMfaSetupChallenge(challenge, "user-a", new Date(issuedAt.getTime() + MFA_SETUP_CHALLENGE_TTL_MS + 1))).toBeNull();
    expect(openMfaSetupChallenge(`${challenge}tampered`, "user-a", issuedAt)).toBeNull();
  });

  it("stores recovery factors as hashes and consumes once", async () => {
    let value: string | null = null;
    const config = {
      upsert: async (args: { create: { value: string }; update: { value?: string } }) => {
        if (value === null) value = args.create.value;
        else if (typeof args.update.value === "string") value = args.update.value;
        return { key: "x", value };
      },
      updateMany: async () => ({ count: value === null ? 0 : 1 }),
      findUnique: async () => value === null ? null : ({ key: "x", value }),
      update: async (args: { data: { value: string } }) => {
        value = args.data.value;
        return { key: "x", value };
      },
      deleteMany: async () => ({ count: 1 }),
    };
    const tx = { systemConfig: config } as never;
    const [code] = generateMfaRecoveryCodes(1);
    expect(isRecoveryCode(code)).toBe(true);
    await replaceMfaRecoveryCodes(tx, "user-a", [code]);
    expect(value).not.toContain(normalizeRecoveryCode(code));
    expect(await consumeMfaRecoveryCode(tx, "user-a", code)).toBe(true);
    expect(await consumeMfaRecoveryCode(tx, "user-a", code)).toBe(false);
  });

  it("rejects repeated TOTP consumption within replay horizon", async () => {
    let value: string | null = null;
    const config = {
      upsert: async (args: { create: { value: string } }) => {
        if (value === null) value = args.create.value;
        return { key: "totp", value };
      },
      findUnique: async () => value === null ? null : ({ key: "totp", value }),
      update: async (args: { data: { value: string } }) => {
        value = args.data.value;
        return { key: "totp", value };
      },
      deleteMany: async () => ({ count: 1 }),
    };
    const tx = { systemConfig: config } as never;
    const at = new Date("2026-09-09T15:00:00.000Z");
    expect(await consumeVerifiedMfaTotp(tx, "u", "123456", at)).toBe(true);
    expect(await consumeVerifiedMfaTotp(tx, "u", "123456", new Date(at.getTime() + 10_000))).toBe(false);
  });

  it("uses HIBP k-anonymity: only the SHA-1 prefix leaves the process", async () => {
    const password = "very-long-unique-password-value";
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/);
      expect(url).not.toContain(password);
      return new Response("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0\r\n", { status: 200 });
    });
    expect(await queryPwnedPasswordCount(password, fetchMock as never)).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects short, contextual, breached and unverifiable new passwords", async () => {
    expect((await validatePasswordPolicy("x".repeat(PASSWORD_MIN_LENGTH - 1), {}, vi.fn() as never)).ok).toBe(false);

    const clean = vi.fn(async () => new Response("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0\r\n", { status: 200 }));
    const contextual = await validatePasswordPolicy("geanky-is-my-account-password", { email: "geanky@example.com" }, clean as never);
    expect(contextual.ok).toBe(false);

    const compromised = vi.fn(async () => {
      const digest = await import("node:crypto").then(({ createHash }) => createHash("sha1").update("this-password-is-breached").digest("hex").toUpperCase());
      return new Response(`${digest.slice(5)}:42\r\n`, { status: 200 });
    });
    expect((await validatePasswordPolicy("this-password-is-breached", {}, compromised as never)).ok).toBe(false);

    const unavailable = vi.fn(async () => { throw new Error("offline"); });
    const result = await validatePasswordPolicy("unique-long-password-2026", {}, unavailable as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("breach_check_unavailable");
  });
});

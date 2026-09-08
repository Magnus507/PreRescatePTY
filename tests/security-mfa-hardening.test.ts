import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  countRemainingMfaRecoveryCodes,
  consumeMfaRecoveryCode,
  generateMfaRecoveryCodes,
  hashMfaRecoveryCode,
  isRecoveryCode,
  normalizeRecoveryCode,
  replaceMfaRecoveryCodes,
} from "@/domains/users/services/mfa.service";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("MFA and security hardening", () => {
  it("generates high-entropy one-time recovery codes and never hashes formatting", () => {
    const codes = generateMfaRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) {
      expect(isRecoveryCode(code)).toBe(true);
      expect(normalizeRecoveryCode(code)).toMatch(/^[A-F0-9]{20}$/);
      expect(hashMfaRecoveryCode(code)).toMatch(/^[a-f0-9]{64}$/);
      expect(hashMfaRecoveryCode(code)).not.toContain(normalizeRecoveryCode(code));
    }
  });

  it("serializes recovery codes as hashes and consumes each code only once", async () => {
    let value: string | null = null;
    const config = {
      upsert: async (args: { create: { value: string }; update: { value: string } }) => {
        value = value === null ? args.create.value : args.update.value;
        return { key: "x", value };
      },
      updateMany: async () => ({ count: value === null ? 0 : 1 }),
      findUnique: async () => value === null ? null : ({ key: "x", value }),
      update: async (args: { data: { value: string } }) => {
        value = args.data.value;
        return { key: "x", value };
      },
      deleteMany: async () => {
        const count = value === null ? 0 : 1;
        value = null;
        return { count };
      },
    };
    const tx = { systemConfig: config } as never;
    const codes = generateMfaRecoveryCodes(2);

    await replaceMfaRecoveryCodes(tx, "user-1", codes);
    expect(value).not.toContain(normalizeRecoveryCode(codes[0]));
    expect(await countRemainingMfaRecoveryCodes(tx, "user-1")).toBe(2);
    expect(await consumeMfaRecoveryCode(tx, "user-1", codes[0])).toBe(true);
    expect(await consumeMfaRecoveryCode(tx, "user-1", codes[0])).toBe(false);
    expect(await countRemainingMfaRecoveryCodes(tx, "user-1")).toBe(1);
  });

  it("fails closed for inconsistent MFA and permits recovery-code login", () => {
    const auth = source("lib/auth.ts");
    expect(auth).toContain("if (user.mfaEnabled || user.mfaSecret)");
    expect(auth).toContain("MFA_CONFIGURATION_ERROR");
    expect(auth).toContain("consumeMfaRecoveryCode");
    expect(auth).toContain('rateLimit("login:mfa"');
    expect(auth).not.toContain("user.mfaEnabled && user.mfaSecret");
  });

  it("requires MFA before privileged admin APIs but leaves enrollment reachable", () => {
    const rbac = source("lib/rbac.ts");
    expect(rbac).toContain("MFA_ENROLLMENT_REQUIRED");
    expect(rbac).toContain("!fresh.current.mfaEnabled || !fresh.current.mfaSecret");
    expect(rbac).toContain('setupUrl: "/admin/security/mfa"');
    expect(rbac).toContain("export async function requireFreshSession");
  });

  it("enables MFA only after password + TOTP proof, stores encrypted challenge and revokes sessions", () => {
    const setup = source("app/api/users/security/mfa/setup/route.ts");
    const enable = source("app/api/users/security/mfa/enable/route.ts");
    const disable = source("app/api/users/security/mfa/disable/route.ts");

    expect(setup).toContain("bcrypt.compare");
    expect(setup).toContain("encrypt(secret)");
    expect(enable).toContain("verifyMfaToken");
    expect(enable).toContain("replaceMfaRecoveryCodes");
    expect(enable).toContain("sessionVersion: { increment: 1 }");
    expect(disable).toContain("consumeMfaRecoveryCode");
    expect(disable).toContain("sessionVersion: { increment: 1 }");
  });

  it("safe deletion redacts commercial projections, draft invoices, outbox snapshots and MFA recovery artifacts", () => {
    const safeDelete = source("domains/users/services/safe-delete.service.ts");
    expect(safeDelete).toContain("operationCommercialOrder.updateMany");
    expect(safeDelete).toContain('status: { in: ["pending_configuration", "pending_issue"] }');
    expect(safeDelete).toContain("commerceOrderSyncOutbox.updateMany");
    expect(safeDelete).toContain("checkoutSessionJson: null");
    expect(safeDelete).toContain("security:mfa:recovery:");
    expect(safeDelete).toContain("sessionVersion: { increment: 1 }");
    expect(safeDelete).not.toContain('DELETE FROM "MfaRecoveryCode"');
  });
});

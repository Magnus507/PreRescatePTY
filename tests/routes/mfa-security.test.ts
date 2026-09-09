import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireFreshSession: vi.fn(),
  rateLimit: vi.fn(),
  getClientIp: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdateMany: vi.fn(),
  transaction: vi.fn(),
  bcryptCompare: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  getAuditRequestId: vi.fn(),
  writeAuditLog: vi.fn(),
  buildMfaProvisioningUri: vi.fn(),
  createMfaSetupChallenge: vi.fn(),
  generateMfaSecret: vi.fn(),
  consumeVerifiedMfaTotp: vi.fn(),
  generateMfaRecoveryCodes: vi.fn(),
  openMfaSetupChallenge: vi.fn(),
  replaceMfaRecoveryCodes: vi.fn(),
  verifyMfaToken: vi.fn(),
  consumeMfaRecoveryCode: vi.fn(),
  deleteMfaSecurityArtifacts: vi.fn(),
  isRecoveryCode: vi.fn(),
}));

const tx = {
  user: { updateMany: mocks.userUpdateMany },
  systemConfig: {},
  auditLog: {},
};

vi.mock("@/lib/rbac", () => ({ requireFreshSession: mocks.requireFreshSession }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/request-ip", () => ({ getClientIp: mocks.getClientIp }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.bcryptCompare } }));
vi.mock("@/lib/encryption", () => ({ encrypt: mocks.encrypt, decrypt: mocks.decrypt }));
vi.mock("@/lib/audit", () => ({
  getAuditRequestId: mocks.getAuditRequestId,
  writeAuditLog: mocks.writeAuditLog,
}));
vi.mock("@/domains/users/services/mfa.service", () => ({
  buildMfaProvisioningUri: mocks.buildMfaProvisioningUri,
  createMfaSetupChallenge: mocks.createMfaSetupChallenge,
  generateMfaSecret: mocks.generateMfaSecret,
  consumeVerifiedMfaTotp: mocks.consumeVerifiedMfaTotp,
  generateMfaRecoveryCodes: mocks.generateMfaRecoveryCodes,
  openMfaSetupChallenge: mocks.openMfaSetupChallenge,
  replaceMfaRecoveryCodes: mocks.replaceMfaRecoveryCodes,
  verifyMfaToken: mocks.verifyMfaToken,
  consumeMfaRecoveryCode: mocks.consumeMfaRecoveryCode,
  deleteMfaSecurityArtifacts: mocks.deleteMfaSecurityArtifacts,
  isRecoveryCode: mocks.isRecoveryCode,
}));

import { POST as setupMfa } from "@/app/api/users/security/mfa/setup/route";
import { POST as enableMfa } from "@/app/api/users/security/mfa/enable/route";
import { POST as disableMfa } from "@/app/api/users/security/mfa/disable/route";

const session = {
  user: { id: "admin-1", role: "superadmin", accountId: "account-1", sessionVersion: 7 },
  expires: "2099-01-01T00:00:00.000Z",
};

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function setupUser() {
  return {
    id: "admin-1",
    email: "admin@example.test",
    accountId: "account-1",
    passwordHash: "hashed-password",
    mfaEnabled: false,
    mfaSecret: null,
    status: "active",
    deletedAt: null,
  };
}

function enabledUser() {
  return {
    ...setupUser(),
    mfaEnabled: true,
    mfaSecret: "encrypted-secret",
  };
}

describe("Block 2 MFA route matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFreshSession.mockResolvedValue({ authorized: true, session, current: {} });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.encrypt.mockReturnValue("encrypted-secret");
    mocks.decrypt.mockReturnValue("totp-secret");
    mocks.getAuditRequestId.mockReturnValue("request-1");
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.generateMfaSecret.mockReturnValue("totp-secret");
    mocks.createMfaSetupChallenge.mockReturnValue("challenge-token");
    mocks.buildMfaProvisioningUri.mockReturnValue("otpauth://totp/PreRescatePTY:test");
    mocks.openMfaSetupChallenge.mockReturnValue({ userId: "admin-1", secret: "totp-secret" });
    mocks.verifyMfaToken.mockReturnValue(true);
    mocks.generateMfaRecoveryCodes.mockReturnValue(["RECOVERY-ONE", "RECOVERY-TWO"]);
    mocks.consumeVerifiedMfaTotp.mockResolvedValue(true);
    mocks.consumeMfaRecoveryCode.mockResolvedValue(true);
    mocks.replaceMfaRecoveryCodes.mockResolvedValue(undefined);
    mocks.deleteMfaSecurityArtifacts.mockResolvedValue(undefined);
    mocks.isRecoveryCode.mockReturnValue(false);
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  });

  it("DENY: setup without current password", async () => {
    const response = await setupMfa(request("/api/users/security/mfa/setup", {}));
    expect(response.status).toBe(400);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("DENY: setup with bad current password", async () => {
    mocks.userFindUnique.mockResolvedValue(setupUser());
    mocks.bcryptCompare.mockResolvedValue(false);
    const response = await setupMfa(request("/api/users/security/mfa/setup", { currentPassword: "wrong" }));
    expect(response.status).toBe(403);
  });

  it("PASS: setup with valid current password", async () => {
    mocks.userFindUnique.mockResolvedValue(setupUser());
    const response = await setupMfa(request("/api/users/security/mfa/setup", { currentPassword: "correct" }));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ challenge: "challenge-token", provisioningUri: expect.stringContaining("otpauth://") });
  });

  it("DENY: enable with invalid TOTP", async () => {
    mocks.userFindUnique.mockResolvedValue(setupUser());
    mocks.verifyMfaToken.mockReturnValue(false);
    const response = await enableMfa(request("/api/users/security/mfa/enable", {
      currentPassword: "correct",
      challenge: "challenge-token",
      code: "000000",
    }));
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("PASS: enable with valid TOTP and revoke the prior session", async () => {
    mocks.userFindUnique.mockResolvedValue(setupUser());
    const response = await enableMfa(request("/api/users/security/mfa/enable", {
      currentPassword: "correct",
      challenge: "challenge-token",
      code: "123456",
    }));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ success: true, sessionRevoked: true });
    expect(mocks.consumeVerifiedMfaTotp).toHaveBeenCalledWith(tx, "admin-1", "123456");
    expect(mocks.userUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sessionVersion: { increment: 1 }, mfaEnabled: true }),
    }));
  });

  it("DENY: enrollment TOTP reuse", async () => {
    mocks.userFindUnique.mockResolvedValue(setupUser());
    mocks.consumeVerifiedMfaTotp.mockResolvedValue(false);
    const response = await enableMfa(request("/api/users/security/mfa/enable", {
      currentPassword: "correct",
      challenge: "challenge-token",
      code: "123456",
    }));
    expect(response.status).toBe(400);
  });

  it("DENY: disable without password/factor", async () => {
    const response = await disableMfa(request("/api/users/security/mfa/disable", {}));
    expect(response.status).toBe(400);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("DENY: disable with invalid TOTP", async () => {
    mocks.userFindUnique.mockResolvedValue(enabledUser());
    mocks.verifyMfaToken.mockReturnValue(false);
    const response = await disableMfa(request("/api/users/security/mfa/disable", {
      currentPassword: "correct",
      code: "000000",
    }));
    expect(response.status).toBe(400);
  });

  it("PASS once / DENY reuse: recovery code consumption", async () => {
    mocks.userFindUnique.mockResolvedValue(enabledUser());
    mocks.isRecoveryCode.mockReturnValue(true);
    mocks.consumeMfaRecoveryCode.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const first = await disableMfa(request("/api/users/security/mfa/disable", {
      currentPassword: "correct",
      code: "RECOVERY-ONE",
    }));
    const second = await disableMfa(request("/api/users/security/mfa/disable", {
      currentPassword: "correct",
      code: "RECOVERY-ONE",
    }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
  });

  it("FAIL CLOSED: degraded factor backend never disables MFA", async () => {
    mocks.userFindUnique.mockResolvedValue(enabledUser());
    mocks.transaction.mockRejectedValue(new Error("database unavailable"));
    const response = await disableMfa(request("/api/users/security/mfa/disable", {
      currentPassword: "correct",
      code: "123456",
    }));
    expect(response.status).toBe(500);
    expect(mocks.userUpdateMany).not.toHaveBeenCalled();
  });
});

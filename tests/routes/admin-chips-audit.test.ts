import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findUnique: vi.fn(),
  chipCreate: vi.fn(),
  chipUpdate: vi.fn(),
  chipDelete: vi.fn(),
  tokenCreate: vi.fn(),
  notificationCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  invalidateCache: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  GENERAL_ADMIN_ROLES: ["admin", "superadmin"],
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chip: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/identifiers", () => ({
  getBatchUniqueShortCodes: vi.fn().mockResolvedValue(["SHORT-1"]),
  getBatchUniqueSerialPublics: vi.fn().mockResolvedValue(["SERIAL-1"]),
  getBatchUniqueActivationCodes: vi.fn().mockResolvedValue(["ACTIVATION-SECRET"]),
}));

vi.mock("@/domains/chips/activation-code.service", () => ({
  hashActivationCode: vi.fn((value: string) => `hash:${value}`),
  protectActivationCode: vi.fn(() => ({
    activationCode: "protected-value",
    activationCodeHash: "activation-hash",
    activationCodeLast4: "CRET",
  })),
  revealActivationCode: vi.fn((value: string) => value),
}));

vi.mock("@/lib/constants", () => ({ SITE_URL: "https://example.test" }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/domains/accounts/services/account-state.service", () => ({
  AccountStateService: { invalidateCache: mocks.invalidateCache },
}));

import { POST as createChipBatch } from "@/app/api/admin/chips/route";
import { PATCH as updateChip } from "@/app/api/admin/chips/[chipId]/route";

function request(path: string, method: string, body: unknown) {
  return new NextRequest(`https://example.test${path}`, {
    method,
    headers: { "x-vercel-id": "iad1::audit-chip" },
    body: JSON.stringify(body),
  });
}

describe("admin chip mutation audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin-1", accountId: "admin-account" } },
    });
    mocks.findUnique.mockResolvedValue({
      accountId: "owner-account",
      ownerUserId: "owner-1",
      shortCode: "SHORT-1",
      status: "activated",
      serviceStatus: "active",
      assignedProfileId: "profile-1",
      isPhysical: true,
    });
    mocks.chipCreate.mockResolvedValue({
      id: "chip-1",
      nfcUrl: "https://example.test/e/SHORT-1?source=nfc",
      qrUrl: "/api/public/qr?data=SHORT-1",
    });
    mocks.chipUpdate.mockResolvedValue({
      id: "chip-1",
      accountId: "owner-account",
      ownerUserId: "owner-1",
      shortCode: "SHORT-1",
      status: "damaged",
      serviceStatus: "inactive",
      assignedProfileId: null,
      isPhysical: true,
    });
    mocks.chipDelete.mockResolvedValue({ id: "chip-1" });
    mocks.tokenCreate.mockResolvedValue({ id: "token-1" });
    mocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.invalidateCache.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      chip: { create: mocks.chipCreate, update: mocks.chipUpdate, delete: mocks.chipDelete },
      chipClaimToken: { create: mocks.tokenCreate },
      appNotification: { create: mocks.notificationCreate },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("creates a batch and its audit evidence in one transaction without logging activation codes", async () => {
    const response = await createChipBatch(request("/api/admin/chips", "POST", {
      count: 1,
      batchId: "BATCH-1",
      productType: "sticker_nfc_qr",
    }));

    expect(response.status).toBe(201);
    const auditData = mocks.auditCreate.mock.calls[0][0].data;
    expect(auditData).toEqual(expect.objectContaining({
      actorUserId: "admin-1",
      entityType: "ChipBatch",
      entityId: "BATCH-1",
      action: "chip_batch_created",
      requestId: "iad1::audit-chip",
    }));
    expect(auditData.newValuesJson).toContain('"chipIds":["chip-1"]');
    expect(auditData.newValuesJson).not.toContain("ACTIVATION-SECRET");
    expect(auditData.newValuesJson).not.toContain("protected-value");
  });

  it("does not report a created batch when audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await createChipBatch(request("/api/admin/chips", "POST", {
      count: 1,
      batchId: "BATCH-1",
    }));

    expect(response.status).toBe(500);
  });

  it("updates a chip, releases quota, notifies, and audits in one transaction", async () => {
    const response = await updateChip(
      request("/api/admin/chips/chip-1", "PATCH", { status: "damaged" }),
      { params: Promise.resolve({ chipId: "chip-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.chipUpdate).toHaveBeenCalledWith({
      where: { id: "chip-1" },
      data: { status: "damaged", assignedProfileId: null, serviceStatus: "inactive" },
    });
    expect(mocks.notificationCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "chip_updated", entityId: "chip-1" }),
    });
    expect(mocks.invalidateCache).toHaveBeenCalledWith("owner-1");
  });

  it("does not invalidate cached account state or report success if audit persistence fails", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("AUDIT_FAILED"));
    const response = await updateChip(
      request("/api/admin/chips/chip-1", "PATCH", { status: "damaged" }),
      { params: Promise.resolve({ chipId: "chip-1" }) },
    );

    expect(response.status).toBe(500);
    expect(mocks.invalidateCache).not.toHaveBeenCalled();
  });

  it("deletes virgin inventory and its audit record atomically", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({
        accountId: null,
        ownerUserId: null,
        shortCode: "SHORT-1",
        status: "inventory",
        serviceStatus: "inactive",
        assignedProfileId: null,
        isPhysical: true,
      })
      .mockResolvedValueOnce({
        id: "chip-1",
        status: "inventory",
        ownerUserId: null,
        assignedProfileId: null,
        serviceStartDate: null,
        serviceEndDate: null,
        activatedAt: null,
        pointOfSaleId: null,
        consignedAt: null,
        _count: { claimTokens: 0, scanEvents: 0, notifications: 0 },
      });

    const response = await updateChip(
      request("/api/admin/chips/chip-1", "PATCH", { delete: true }),
      { params: Promise.resolve({ chipId: "chip-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.chipDelete).toHaveBeenCalledWith({ where: { id: "chip-1" } });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "chip_deleted", entityId: "chip-1" }),
    });
  });
});

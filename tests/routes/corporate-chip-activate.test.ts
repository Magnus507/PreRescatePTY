import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock("@/lib/rbac", () => ({
  requireActiveAccountSession: vi.fn().mockResolvedValue({
    authorized: true,
    session: { user: { id: "user-1" } },
  }),
}));
vi.mock("@/domains/accounts/services/account-state.service", () => ({
  AccountStateService: {
    getAccountState: vi.fn().mockResolvedValue({
      accountId: "account-1",
      serviceStatus: "active",
      serviceDurationMonths: 24,
    }),
    invalidateCache: vi.fn().mockResolvedValue(undefined),
    isMedicalProfileComplete: vi.fn().mockReturnValue(true),
  },
}));

import { POST } from "@/app/api/organizations/corporate-chip/activate/route";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

function request() {
  return new NextRequest("http://localhost/api/organizations/corporate-chip/activate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ activationCode: "CORP-1234" }),
  });
}

function arrangeHappyPath() {
  const chip = {
    id: "chip-1",
    status: "inventory",
    shortCode: "SHORT-1",
    internalLabel: "FG-001",
  };
  mockPrisma.chipClaimToken.findFirst.mockResolvedValue({
    id: "token-1",
    chipId: chip.id,
    usedAt: null,
    expiresAt: new Date("2099-01-01"),
    chip,
  } as never);
  mockPrisma.profile.findUnique
    .mockResolvedValueOnce({ id: "profile-1", accountId: "account-1" } as never)
    .mockResolvedValueOnce({
      id: "corporate-profile-1",
      accountId: "account-1",
      profileType: "corporate",
      firstName: "Ana",
      lastName: "Empresa",
      bloodType: "O+",
    } as never);
  mockPrisma.organizationMember.findFirst.mockResolvedValue({
    id: "member-1",
    corporateProfileId: "corporate-profile-1",
    corporateStatus: "paid_active",
  } as never);
  mockPrisma.corporateOrderEmployeeItem.findFirst
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({
      id: "employee-item-1",
      organizationMemberId: "member-1",
      fulfillmentStatus: "delivered",
      chipId: null,
    } as never);
  mockPrisma.account.findUnique.mockResolvedValue({
    id: "account-1",
    maxChipsAllocated: 3,
  } as never);
  mockPrisma.chip.count.mockResolvedValue(0 as never);
  mockPrisma.chipClaimToken.updateMany.mockResolvedValue({ count: 1 } as never);
  mockPrisma.chip.updateMany.mockResolvedValue({ count: 1 } as never);
  mockPrisma.corporateOrderEmployeeItem.update.mockResolvedValue({} as never);
  mockPrisma.operationFinishedGoodUnit.findUnique.mockResolvedValue({
    id: "unit-1",
    status: "delivered",
    qaStatus: "passed",
    activationStatus: "not_activated",
    activationReferenceType: null,
    activationReferenceId: null,
  } as never);
  mockPrisma.operationFinishedGoodUnit.updateMany.mockResolvedValue({ count: 1 } as never);
  mockPrisma.operationFinishedGoodUnitEvent.create.mockResolvedValue({ id: "event-1" } as never);
  mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" } as never);
}

describe("POST /api/organizations/corporate-chip/activate", () => {
  beforeEach(() => {
    resetAllMocks();
    arrangeHappyPath();
  });

  it("activates the chip, corporate item and physical unit in the same transaction", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.chip.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.corporateOrderEmployeeItem.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.operationFinishedGoodUnit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "unit-1", activationStatus: "not_activated" }),
        data: expect.objectContaining({
          status: "activated",
          activationReferenceType: "corporate_chip_activation",
          activationReferenceId: "chip-1",
        }),
      })
    );
    expect(mockPrisma.operationFinishedGoodUnitEvent.create).toHaveBeenCalledTimes(1);
    expect(AccountStateService.invalidateCache).toHaveBeenCalledWith("user-1");
  });

  it("does not report success when the physical unit cannot be claimed", async () => {
    mockPrisma.operationFinishedGoodUnit.updateMany.mockResolvedValue({ count: 0 } as never);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/unidad física/i);
    expect(mockPrisma.operationFinishedGoodUnitEvent.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    expect(AccountStateService.invalidateCache).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockDeleteStorageObjects = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/storage-deletion", () => ({
  parseStorageObjectRef: vi.fn((value: string | null) => {
    if (!value) return null;
    return value.includes("payment-proofs")
      ? { bucket: "payment-proofs", path: "payments/user-1/proof.webp" }
      : { bucket: "profile-photos", path: "user-1/profile.webp" };
  }),
  deleteStorageObjects: mockDeleteStorageObjects,
}));

import { SafeDeleteService } from "@/domains/users/services/safe-delete.service";

const USER_ID = "user-1";
const ACCOUNT_ID = "account-1";
const PROFILE_ID = "profile-1";
const EMAIL = "user@example.com";

function setupUser() {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: USER_ID,
    email: EMAIL,
    accountId: ACCOUNT_ID,
    account: { id: ACCOUNT_ID },
    profile: { id: PROFILE_ID, photoUrl: "/api/image-proxy?bucket=profile-photos&path=user-1/profile.webp" },
    chips: [{ id: "chip-1" }],
    orders: [{ id: "order-1", paymentProofUrl: "/api/image-proxy?bucket=payment-proofs&path=payments/user-1/proof.webp" }],
  } as never);
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<boolean>) => callback(mockPrisma));
  mockDeleteStorageObjects.mockResolvedValue(undefined);
}

describe("SafeDeleteService.deleteUserAccount", () => {
  beforeEach(() => {
    resetAllMocks();
    mockDeleteStorageObjects.mockReset();
    setupUser();
  });

  it("returns false when the user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes profile photos and payment proofs before anonymizing database references", async () => {
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(true);
    expect(mockDeleteStorageObjects).toHaveBeenCalledWith(expect.arrayContaining([
      { bucket: "profile-photos", path: "user-1/profile.webp" },
      { bucket: "payment-proofs", path: "payments/user-1/proof.webp" },
    ]));
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: USER_ID },
      data: expect.objectContaining({
        customerEmail: null,
        customerPhone: null,
        shippingAddress: null,
        paymentProofUrl: null,
      }),
    }));
  });

  it("removes contacts, consent evidence, scans, alerts and claim tokens", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);
    expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    expect(mockPrisma.consent.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.scanEvent.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.any(Array) }),
    }));
    expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({ where: { chipId: { in: ["chip-1"] } } });
    expect(mockPrisma.chipClaimToken.deleteMany).toHaveBeenCalledWith({ where: { chipId: { in: ["chip-1"] } } });
    expect(mockPrisma.appNotification.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { email: EMAIL } });
  });

  it("wipes every sensitive medical, insurance and location field", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);
    expect(mockPrisma.profile.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: PROFILE_ID },
      data: expect.objectContaining({
        allergies: "",
        chronicConditions: "",
        medications: "",
        nationalId: null,
        birthDate: null,
        lastScanLocation: null,
        insuranceProvider: null,
        insurancePolicyNumber: null,
        safeReturnAddress: null,
        safeReturnLat: null,
        safeReturnLng: null,
        profileVisibilityStatus: "deleted",
      }),
    }));
  });

  it("unlinks chips and invalidates credentials and sessions", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);
    expect(mockPrisma.chip.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerUserId: USER_ID },
      data: { ownerUserId: null, assignedProfileId: null, status: "deactivated" },
    }));
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: USER_ID },
      data: expect.objectContaining({
        status: "deleted",
        email: `deleted_${USER_ID}@prerescate.invalid`,
        phone: null,
        mfaEnabled: false,
        mfaSecret: null,
        sessionVersion: { increment: 1 },
      }),
    }));
  });

  it("keeps an audit fact without retaining the deleted email", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);
    const data = mockPrisma.auditLog.create.mock.calls[0][0].data;
    expect(data.action).toBe("HARD_DELETE_REQUESTED_BY_USER");
    expect(data.oldValuesJson).not.toContain(EMAIL);
  });

  it("does not anonymize the database if storage deletion fails", async () => {
    mockDeleteStorageObjects.mockRejectedValue(new Error("storage unavailable"));
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("returns false when the database transaction fails", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("transaction failed"));
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
  });
});

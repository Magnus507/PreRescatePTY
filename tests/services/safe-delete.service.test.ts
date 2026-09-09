import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../helpers/mock-prisma";
import { resetAllMocks } from "../helpers/reset-mocks";

const mockProcessStorageCleanupOutbox = vi.hoisted(() => vi.fn());
const mockEraseMatchingSupabaseAuthIdentity = vi.hoisted(() => vi.fn());
const mockListUserScopedStorageRefs = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage-cleanup-outbox", () => ({ processStorageCleanupOutbox: mockProcessStorageCleanupOutbox }));
vi.mock("@/lib/privacy/supabase-auth-erasure", () => ({
  eraseMatchingSupabaseAuthIdentity: mockEraseMatchingSupabaseAuthIdentity,
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/storage-deletion", () => ({
  parseStorageObjectRef: vi.fn((value: string | null) => {
    if (!value) return null;
    return value.includes("payment-proofs")
      ? { bucket: "payment-proofs", path: "payments/user-1/proof.webp" }
      : { bucket: "profile-photos", path: "user-1/profile.webp" };
  }),
  listUserScopedStorageRefs: mockListUserScopedStorageRefs,
  deleteStorageObjects: mockProcessStorageCleanupOutbox,
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
    account: { id: ACCOUNT_ID, ownerUserId: null },
    profile: {
      id: PROFILE_ID,
      accountId: ACCOUNT_ID,
      photoUrl: "/api/image-proxy?bucket=profile-photos&path=user-1/profile.webp",
    },
    orders: [
      {
        id: "order-1",
        paymentProofUrl: "/api/image-proxy?bucket=payment-proofs&path=payments/user-1/proof.webp",
      },
    ],
  } as never);
  mockPrisma.chip.findMany.mockResolvedValue([{ id: "chip-1" }] as never);
  mockPrisma.$transaction.mockImplementation(
    async (callback: (tx: typeof mockPrisma) => Promise<boolean>) => callback(mockPrisma),
  );
  mockProcessStorageCleanupOutbox.mockResolvedValue(undefined);
  mockEraseMatchingSupabaseAuthIdentity.mockResolvedValue({ matched: true, deleted: true });
  mockListUserScopedStorageRefs.mockResolvedValue([]);
}

describe("SafeDeleteService.deleteUserAccount", () => {
  beforeEach(() => {
    resetAllMocks();
    mockProcessStorageCleanupOutbox.mockReset();
    mockEraseMatchingSupabaseAuthIdentity.mockReset();
    mockListUserScopedStorageRefs.mockReset();
    setupUser();
  });

  it("returns false when the user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockEraseMatchingSupabaseAuthIdentity).not.toHaveBeenCalled();
    expect(mockListUserScopedStorageRefs).not.toHaveBeenCalled();
  });

  it("resolves the same subject in Supabase Auth before destroying the application email", async () => {
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(true);
    expect(mockEraseMatchingSupabaseAuthIdentity).toHaveBeenCalledWith(EMAIL);
    expect(mockListUserScopedStorageRefs).toHaveBeenCalledWith(USER_ID);
    expect(mockEraseMatchingSupabaseAuthIdentity.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrisma.user.update.mock.invocationCallOrder[0],
    );
  });

  it("fails closed before the database tombstone when the parallel auth store cannot be erased", async () => {
    mockEraseMatchingSupabaseAuthIdentity.mockRejectedValue(new Error("auth unavailable"));
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("fails closed before the database tombstone when user storage cannot be enumerated", async () => {
    mockListUserScopedStorageRefs.mockRejectedValue(new Error("storage unavailable"));
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("durably queues referenced and discovered user storage without copying subject IDs into cleanup metadata", async () => {
    mockListUserScopedStorageRefs.mockResolvedValue([
      { bucket: "general", path: "user-1/orphan.webp" },
    ]);
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(true);
    expect(mockPrisma.storageCleanupOutbox.upsert).toHaveBeenCalledTimes(3);
    expect(mockPrisma.storageCleanupOutbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          bucket: "profile-photos",
          path: "user-1/profile.webp",
          actorUserId: null,
          accountId: null,
        }),
      }),
    );
    expect(mockPrisma.storageCleanupOutbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          bucket: "general",
          path: "user-1/orphan.webp",
          actorUserId: null,
          accountId: null,
        }),
      }),
    );
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["order-1"] } },
        data: expect.objectContaining({
          userId: null,
          customerEmail: null,
          customerPhone: null,
          shippingAddress: null,
          paymentProofUrl: null,
        }),
      }),
    );
  });

  it("removes profile-contact edges, subject contacts, consent, scans, passes and chip credentials", async () => {
    mockPrisma.profileContact.findMany
      .mockResolvedValueOnce([{ contactId: "contact-1" }] as never)
      .mockResolvedValueOnce([] as never);

    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);

    expect(mockPrisma.profileContact.deleteMany).toHaveBeenCalledWith({
      where: { profileId: { in: [PROFILE_ID] } },
    });
    expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["contact-1"] } },
    });
    expect(mockPrisma.consent.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.digitalPass.deleteMany).toHaveBeenCalledWith({
      where: { profileId: { in: [PROFILE_ID] } },
    });
    expect(mockPrisma.scanEvent.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
    expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { chipId: { in: ["chip-1"] } },
    });
    expect(mockPrisma.chipClaimToken.deleteMany).toHaveBeenCalledWith({
      where: { chipId: { in: ["chip-1"] } },
    });
    expect(mockPrisma.appNotification.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { email: EMAIL } });
  });

  it("preserves a contact still linked to an unaffected profile", async () => {
    mockPrisma.profileContact.findMany
      .mockResolvedValueOnce([{ contactId: "shared-contact" }] as never)
      .mockResolvedValueOnce([{ contactId: "shared-contact" }] as never);

    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);

    expect(mockPrisma.contact.deleteMany).not.toHaveBeenCalledWith({
      where: { id: { in: ["shared-contact"] } },
    });
  });

  it("wipes every sensitive profile and corporate-member projection", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);

    expect(mockPrisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROFILE_ID },
        data: expect.objectContaining({
          userId: null,
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
      }),
    );
    expect(mockPrisma.organizationMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: { in: [PROFILE_ID] } },
        data: expect.objectContaining({
          memberStatus: "deleted",
          medicalRestrictions: null,
          occupationalRisks: [],
          employeeNationalId: null,
          employeePhone: null,
          supervisorName: null,
          supervisorPhone: null,
          corporateProfileId: null,
        }),
      }),
    );
  });

  it("finds chips by owner OR erased profile, then unlinks and deactivates the full set", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);

    expect(mockPrisma.chip.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { ownerUserId: USER_ID },
          { assignedProfileId: { in: [PROFILE_ID] } },
        ],
      },
      select: { id: true },
    });
    expect(mockPrisma.chip.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["chip-1"] } },
        data: expect.objectContaining({
          ownerUserId: null,
          assignedProfileId: null,
          lastScanAt: null,
          lastScanLocation: null,
          status: "deactivated",
        }),
      }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({
          status: "deleted",
          phone: null,
          mfaEnabled: false,
          mfaSecret: null,
          sessionVersion: { increment: 1 },
        }),
      }),
    );
    const anonymizedEmail = mockPrisma.user.update.mock.calls[0][0].data.email;
    expect(anonymizedEmail).toMatch(/^deleted_erasure_[0-9a-f]{32}@prerescate\.invalid$/);
    expect(anonymizedEmail).not.toContain(USER_ID);
  });

  it("removes subject-linked JSON snapshots instead of relying on key blacklists", async () => {
    mockPrisma.operationCommercialOrder.findMany.mockResolvedValue([
      { id: "op-order-1", dispatchId: "dispatch-1" },
    ] as never);
    mockPrisma.operationDispatchEvent.findMany.mockResolvedValue([
      { dispatchId: "dispatch-1" },
    ] as never);
    mockPrisma.paymentAttempt.findMany.mockResolvedValue([
      { id: "payment-attempt-1" },
    ] as never);

    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);

    expect(mockPrisma.operationCommercialOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["op-order-1"] } },
        data: expect.objectContaining({
          customerEmail: null,
          customerPhone: null,
          customerReference: null,
          notes: null,
        }),
      }),
    );
    expect(mockPrisma.operationDispatch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["dispatch-1"] } },
        data: expect.objectContaining({
          destinationName: null,
          destinationAddress: null,
          notes: null,
        }),
      }),
    );
    expect(mockPrisma.operationDispatchEvent.updateMany).toHaveBeenCalledWith({
      where: { dispatchId: { in: ["dispatch-1"] } },
      data: { metadataJson: null, reason: null },
    });
    expect(mockPrisma.operationCommercialOrderEvent.updateMany).toHaveBeenCalledWith({
      where: { commercialOrderId: { in: ["op-order-1"] } },
      data: { metadataJson: null, reason: null },
    });
    expect(mockPrisma.paymentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { checkoutSessionJson: null } }),
    );
    expect(mockPrisma.paymentEvent.updateMany).toHaveBeenCalledWith({
      where: { paymentAttemptId: { in: ["payment-attempt-1"] } },
      data: { payloadJson: "{}" },
    });
    expect(mockPrisma.commerceOrderSyncOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sourceId: { in: ["order-1"] } },
        data: expect.objectContaining({
          payloadVersion: 2,
          payloadJson: expect.not.stringContaining("sentinel"),
        }),
      }),
    );
    expect(mockPrisma.auditLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { oldValuesJson: null, newValuesJson: null, actorUserId: null },
      }),
    );
  });

  it("strips warranty, return and replacement customer/free-text projections", async () => {
    mockPrisma.operationCommercialOrder.findMany.mockResolvedValue([
      { id: "op-order-1", dispatchId: null },
    ] as never);
    mockPrisma.operationWarranty.findMany.mockResolvedValue([{ id: "warranty-1" }] as never);
    mockPrisma.operationReturn.findMany.mockResolvedValue([{ id: "return-1" }] as never);
    mockPrisma.operationReplacement.findMany.mockResolvedValue([{ id: "replacement-1" }] as never);

    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);

    expect(mockPrisma.operationWarranty.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["warranty-1"] } },
      data: { customerName: null, customerEmail: null, customerPhone: null, notes: null },
    });
    expect(mockPrisma.operationWarrantyEvent.updateMany).toHaveBeenCalledWith({
      where: { warrantyId: { in: ["warranty-1"] } },
      data: { reason: null, metadataJson: null },
    });
    expect(mockPrisma.operationReturn.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["return-1"] } },
      data: {
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        reason: null,
        resolution: null,
        notes: null,
      },
    });
    expect(mockPrisma.operationReplacement.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["replacement-1"] } },
      data: {
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        reason: null,
        notes: null,
      },
    });
  });

  it("redacts non-issued invoices and minimizes contact fields on issued legal records", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);
    expect(mockPrisma.invoice.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["pending_configuration", "pending_issue", "cancelled"] },
        }),
        data: {
          buyerName: null,
          buyerEmail: null,
          buyerDocument: null,
          buyerPhone: null,
          buyerAddress: null,
        },
      }),
    );
    expect(mockPrisma.invoice.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ status: "issued" }),
        data: { buyerEmail: null, buyerPhone: null },
      }),
    );
  });

  it("keeps a non-identifying erasure audit receipt", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);
    const data = mockPrisma.auditLog.create.mock.calls[0][0].data;
    expect(data.action).toBe("HARD_DELETE_REQUESTED_BY_USER");
    expect(data.accountId).toBeNull();
    expect(data.actorUserId).toBeNull();
    expect(data.entityId).toMatch(/^erasure_[0-9a-f]{32}$/);
    expect(data.entityId).not.toContain(USER_ID);
    expect(data.oldValuesJson).not.toContain(EMAIL);
  });

  it("unlinks account ownership and account lineage when the subject owns the account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: EMAIL,
      accountId: ACCOUNT_ID,
      account: { id: ACCOUNT_ID, ownerUserId: USER_ID },
      profile: { id: PROFILE_ID, accountId: ACCOUNT_ID, photoUrl: null },
      orders: [],
    } as never);

    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);

    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: ACCOUNT_ID },
      data: { accountName: "Cuenta eliminada", ownerUserId: null },
    });
    expect(mockPrisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null, accountId: null }),
      }),
    );
  });

  it("keeps deletion committed and cleanup durably queued when storage is temporarily unavailable after commit", async () => {
    mockProcessStorageCleanupOutbox.mockRejectedValue(new Error("storage unavailable"));
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(true);
    expect(mockPrisma.storageCleanupOutbox.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it("returns false when the database transaction fails", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("transaction failed"));
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
    expect(mockProcessStorageCleanupOutbox).not.toHaveBeenCalled();
  });

  it("queues cleanup in the transaction before removing database references", async () => {
    mockPrisma.storageCleanupOutbox.upsert.mockRejectedValueOnce(new Error("injected queue failure"));
    expect(await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID)).toBe(false);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockProcessStorageCleanupOutbox).not.toHaveBeenCalled();
  });

  it("does not select other members' profiles when the user is not the account owner", async () => {
    await SafeDeleteService.deleteUserAccount(USER_ID, USER_ID);
    expect(mockPrisma.profile.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.profile.update).toHaveBeenCalledTimes(1);
  });
});

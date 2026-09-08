import { prisma } from "@/lib/prisma";
import { parseStorageObjectRef } from "@/lib/storage-deletion";
import { processStorageCleanupOutbox } from "@/lib/storage-cleanup-outbox";
import { randomBytes } from "node:crypto";

export class SafeDeleteService {
  /**
   * Performs a comprehensive delete of a user account and its data.
   * Sensitive operational projections are anonymized while financial records
   * that may require legal retention are preserved at the minimum necessary level.
   * Storage cleanup is durably queued in the same transaction.
   */
  static async deleteUserAccount(userId: string, actorId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          account: true,
          profile: { select: { id: true, photoUrl: true } },
          chips: { select: { id: true } },
          orders: { select: { id: true, paymentProofUrl: true } },
        }
      });

      if (!user) throw new Error("User not found");

      const dependentProfiles = user.account?.ownerUserId === userId
        ? await prisma.profile.findMany({ where: { accountId: user.accountId, userId: null, profileType: { not: "corporate" } }, select: { id: true, photoUrl: true } })
        : [];
      const profiles = [...(user.profile ? [user.profile] : []), ...dependentProfiles];
      const profileIds = profiles.map(profile => profile.id);
      const orderIds = user.orders.map((order) => order.id);
      const storageRefs = [
        ...profiles.map(profile => parseStorageObjectRef(profile.photoUrl)),
        ...user.orders.map((order) => parseStorageObjectRef(order.paymentProofUrl)),
      ].filter((ref): ref is NonNullable<typeof ref> => ref !== null);

      const chipIds = user.chips.map((chip) => chip.id);
      await prisma.$transaction(async (tx) => {
        for (const ref of storageRefs) {
          await tx.storageCleanupOutbox.upsert({
            where: { objectKey: `${ref.bucket}:${ref.path}` },
            update: {},
            create: { objectKey: `${ref.bucket}:${ref.path}`, bucket: ref.bucket, path: ref.path, actorUserId: actorId, accountId: user.accountId },
          });
        }

        await tx.auditLog.create({
          data: {
            accountId: user.accountId,
            actorUserId: actorId,
            entityType: "USER",
            entityId: userId,
            action: "HARD_DELETE_REQUESTED_BY_USER",
            oldValuesJson: JSON.stringify({ profileDeleted: Boolean(user.profile), ordersAnonymized: user.orders.length }),
          }
        });

        // Remove direct personal/contact/consent data and ephemeral auth artifacts.
        await tx.contact.deleteMany({ where: { userId } });
        await tx.consent.deleteMany({
          where: {
            OR: [
              { userId },
              ...(profileIds.length ? [{ profileId: { in: profileIds } }] : []),
            ],
          },
        });
        await tx.appNotification.deleteMany({ where: { userId } });
        await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
        await tx.systemConfig.deleteMany({ where: { key: `security:mfa:recovery:${userId}` } });

        if (profileIds.length || chipIds.length > 0) {
          await tx.scanEvent.deleteMany({
            where: {
              OR: [
                ...(profileIds.length ? [{ profileId: { in: profileIds } }] : []),
                ...(chipIds.length > 0 ? [{ chipId: { in: chipIds } }] : []),
              ],
            },
          });
        }
        if (chipIds.length > 0) {
          await tx.notification.deleteMany({ where: { chipId: { in: chipIds } } });
          await tx.chipClaimToken.deleteMany({ where: { chipId: { in: chipIds } } });
        }

        // Clear medical, identity and precise-location data from profiles retained
        // only as tombstones for referential integrity.
        for (const profile of profiles) {
          await tx.profile.update({
            where: { id: profile.id },
            data: {
              firstName: "Cuenta",
              lastName: "Eliminada",
              displayNamePublic: null,
              sex: null,
              bloodType: "DELETED",
              allergies: "",
              chronicConditions: "",
              medications: "",
              additionalNotes: "",
              phone: null,
              nationalId: null,
              address: null,
              city: null,
              birthDate: null,
              photoUrl: null,
              lastScanAt: null,
              lastScanLocation: null,
              isInsured: false,
              insuranceProvider: null,
              insurancePolicyNumber: null,
              preferredHospital: null,
              insuranceEmergencyPhone: null,
              primaryDoctorName: null,
              primaryDoctorPhone: null,
              hasCognitiveImpairment: false,
              hasWanderingRisk: false,
              isNonVerbal: false,
              communicationAssistance: null,
              safeReturnInstructions: null,
              safeReturnLocationName: null,
              safeReturnAddress: null,
              safeReturnLat: null,
              safeReturnLng: null,
              safeReturnContactName: null,
              safeReturnContactPhone: null,
              profileVisibilityStatus: "deleted",
            }
          });
        }

        if (user.account?.ownerUserId === userId) {
          await tx.account.update({ where: { id: user.account.id }, data: { accountName: "Cuenta eliminada" } });
        }

        // Keep order/accounting amounts and lifecycle facts, but remove identity,
        // shipping, free-text and proof references that are no longer necessary.
        await tx.order.updateMany({
          where: { userId },
          data: {
            customerName: "Cuenta eliminada",
            customerEmail: null,
            customerPhone: null,
            customerDocument: null,
            shippingAddress: null,
            shippingCity: null,
            shippingNotes: null,
            deliveryNote: null,
            adminReviewNotes: null,
            paymentProofUrl: null,
            manualPaymentReference: null,
          },
        });

        if (orderIds.length > 0) {
          // OperationCommercialOrder is a denormalized projection. Production
          // checkout rows use sourceId = Order.id, so anonymize the projection too.
          await tx.operationCommercialOrder.updateMany({
            where: { sourceId: { in: orderIds } },
            data: {
              customerName: "Cuenta eliminada",
              customerEmail: null,
              customerPhone: null,
              customerReference: null,
              notes: null,
            },
          });

          // Pending/non-fiscal invoice drafts have no reason to retain buyer PII
          // after erasure. Issued/cancelled fiscal documents are intentionally
          // preserved for legal/accounting retention and must follow the formal
          // retention schedule rather than being silently destroyed here.
          await tx.invoice.updateMany({
            where: {
              orderId: { in: orderIds },
              status: { in: ["pending_configuration", "pending_issue"] },
            },
            data: {
              buyerName: "Cuenta eliminada",
              buyerEmail: null,
              buyerDocument: null,
              buyerPhone: null,
              buyerAddress: null,
            },
          });

          // The commerce worker rebuilds its input from the current Order row and
          // does not rely on payloadJson. Redact historical snapshots so stale PII
          // cannot survive in a processed/retry outbox entry.
          await tx.commerceOrderSyncOutbox.updateMany({
            where: { sourceId: { in: orderIds } },
            data: { payloadJson: JSON.stringify({ redacted: true }) },
          });

          await tx.paymentAttempt.updateMany({
            where: { orderId: { in: orderIds } },
            data: { checkoutSessionJson: null },
          });
        }

        // Disable physical identifiers without deleting inventory history.
        await tx.chip.updateMany({
          where: { ownerUserId: userId },
          data: {
            ownerUserId: null,
            assignedProfileId: null,
            status: "deactivated"
          }
        });

        // Invalidate credentials and every active JWT session, then anonymize the
        // application identity. The random password is deliberately unusable.
        await tx.user.update({
          where: { id: userId },
          data: {
            status: "deleted",
            deletedAt: new Date(),
            email: `deleted_${userId}@prerescate.invalid`,
            phone: null,
            passwordHash: randomBytes(32).toString("hex"),
            mfaEnabled: false,
            mfaSecret: null,
            lastLoginAt: null,
            sessionVersion: { increment: 1 },
          }
        });

        return true;
      });
      try {
        await processStorageCleanupOutbox();
      } catch {
        console.error("Account anonymized; durable storage cleanup awaits worker retry");
      }
      return true;
    } catch (error) {
      console.error("Safe delete failed:", error);
      return false;
    }
  }
}

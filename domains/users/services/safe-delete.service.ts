import { prisma } from "@/lib/prisma";
import { parseStorageObjectRef } from "@/lib/storage-deletion";
import { processStorageCleanupOutbox } from "@/lib/storage-cleanup-outbox";
import { randomBytes } from "node:crypto";

export class SafeDeleteService {
  /**
   * Performs a comprehensive delete of a user account and its data.
   * Anonymizes application data and durably queues storage cleanup.
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
      const storageRefs = [
        ...profiles.map(profile => parseStorageObjectRef(profile.photoUrl)),
        ...user.orders.map((order) => parseStorageObjectRef(order.paymentProofUrl)),
      ].filter((ref): ref is NonNullable<typeof ref> => ref !== null);

      const chipIds = user.chips.map((chip) => chip.id);
      await prisma.$transaction(async (tx) => {
        // Enqueue before removing references, in the same transaction. Storage
        // failures after commit remain recoverable by the cleanup worker.
        for (const ref of storageRefs) {
          await tx.storageCleanupOutbox.upsert({
            where: { objectKey: `${ref.bucket}:${ref.path}` },
            update: {},
            create: { objectKey: `${ref.bucket}:${ref.path}`, bucket: ref.bucket, path: ref.path, actorUserId: actorId, accountId: user.accountId },
          });
        }
        // 1. Audit Log: Entry before destruction
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

        // 2. Remove contacts, scans, alerts, consent evidence and app messages.
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

        // 3. Clear all sensitive medical and location fields.
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

        // 4. Keep accounting rows, but remove customer identity, shipping and proof references.
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
            paymentProofUrl: null,
            manualPaymentReference: null,
          },
        });

        // 5. Disable physical identifiers without deleting inventory history.
        await tx.chip.updateMany({
          where: { ownerUserId: userId },
          data: { 
            ownerUserId: null, 
            assignedProfileId: null,
            status: "deactivated" 
          }
        });

        // 6. Invalidate credentials and active sessions, then anonymize the user.
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

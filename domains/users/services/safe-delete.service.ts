import { prisma } from "@/lib/prisma";
import { parseStorageObjectRef } from "@/lib/storage-deletion";
import { processStorageCleanupOutbox } from "@/lib/storage-cleanup-outbox";
import { COMMERCE_ORDER_SYNC_PAYLOAD_VERSION } from "@/lib/operations/commerce-order-sync-outbox";
import { redactPersistedJson } from "@/lib/privacy/persisted-json";
import { eraseMatchingSupabaseAuthIdentity } from "@/lib/privacy/supabase-auth-erasure";
import { randomBytes } from "node:crypto";

export class SafeDeleteService {
  /**
   * Performs a comprehensive erase of a user account and its personal data.
   * Application facts required for audit/accounting remain pseudonymized, while
   * storage cleanup is durably queued. A matching legacy Supabase Auth identity
   * is removed synchronously and fail-closed before the database tombstone.
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

      // auth.* is a parallel identity store. Resolve by exact email and remove
      // the same subject before destroying the application email needed for the
      // mapping. Failure is fail-closed so erasure is never falsely reported.
      await eraseMatchingSupabaseAuthIdentity(user.email);

      const dependentProfiles = user.account?.ownerUserId === userId
        ? await prisma.profile.findMany({ where: { accountId: user.accountId, userId: null, profileType: { not: "corporate" } }, select: { id: true, photoUrl: true } })
        : [];
      const profiles = [...(user.profile ? [user.profile] : []), ...dependentProfiles];
      const profileIds = profiles.map(profile => profile.id);
      const orderIds = user.orders.map((order) => order.id);
      const chipIds = user.chips.map((chip) => chip.id);
      const storageRefs = [
        ...profiles.map(profile => parseStorageObjectRef(profile.photoUrl)),
        ...user.orders.map((order) => parseStorageObjectRef(order.paymentProofUrl)),
      ].filter((ref): ref is NonNullable<typeof ref> => ref !== null);

      await prisma.$transaction(async (tx) => {
        const commercialOrders = orderIds.length > 0
          ? await tx.operationCommercialOrder.findMany({
              where: { sourceId: { in: orderIds } },
              select: { id: true, dispatchId: true },
            })
          : [];
        const commercialOrderIds = commercialOrders.map((row) => row.id);

        const referencedDispatchEvents = orderIds.length > 0
          ? await tx.operationDispatchEvent.findMany({
              where: { referenceType: "order", referenceId: { in: orderIds } },
              select: { dispatchId: true },
            })
          : [];
        const dispatchIds = Array.from(new Set([
          ...commercialOrders.map((row) => row.dispatchId).filter((id): id is string => Boolean(id)),
          ...referencedDispatchEvents.map((row) => row.dispatchId),
        ]));

        const paymentAttempts = orderIds.length > 0
          ? await tx.paymentAttempt.findMany({
              where: { orderId: { in: orderIds } },
              select: { id: true },
            })
          : [];
        const paymentAttemptIds = paymentAttempts.map((row) => row.id);

        const issuedInvoiceCount = orderIds.length > 0
          ? await tx.invoice.count({ where: { orderId: { in: orderIds }, status: "issued" } })
          : 0;

        // Enqueue before removing references, in the same transaction. Storage
        // failures after commit remain recoverable by the cleanup worker.
        for (const ref of storageRefs) {
          await tx.storageCleanupOutbox.upsert({
            where: { objectKey: `${ref.bucket}:${ref.path}` },
            update: {},
            create: { objectKey: `${ref.bucket}:${ref.path}`, bucket: ref.bucket, path: ref.path, actorUserId: actorId, accountId: user.accountId },
          });
        }

        // Keep a minimal audit fact, never an identity/medical snapshot.
        await tx.auditLog.create({
          data: {
            accountId: user.accountId,
            actorUserId: actorId,
            entityType: "USER",
            entityId: userId,
            action: "HARD_DELETE_REQUESTED_BY_USER",
            oldValuesJson: JSON.stringify({
              profileDeleted: Boolean(user.profile),
              ordersAnonymized: user.orders.length,
              issuedInvoicesRetainedForLegalRecord: issuedInvoiceCount,
            }),
          }
        });

        // Remove contacts, scans, alerts, consent evidence, passes and app messages.
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
        if (profileIds.length > 0) {
          await tx.digitalPass.deleteMany({ where: { profileId: { in: profileIds } } });
        }
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

        // Remove payment checkout snapshots; retain provider/commercial facts.
        if (paymentAttemptIds.length > 0) {
          await tx.paymentAttempt.updateMany({
            where: { id: { in: paymentAttemptIds } },
            data: { checkoutSessionJson: null },
          });
          const paymentEvents = await tx.paymentEvent.findMany({
            where: { paymentAttemptId: { in: paymentAttemptIds } },
            select: { id: true, payloadJson: true },
          });
          for (const event of paymentEvents) {
            await tx.paymentEvent.update({
              where: { id: event.id },
              data: { payloadJson: redactPersistedJson(event.payloadJson) },
            });
          }
        }

        // Clear all sensitive medical, vulnerability, identity and location fields.
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

        // Keep accounting rows, but remove customer identity, shipping and proof references.
        if (orderIds.length > 0) {
          await tx.order.updateMany({
            where: { id: { in: orderIds } },
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

          // Non-issued invoices have no legal reason to retain buyer identity.
          await tx.invoice.updateMany({
            where: {
              orderId: { in: orderIds },
              status: { in: ["pending_configuration", "pending_issue", "cancelled"] },
            },
            data: {
              buyerName: null,
              buyerEmail: null,
              buyerDocument: null,
              buyerPhone: null,
              buyerAddress: null,
            },
          });

          // Issued invoices are an explicit RETAIN_LEGAL allowlist. Contact
          // channels are not required for the retained accounting fact.
          await tx.invoice.updateMany({
            where: { orderId: { in: orderIds }, status: "issued" },
            data: { buyerEmail: null, buyerPhone: null },
          });
        }

        // Pseudonymize operational projections and remove duplicated delivery PII.
        if (commercialOrderIds.length > 0) {
          await tx.operationCommercialOrder.updateMany({
            where: { id: { in: commercialOrderIds } },
            data: {
              customerName: "Cuenta eliminada",
              customerEmail: null,
              customerPhone: null,
              customerReference: null,
              notes: null,
            },
          });

          const commercialEvents = await tx.operationCommercialOrderEvent.findMany({
            where: { commercialOrderId: { in: commercialOrderIds } },
            select: { id: true, metadataJson: true },
          });
          for (const event of commercialEvents) {
            await tx.operationCommercialOrderEvent.update({
              where: { id: event.id },
              data: { metadataJson: redactPersistedJson(event.metadataJson) },
            });
          }
        }

        if (dispatchIds.length > 0) {
          await tx.operationDispatch.updateMany({
            where: { id: { in: dispatchIds } },
            data: {
              destinationName: null,
              destinationReference: null,
              destinationAddress: null,
              notes: null,
            },
          });

          const dispatchEvents = await tx.operationDispatchEvent.findMany({
            where: { dispatchId: { in: dispatchIds } },
            select: { id: true, metadataJson: true },
          });
          for (const event of dispatchEvents) {
            await tx.operationDispatchEvent.update({
              where: { id: event.id },
              data: { metadataJson: redactPersistedJson(event.metadataJson) },
            });
          }
        }

        // The worker rebuilds from Order using sourceId; the outbox payload is
        // therefore not allowed to retain a second customer snapshot.
        if (orderIds.length > 0) {
          await tx.commerceOrderSyncOutbox.updateMany({
            where: { sourceId: { in: orderIds } },
            data: {
              payloadVersion: COMMERCE_ORDER_SYNC_PAYLOAD_VERSION,
              payloadJson: JSON.stringify({ version: COMMERCE_ORDER_SYNC_PAYLOAD_VERSION, redacted: true }),
            },
          });
        }

        // Redact historical audit snapshots connected to this subject while
        // preserving action/entity/timestamps and other operational facts.
        const auditEntityIds = Array.from(new Set([
          userId,
          ...profileIds,
          ...chipIds,
          ...orderIds,
          ...commercialOrderIds,
          ...dispatchIds,
          ...paymentAttemptIds,
        ]));
        const auditRows = await tx.auditLog.findMany({
          where: {
            OR: [
              { actorUserId: userId },
              { entityId: { in: auditEntityIds } },
            ],
          },
          select: { id: true, oldValuesJson: true, newValuesJson: true },
        });
        for (const row of auditRows) {
          await tx.auditLog.update({
            where: { id: row.id },
            data: {
              oldValuesJson: redactPersistedJson(row.oldValuesJson),
              newValuesJson: redactPersistedJson(row.newValuesJson),
            },
          });
        }

        // Disable physical identifiers without deleting inventory history and
        // clear the last known location retained on the chip itself.
        await tx.chip.updateMany({
          where: { ownerUserId: userId },
          data: {
            ownerUserId: null,
            assignedProfileId: null,
            lastScanAt: null,
            lastScanLocation: null,
            status: "deactivated"
          }
        });

        // Invalidate credentials and active NextAuth sessions, then anonymize the user.
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

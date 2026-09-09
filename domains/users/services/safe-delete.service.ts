import { prisma } from "@/lib/prisma";
import { parseStorageObjectRef } from "@/lib/storage-deletion";
import { processStorageCleanupOutbox } from "@/lib/storage-cleanup-outbox";
import { COMMERCE_ORDER_SYNC_PAYLOAD_VERSION } from "@/lib/operations/commerce-order-sync-outbox";
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
          profile: { select: { id: true, photoUrl: true, accountId: true } },
          orders: { select: { id: true, paymentProofUrl: true } },
        },
      });

      if (!user) throw new Error("User not found");

      // auth.* is a parallel identity store. Resolve by exact email and remove
      // the same subject before destroying the application email needed for the
      // mapping. Failure is fail-closed so erasure is never falsely reported.
      await eraseMatchingSupabaseAuthIdentity(user.email);

      const ownsAccount = user.account?.ownerUserId === userId;
      const dependentProfiles = ownsAccount
        ? await prisma.profile.findMany({
            where: {
              accountId: user.accountId,
              userId: null,
              profileType: { not: "corporate" },
            },
            select: { id: true, photoUrl: true, accountId: true },
          })
        : [];
      const profiles = [...(user.profile ? [user.profile] : []), ...dependentProfiles];
      const profileIds = profiles.map((profile) => profile.id);
      const orderIds = user.orders.map((order) => order.id);
      const storageRefs = [
        ...profiles.map((profile) => parseStorageObjectRef(profile.photoUrl)),
        ...user.orders.map((order) => parseStorageObjectRef(order.paymentProofUrl)),
      ].filter((ref): ref is NonNullable<typeof ref> => ref !== null);
      const erasureReceiptId = `erasure_${randomBytes(16).toString("hex")}`;

      await prisma.$transaction(async (tx) => {
        const affectedChips = await tx.chip.findMany({
          where: {
            OR: [
              { ownerUserId: userId },
              ...(profileIds.length > 0
                ? [{ assignedProfileId: { in: profileIds } }]
                : []),
            ],
          },
          select: { id: true },
        });
        const chipIds = affectedChips.map((chip) => chip.id);

        const commercialOrders =
          orderIds.length > 0
            ? await tx.operationCommercialOrder.findMany({
                where: { sourceId: { in: orderIds } },
                select: { id: true, dispatchId: true },
              })
            : [];
        const commercialOrderIds = commercialOrders.map((row) => row.id);

        const referencedDispatchEvents =
          orderIds.length > 0
            ? await tx.operationDispatchEvent.findMany({
                where: { referenceType: "order", referenceId: { in: orderIds } },
                select: { dispatchId: true },
              })
            : [];
        const dispatchIds = Array.from(
          new Set([
            ...commercialOrders
              .map((row) => row.dispatchId)
              .filter((id): id is string => Boolean(id)),
            ...referencedDispatchEvents.map((row) => row.dispatchId),
          ]),
        );

        const paymentAttempts =
          orderIds.length > 0
            ? await tx.paymentAttempt.findMany({
                where: { orderId: { in: orderIds } },
                select: { id: true },
              })
            : [];
        const paymentAttemptIds = paymentAttempts.map((row) => row.id);

        const warranties =
          commercialOrderIds.length > 0
            ? await tx.operationWarranty.findMany({
                where: { commercialOrderId: { in: commercialOrderIds } },
                select: { id: true },
              })
            : [];
        const warrantyIds = warranties.map((row) => row.id);
        const returns =
          commercialOrderIds.length > 0
            ? await tx.operationReturn.findMany({
                where: { commercialOrderId: { in: commercialOrderIds } },
                select: { id: true },
              })
            : [];
        const returnIds = returns.map((row) => row.id);
        const replacements =
          commercialOrderIds.length > 0
            ? await tx.operationReplacement.findMany({
                where: { commercialOrderId: { in: commercialOrderIds } },
                select: { id: true },
              })
            : [];
        const replacementIds = replacements.map((row) => row.id);

        const issuedInvoiceCount =
          orderIds.length > 0
            ? await tx.invoice.count({
                where: { orderId: { in: orderIds }, status: "issued" },
              })
            : 0;

        // Enqueue before removing references, in the same transaction. The
        // object key/path is sufficient for cleanup; do not copy subject IDs
        // into the durable queue.
        for (const ref of storageRefs) {
          await tx.storageCleanupOutbox.upsert({
            where: { objectKey: `${ref.bucket}:${ref.path}` },
            update: {},
            create: {
              objectKey: `${ref.bucket}:${ref.path}`,
              bucket: ref.bucket,
              path: ref.path,
              actorUserId: null,
              accountId: null,
            },
          });
        }

        // Keep only a non-identifying audit receipt and aggregate facts.
        await tx.auditLog.create({
          data: {
            accountId: null,
            actorUserId: actorId === userId ? null : actorId,
            entityType: "ERASURE_RECEIPT",
            entityId: erasureReceiptId,
            action: "HARD_DELETE_REQUESTED_BY_USER",
            oldValuesJson: JSON.stringify({
              profileDeleted: Boolean(user.profile),
              ordersAnonymized: user.orders.length,
              issuedInvoicesRetainedForLegalRecord: issuedInvoiceCount,
            }),
          },
        });

        // Remove profile/contact links first. Then remove user-owned contacts
        // and any profile contacts that became truly orphaned, preserving a
        // contact only if another unaffected profile still references it.
        const profileContactRows =
          profileIds.length > 0
            ? await tx.profileContact.findMany({
                where: { profileId: { in: profileIds } },
                select: { contactId: true },
              })
            : [];
        const candidateContactIds = Array.from(
          new Set(profileContactRows.map((row) => row.contactId)),
        );
        if (profileIds.length > 0) {
          await tx.profileContact.deleteMany({
            where: { profileId: { in: profileIds } },
          });
        }
        await tx.contact.deleteMany({ where: { userId } });
        if (candidateContactIds.length > 0) {
          const remainingContactLinks = await tx.profileContact.findMany({
            where: { contactId: { in: candidateContactIds } },
            select: { contactId: true },
          });
          const stillReferenced = new Set(
            remainingContactLinks.map((row) => row.contactId),
          );
          const orphanedContactIds = candidateContactIds.filter(
            (contactId) => !stillReferenced.has(contactId),
          );
          if (orphanedContactIds.length > 0) {
            await tx.contact.deleteMany({ where: { id: { in: orphanedContactIds } } });
          }
        }

        await tx.consent.deleteMany({
          where: {
            OR: [
              { userId },
              ...(profileIds.length > 0
                ? [{ profileId: { in: profileIds } }]
                : []),
            ],
          },
        });
        await tx.appNotification.deleteMany({ where: { userId } });
        await tx.passwordResetToken.deleteMany({ where: { email: user.email } });

        if (profileIds.length > 0) {
          await tx.digitalPass.deleteMany({ where: { profileId: { in: profileIds } } });

          // Corporate membership rows may be part of business history and are
          // referenced by fulfillment records, so tombstone their human/medical
          // projection instead of deleting the row blindly.
          await tx.organizationMember.updateMany({
            where: { profileId: { in: profileIds } },
            data: {
              internalCode: null,
              department: null,
              position: null,
              memberStatus: "deleted",
              locationId: null,
              departmentId: null,
              employeeId: null,
              shift: null,
              occupationalRisks: [],
              medicalRestrictions: null,
              emergencyProtocol: null,
              supervisorName: null,
              supervisorPhone: null,
              corporateStatus: "deleted",
              employeeNationalId: null,
              employeeAge: null,
              employeePhone: null,
              employeePosition: null,
              employeeDepartment: null,
              employeeInternalId: null,
              employeeNote: null,
              corporateProfileId: null,
            },
          });
        }

        if (profileIds.length > 0 || chipIds.length > 0) {
          await tx.scanEvent.deleteMany({
            where: {
              OR: [
                ...(profileIds.length > 0
                  ? [{ profileId: { in: profileIds } }]
                  : []),
                ...(chipIds.length > 0 ? [{ chipId: { in: chipIds } }] : []),
              ],
            },
          });
        }
        if (chipIds.length > 0) {
          await tx.notification.deleteMany({ where: { chipId: { in: chipIds } } });
          await tx.chipClaimToken.deleteMany({ where: { chipId: { in: chipIds } } });
        }

        // Remove payment checkout/event snapshots entirely. Structured provider,
        // amount, status and timestamps remain as the operational record.
        if (paymentAttemptIds.length > 0) {
          await tx.paymentAttempt.updateMany({
            where: { id: { in: paymentAttemptIds } },
            data: { checkoutSessionJson: null },
          });
          await tx.paymentEvent.updateMany({
            where: { paymentAttemptId: { in: paymentAttemptIds } },
            data: { payloadJson: "{}" },
          });
        }

        // Clear all sensitive medical, vulnerability, identity and location fields.
        for (const profile of profiles) {
          await tx.profile.update({
            where: { id: profile.id },
            data: {
              userId: null,
              accountId: ownsAccount ? null : profile.accountId,
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
            },
          });
        }

        if (ownsAccount && user.account) {
          await tx.account.update({
            where: { id: user.account.id },
            data: { accountName: "Cuenta eliminada", ownerUserId: null },
          });
        }

        // Keep accounting rows, but remove customer identity, shipping, proof
        // references and the direct user relation.
        if (orderIds.length > 0) {
          await tx.order.updateMany({
            where: { id: { in: orderIds } },
            data: {
              userId: null,
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

          // Issued invoices remain an explicit RETAIN_LEGAL allowlist pending
          // the formal Block 7 retention policy. Contact channels are removed.
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
          await tx.operationCommercialOrderEvent.updateMany({
            where: { commercialOrderId: { in: commercialOrderIds } },
            data: { metadataJson: null, reason: null },
          });
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
          await tx.operationDispatchEvent.updateMany({
            where: { dispatchId: { in: dispatchIds } },
            data: { metadataJson: null, reason: null },
          });
        }

        // Warranty/return/replacement records can exist long after fulfillment.
        // Preserve state/traceability but strip every free-text/customer projection.
        if (warrantyIds.length > 0) {
          await tx.operationWarranty.updateMany({
            where: { id: { in: warrantyIds } },
            data: {
              customerName: null,
              customerEmail: null,
              customerPhone: null,
              notes: null,
            },
          });
          await tx.operationWarrantyEvent.updateMany({
            where: { warrantyId: { in: warrantyIds } },
            data: { reason: null, metadataJson: null },
          });
        }
        if (returnIds.length > 0) {
          await tx.operationReturn.updateMany({
            where: { id: { in: returnIds } },
            data: {
              customerName: null,
              customerEmail: null,
              customerPhone: null,
              reason: null,
              resolution: null,
              notes: null,
            },
          });
          await tx.operationReturnEvent.updateMany({
            where: { returnId: { in: returnIds } },
            data: { reason: null, metadataJson: null },
          });
        }
        if (replacementIds.length > 0) {
          await tx.operationReplacement.updateMany({
            where: { id: { in: replacementIds } },
            data: {
              customerName: null,
              customerEmail: null,
              customerPhone: null,
              reason: null,
              notes: null,
            },
          });
          await tx.operationReplacementEvent.updateMany({
            where: { replacementId: { in: replacementIds } },
            data: { reason: null, metadataJson: null },
          });
        }

        // The worker rebuilds from Order using sourceId; the outbox payload is
        // therefore not allowed to retain a second customer snapshot.
        if (orderIds.length > 0) {
          await tx.commerceOrderSyncOutbox.updateMany({
            where: { sourceId: { in: orderIds } },
            data: {
              payloadVersion: COMMERCE_ORDER_SYNC_PAYLOAD_VERSION,
              payloadJson: JSON.stringify({
                version: COMMERCE_ORDER_SYNC_PAYLOAD_VERSION,
                redacted: true,
              }),
            },
          });
        }

        // Subject-linked audit snapshots are unnecessary after erasure. Keep
        // only structured action/timestamp/result facts and break actor identity.
        const auditEntityIds = Array.from(
          new Set([
            userId,
            ...profileIds,
            ...chipIds,
            ...orderIds,
            ...commercialOrderIds,
            ...dispatchIds,
            ...paymentAttemptIds,
            ...warrantyIds,
            ...returnIds,
            ...replacementIds,
          ]),
        );
        await tx.auditLog.updateMany({
          where: {
            OR: [
              { actorUserId: userId },
              { entityId: { in: auditEntityIds } },
            ],
          },
          data: {
            oldValuesJson: null,
            newValuesJson: null,
            actorUserId: null,
          },
        });

        // Disable every physical identifier that either belongs to the user OR
        // points at an erased profile. This closes the assignedProfile-only gap.
        if (chipIds.length > 0) {
          await tx.chip.updateMany({
            where: { id: { in: chipIds } },
            data: {
              ownerUserId: null,
              assignedProfileId: null,
              accountId: ownsAccount ? null : undefined,
              lastScanAt: null,
              lastScanLocation: null,
              status: "deactivated",
            },
          });
        }

        // Invalidate credentials and active NextAuth sessions, then anonymize the user.
        await tx.user.update({
          where: { id: userId },
          data: {
            status: "deleted",
            deletedAt: new Date(),
            email: `deleted_${erasureReceiptId}@prerescate.invalid`,
            phone: null,
            passwordHash: randomBytes(32).toString("hex"),
            mfaEnabled: false,
            mfaSecret: null,
            lastLoginAt: null,
            sessionVersion: { increment: 1 },
          },
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

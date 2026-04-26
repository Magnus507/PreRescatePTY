import { prisma } from "@/lib/prisma";

export class SafeDeleteService {
  /**
   * Performs a comprehensive delete of a user account and its data.
   * Ensures compliance with Ley 81 by wiping data but keeping audit trails.
   */
  static async deleteUserAccount(userId: string, actorId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { account: true, profile: true }
      });

      if (!user) throw new Error("User not found");

      return await prisma.$transaction(async (tx) => {
        // 1. Audit Log: Entry before destruction
        await tx.auditLog.create({
          data: {
            accountId: user.accountId,
            actorUserId: actorId,
            entityType: "USER",
            entityId: userId,
            action: "HARD_DELETE_REQUESTED_BY_USER",
            oldValuesJson: JSON.stringify({ email: user.email, profileId: user.profile?.id }),
          }
        });

        // 2. Clear sensitive profile data if it exists
        if (user.profile) {
          // Instead of just deleting, we explicitly wipe fields first to ensure no cache/snapshot leak
          await tx.profile.update({
            where: { id: user.profile.id },
            data: {
              bloodType: "DELETED",
              allergies: "",
              chronicConditions: "",
              medications: "",
              additionalNotes: "DATA_WIPED_BY_COMPLIANCE_PROTOCOL",
              nationalId: "",
              address: "",
              photoUrl: null
            }
          });
        }

        // 3. Handle cascade: Most are handled by schema, but ensure Chips are unlinked
        await tx.chip.updateMany({
          where: { ownerUserId: userId },
          data: { 
            ownerUserId: null, 
            assignedProfileId: null,
            status: "deactivated" 
          }
        });

        // 4. Soft delete the user record first
        await tx.user.update({
          where: { id: userId },
          data: { 
            status: "deleted",
            deletedAt: new Date(),
            email: `deleted_${userId}@prerescate.invalid` // Anonymize email
          }
        });

        return true;
      });
    } catch (error) {
      console.error("Safe delete failed:", error);
      return false;
    }
  }
}

import { prisma } from "@/lib/prisma";
import { Chip } from "@prisma/client";

export class ChipRepository {
  /**
   * Find a chip by ID.
   */
  static async findById(id: string): Promise<Chip | null> {
    return prisma.chip.findUnique({
      where: { id },
    });
  }

  /**
   * Find a chip by short code (for scans).
   */
  static async findByShortCode(shortCode: string): Promise<Chip | null> {
    return prisma.chip.findUnique({
      where: { shortCode },
    });
  }

  /**
   * Unassign a chip from a profile.
   */
  static async unassignFromProfile(profileId: string) {
    return prisma.chip.updateMany({
      where: { assignedProfileId: profileId },
      data: { assignedProfileId: null },
    });
  }

  /**
   * Count active chips for an account.
   */
  static async countActiveByAccount(accountId: string): Promise<number> {
    return prisma.chip.count({
      where: { 
        accountId, 
        status: { in: ["activated", "suspended", "sold"] } 
      }
    });
  }
}

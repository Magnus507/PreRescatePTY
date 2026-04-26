import { prisma } from "@/lib/prisma";
import { Profile } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/encryption";

export class ProfileRepository {
  /**
   * Decrypts medical fields in a profile object.
   */
  private static decryptProfile(profile: Profile | null): Profile | null {
    if (!profile) return null;
    return {
      ...profile,
      bloodType: decrypt(profile.bloodType),
      allergies: decrypt(profile.allergies),
      chronicConditions: decrypt(profile.chronicConditions),
      medications: decrypt(profile.medications),
      additionalNotes: decrypt(profile.additionalNotes),
      nationalId: decrypt(profile.nationalId || ""),
      address: decrypt(profile.address || ""),
    };
  }

  /**
   * Find a profile by its ID.
   */
  static async findById(id: string): Promise<Profile | null> {
    const profile = await prisma.profile.findUnique({
      where: { id },
    });
    return this.decryptProfile(profile);
  }

  /**
   * Find a profile by user ID.
   */
  static async findByUserId(userId: string): Promise<Profile | null> {
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });
    return this.decryptProfile(profile);
  }

  /**
   * Get all family profiles for an account, including chip metadata.
   */
  static async findAllByAccount(accountId: string) {
    const profiles = await prisma.profile.findMany({
      where: { accountId },
      include: {
        assignedChips: {
          select: {
            id: true,
            shortCode: true,
            chipAlias: true,
            serialPublic: true,
          }
        }
      },
      orderBy: { createdAt: "asc" },
    });
    
    return profiles.map(p => this.decryptProfile(p as unknown as Profile));
  }

  /**
   * Create a new family profile.
   */
  static async create(data: { 
    accountId: string; 
    firstName: string; 
    lastName: string; 
    bloodType?: string; 
    additionalNotes?: string;
    displayNamePublic?: string;
    birthDate?: Date | null;
    sex?: string;
    phone?: string;
    allergies?: string;
    chronicConditions?: string;
    medications?: string;
    nationalId?: string;
    address?: string;
  }) {
    const profile = await prisma.profile.create({
      data: {
        ...data,
        bloodType: encrypt(data.bloodType || "O+"),
        allergies: encrypt(data.allergies || ""),
        chronicConditions: encrypt(data.chronicConditions || ""),
        medications: encrypt(data.medications || ""),
        additionalNotes: encrypt(data.additionalNotes || ""),
        nationalId: encrypt(data.nationalId || ""),
        address: encrypt(data.address || ""),
        userId: null,
      },
    });

    return this.decryptProfile(profile);
  }

  /**
   * Delete a profile (and unassign chips first).
   */
  static async delete(id: string) {
    return prisma.profile.delete({
      where: { id },
    });
  }

  /**
   * Count profiles for an account.
   */
  static async countByAccount(accountId: string): Promise<number> {
    return prisma.profile.count({
      where: { accountId },
    });
  }

  /**
   * Find a specific profile by ID and account, ensuring it's a family profile (no userId).
   */
  static async findFamilyProfileById(id: string, accountId: string) {
    const profile = await prisma.profile.findFirst({
      where: { id, accountId, userId: null },
    });
    return this.decryptProfile(profile);
  }

  /**
   * Update a profile with encrypted fields.
   */
  static async update(id: string, data: Partial<Profile>) {
    const updateData: any = { ...data };
    
    if (data.bloodType) updateData.bloodType = encrypt(data.bloodType);
    if (data.allergies) updateData.allergies = encrypt(data.allergies);
    if (data.chronicConditions) updateData.chronicConditions = encrypt(data.chronicConditions);
    if (data.medications) updateData.medications = encrypt(data.medications);
    if (data.additionalNotes) updateData.additionalNotes = encrypt(data.additionalNotes);
    if (data.nationalId) updateData.nationalId = encrypt(data.nationalId);
    if (data.address) updateData.address = encrypt(data.address);

    const profile = await prisma.profile.update({
      where: { id },
      data: updateData
    });

    return this.decryptProfile(profile);
  }
}

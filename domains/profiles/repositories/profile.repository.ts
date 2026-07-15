import { Prisma, Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encryption";

export class ProfileRepository {
  /**
   * Decrypts medical fields in a profile object.
   */
  private static decryptProfile(profile: Profile | null): Profile | null {
    if (!profile) return null;
    return {
      ...profile,
      bloodType: decrypt(profile.bloodType, { allowPlaintextLegacy: true }),
      allergies: decrypt(profile.allergies, { allowPlaintextLegacy: true }),
      chronicConditions: decrypt(profile.chronicConditions, { allowPlaintextLegacy: true }),
      medications: decrypt(profile.medications, { allowPlaintextLegacy: true }),
      additionalNotes: decrypt(profile.additionalNotes, { allowPlaintextLegacy: true }),
      nationalId: decrypt(profile.nationalId || "", { allowPlaintextLegacy: true }),
      address: decrypt(profile.address || "", { allowPlaintextLegacy: true }),
      insuranceProvider: decrypt(profile.insuranceProvider || "", { allowPlaintextLegacy: true }),
      insurancePolicyNumber: decrypt(profile.insurancePolicyNumber || "", { allowPlaintextLegacy: true }),
      preferredHospital: decrypt(profile.preferredHospital || "", { allowPlaintextLegacy: true }),
      insuranceEmergencyPhone: decrypt(profile.insuranceEmergencyPhone || "", { allowPlaintextLegacy: true }),
      primaryDoctorName: decrypt(profile.primaryDoctorName || "", { allowPlaintextLegacy: true }),
      primaryDoctorPhone: decrypt(profile.primaryDoctorPhone || "", { allowPlaintextLegacy: true }),
      communicationAssistance: decrypt(profile.communicationAssistance || "", { allowPlaintextLegacy: true }),
      safeReturnInstructions: decrypt(profile.safeReturnInstructions || "", { allowPlaintextLegacy: true }),
      safeReturnLocationName: decrypt(profile.safeReturnLocationName || "", { allowPlaintextLegacy: true }),
      safeReturnAddress: decrypt(profile.safeReturnAddress || "", { allowPlaintextLegacy: true }),
      safeReturnContactName: decrypt(profile.safeReturnContactName || "", { allowPlaintextLegacy: true }),
      safeReturnContactPhone: decrypt(profile.safeReturnContactPhone || "", { allowPlaintextLegacy: true }),
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
   * Excludes corporate profiles (profileType = "corporate").
   */
  static async findAllByAccount(accountId: string) {
    const profiles = await prisma.profile.findMany({
      where: { 
        accountId,
        profileType: { not: "corporate" }
      },
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
    isInsured?: boolean;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    preferredHospital?: string;
    insuranceEmergencyPhone?: string;
    primaryDoctorName?: string;
    primaryDoctorPhone?: string;
    showInsuranceProviderPublic?: boolean;
    showPreferredHospitalPublic?: boolean;
    showPrimaryDoctorPublic?: boolean;
    showPrimaryDoctorPhonePublic?: boolean;
    showAdditionalNotesPublic?: boolean;
    // v2 special assistance
    hasCognitiveImpairment?: boolean;
    hasWanderingRisk?: boolean;
    isNonVerbal?: boolean;
    communicationAssistance?: string;
    safeReturnInstructions?: string;
    safeReturnLocationName?: string;
    safeReturnAddress?: string;
    safeReturnLat?: number;
    safeReturnLng?: number;
    safeReturnContactName?: string;
    safeReturnContactPhone?: string;
    showVulnerabilityStatusPublic?: boolean;
    showCommunicationStatusPublic?: boolean;
    showSafeReturnPublic?: boolean;
    showSafeReturnLocationPublic?: boolean;
  }) {
    const profile = await prisma.profile.create({
      data: {
        ...data,
        bloodType: encrypt(data.bloodType || "Pendiente"),
        allergies: encrypt(data.allergies || ""),
        chronicConditions: encrypt(data.chronicConditions || ""),
        medications: encrypt(data.medications || ""),
        additionalNotes: encrypt(data.additionalNotes || ""),
        nationalId: encrypt(data.nationalId || ""),
        address: encrypt(data.address || ""),
        insuranceProvider: encrypt(data.insuranceProvider || ""),
        insurancePolicyNumber: encrypt(data.insurancePolicyNumber || ""),
        preferredHospital: encrypt(data.preferredHospital || ""),
        insuranceEmergencyPhone: encrypt(data.insuranceEmergencyPhone || ""),
        primaryDoctorName: encrypt(data.primaryDoctorName || ""),
        primaryDoctorPhone: encrypt(data.primaryDoctorPhone || ""),
        communicationAssistance: encrypt(data.communicationAssistance || ""),
        safeReturnInstructions: encrypt(data.safeReturnInstructions || ""),
        safeReturnLocationName: encrypt(data.safeReturnLocationName || ""),
        safeReturnAddress: encrypt(data.safeReturnAddress || ""),
        safeReturnLat: data.safeReturnLat,
        safeReturnLng: data.safeReturnLng,
        safeReturnContactName: encrypt(data.safeReturnContactName || ""),
        safeReturnContactPhone: encrypt(data.safeReturnContactPhone || ""),
        showSafeReturnLocationPublic: data.showSafeReturnLocationPublic ?? false,
        isInsured: data.isInsured ?? false,
        showInsuranceProviderPublic: data.showInsuranceProviderPublic ?? false,
        showPreferredHospitalPublic: data.showPreferredHospitalPublic ?? false,
        showPrimaryDoctorPublic: data.showPrimaryDoctorPublic ?? false,
        showPrimaryDoctorPhonePublic: data.showPrimaryDoctorPhonePublic ?? false,
        showAdditionalNotesPublic: data.showAdditionalNotesPublic ?? false,
        hasCognitiveImpairment: data.hasCognitiveImpairment ?? false,
        hasWanderingRisk: data.hasWanderingRisk ?? false,
        isNonVerbal: data.isNonVerbal ?? false,
        showVulnerabilityStatusPublic: data.showVulnerabilityStatusPublic ?? false,
        showCommunicationStatusPublic: data.showCommunicationStatusPublic ?? false,
        showSafeReturnPublic: data.showSafeReturnPublic ?? false,
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
    // Strip undefined values to prevent silent overwrite with empty string
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) filtered[key] = value;
    }
    const updateData = { ...filtered } as Prisma.ProfileUpdateInput;
    
    if (data.bloodType !== undefined) updateData.bloodType = encrypt(data.bloodType || "");
    if (data.allergies !== undefined) updateData.allergies = encrypt(data.allergies || "");
    if (data.chronicConditions !== undefined) updateData.chronicConditions = encrypt(data.chronicConditions || "");
    if (data.medications !== undefined) updateData.medications = encrypt(data.medications || "");
    if (data.additionalNotes !== undefined) updateData.additionalNotes = encrypt(data.additionalNotes || "");
    if (data.nationalId !== undefined) updateData.nationalId = encrypt(data.nationalId || "");
    if (data.address !== undefined) updateData.address = encrypt(data.address || "");
    if (data.insuranceProvider !== undefined) updateData.insuranceProvider = encrypt(data.insuranceProvider || "");
    if (data.insurancePolicyNumber !== undefined) updateData.insurancePolicyNumber = encrypt(data.insurancePolicyNumber || "");
    if (data.preferredHospital !== undefined) updateData.preferredHospital = encrypt(data.preferredHospital || "");
    if (data.insuranceEmergencyPhone !== undefined) updateData.insuranceEmergencyPhone = encrypt(data.insuranceEmergencyPhone || "");
    if (data.primaryDoctorName !== undefined) updateData.primaryDoctorName = encrypt(data.primaryDoctorName || "");
    if (data.primaryDoctorPhone !== undefined) updateData.primaryDoctorPhone = encrypt(data.primaryDoctorPhone || "");
    if (data.communicationAssistance !== undefined) updateData.communicationAssistance = encrypt(data.communicationAssistance || "");
    if (data.safeReturnInstructions !== undefined) updateData.safeReturnInstructions = encrypt(data.safeReturnInstructions || "");
    if (data.safeReturnLocationName !== undefined) updateData.safeReturnLocationName = encrypt(data.safeReturnLocationName || "");
    if (data.safeReturnAddress !== undefined) updateData.safeReturnAddress = encrypt(data.safeReturnAddress || "");
    if (data.safeReturnLat !== undefined) updateData.safeReturnLat = data.safeReturnLat;
    if (data.safeReturnLng !== undefined) updateData.safeReturnLng = data.safeReturnLng;
    if (data.safeReturnContactName !== undefined) updateData.safeReturnContactName = encrypt(data.safeReturnContactName || "");
    if (data.safeReturnContactPhone !== undefined) updateData.safeReturnContactPhone = encrypt(data.safeReturnContactPhone || "");
    if (data.showSafeReturnLocationPublic !== undefined) updateData.showSafeReturnLocationPublic = data.showSafeReturnLocationPublic;

    const profile = await prisma.profile.update({
      where: { id },
      data: updateData
    });

    return this.decryptProfile(profile);
  }

  /**
   * Upsert own profile by user id with encrypted fields.
   */
  static async upsertByUserId(userId: string, data: Partial<Profile>) {
    const createData = {
      userId,
      firstName: data.firstName || "",
      lastName: data.lastName || "Sin Perfil",
      bloodType: encrypt(data.bloodType || "Pendiente"),
      allergies: encrypt(data.allergies || ""),
      chronicConditions: encrypt(data.chronicConditions || ""),
      medications: encrypt(data.medications || ""),
      additionalNotes: encrypt(data.additionalNotes || ""),
      nationalId: encrypt(data.nationalId || ""),
      address: encrypt(data.address || ""),
      insuranceProvider: encrypt(data.insuranceProvider || ""),
      insurancePolicyNumber: encrypt(data.insurancePolicyNumber || ""),
      preferredHospital: encrypt(data.preferredHospital || ""),
      insuranceEmergencyPhone: encrypt(data.insuranceEmergencyPhone || ""),
      primaryDoctorName: encrypt(data.primaryDoctorName || ""),
      primaryDoctorPhone: encrypt(data.primaryDoctorPhone || ""),
      communicationAssistance: encrypt(data.communicationAssistance || ""),
      safeReturnInstructions: encrypt(data.safeReturnInstructions || ""),
      safeReturnLocationName: encrypt(data.safeReturnLocationName || ""),
      safeReturnAddress: encrypt(data.safeReturnAddress || ""),
      safeReturnLat: data.safeReturnLat,
      safeReturnLng: data.safeReturnLng,
      safeReturnContactName: encrypt(data.safeReturnContactName || ""),
      safeReturnContactPhone: encrypt(data.safeReturnContactPhone || ""),
      showSafeReturnLocationPublic: data.showSafeReturnLocationPublic ?? false,
      isInsured: data.isInsured ?? false,
      showInsuranceProviderPublic: data.showInsuranceProviderPublic ?? false,
      showPreferredHospitalPublic: data.showPreferredHospitalPublic ?? false,
      showPrimaryDoctorPublic: data.showPrimaryDoctorPublic ?? false,
      showPrimaryDoctorPhonePublic: data.showPrimaryDoctorPhonePublic ?? false,
      showAdditionalNotesPublic: data.showAdditionalNotesPublic ?? false,
      hasCognitiveImpairment: data.hasCognitiveImpairment ?? false,
      hasWanderingRisk: data.hasWanderingRisk ?? false,
      isNonVerbal: data.isNonVerbal ?? false,
      showVulnerabilityStatusPublic: data.showVulnerabilityStatusPublic ?? false,
      showCommunicationStatusPublic: data.showCommunicationStatusPublic ?? false,
      showSafeReturnPublic: data.showSafeReturnPublic ?? false,
      displayNamePublic: data.displayNamePublic,
      birthDate: data.birthDate,
      sex: data.sex,
      phone: data.phone,
      city: data.city,
      profileVisibilityStatus: data.profileVisibilityStatus,
    };

    // Strip undefined values to prevent silent overwrite with empty string
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) filtered[key] = value;
    }
    const updateData = { ...filtered } as Prisma.ProfileUpdateInput;
    if (data.bloodType !== undefined) updateData.bloodType = encrypt(data.bloodType || "");
    if (data.allergies !== undefined) updateData.allergies = encrypt(data.allergies || "");
    if (data.chronicConditions !== undefined) updateData.chronicConditions = encrypt(data.chronicConditions || "");
    if (data.medications !== undefined) updateData.medications = encrypt(data.medications || "");
    if (data.additionalNotes !== undefined) updateData.additionalNotes = encrypt(data.additionalNotes || "");
    if (data.nationalId !== undefined) updateData.nationalId = encrypt(data.nationalId || "");
    if (data.address !== undefined) updateData.address = encrypt(data.address || "");
    if (data.insuranceProvider !== undefined) updateData.insuranceProvider = encrypt(data.insuranceProvider || "");
    if (data.insurancePolicyNumber !== undefined) updateData.insurancePolicyNumber = encrypt(data.insurancePolicyNumber || "");
    if (data.preferredHospital !== undefined) updateData.preferredHospital = encrypt(data.preferredHospital || "");
    if (data.insuranceEmergencyPhone !== undefined) updateData.insuranceEmergencyPhone = encrypt(data.insuranceEmergencyPhone || "");
    if (data.primaryDoctorName !== undefined) updateData.primaryDoctorName = encrypt(data.primaryDoctorName || "");
    if (data.primaryDoctorPhone !== undefined) updateData.primaryDoctorPhone = encrypt(data.primaryDoctorPhone || "");
    if (data.communicationAssistance !== undefined) updateData.communicationAssistance = encrypt(data.communicationAssistance || "");
    if (data.safeReturnInstructions !== undefined) updateData.safeReturnInstructions = encrypt(data.safeReturnInstructions || "");
    if (data.safeReturnLocationName !== undefined) updateData.safeReturnLocationName = encrypt(data.safeReturnLocationName || "");
    if (data.safeReturnAddress !== undefined) updateData.safeReturnAddress = encrypt(data.safeReturnAddress || "");
    if (data.safeReturnLat !== undefined) updateData.safeReturnLat = data.safeReturnLat;
    if (data.safeReturnLng !== undefined) updateData.safeReturnLng = data.safeReturnLng;
    if (data.safeReturnContactName !== undefined) updateData.safeReturnContactName = encrypt(data.safeReturnContactName || "");
    if (data.safeReturnContactPhone !== undefined) updateData.safeReturnContactPhone = encrypt(data.safeReturnContactPhone || "");
    if (data.showSafeReturnLocationPublic !== undefined) updateData.showSafeReturnLocationPublic = data.showSafeReturnLocationPublic;

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: updateData,
      create: createData,
    });

    return this.decryptProfile(profile);
  }
}

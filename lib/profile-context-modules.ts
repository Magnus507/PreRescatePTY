export type MinorModuleData = {
  guardianName: string;
  guardianPhone: string;
  schoolName: string;
  schoolPhone: string;
  pediatricianName: string;
  pediatricianPhone: string;
  pickupNotes: string;
};

export type ElderModuleData = {
  caregiverName: string;
  caregiverPhone: string;
  mobilitySupport: string;
  memorySupport: string;
  dailyCareNotes: string;
};

export type SpecialNeedsModuleData = {
  conditionSummary: string;
  communicationMethod: string;
  sensoryTriggers: string;
  calmingStrategies: string;
  mobilitySupport: string;
  emergencyNotes: string;
};

export type PetModuleData = {
  petName: string;
  species: string;
  breed: string;
  color: string;
  sex: string;
  birthDate: string;
  distinctiveMarks: string;
  ownerName: string;
  ownerPhone: string;
  homeArea: string;
  returnInstructions: string;
  veterinarianName: string;
  veterinarianPhone: string;
  medicalNotes: string;
  careNotes: string;
  isServiceAnimal: boolean;
};

export type WorkModuleData = {
  employerName: string;
  role: string;
  workSite: string;
  supervisorName: string;
  supervisorPhone: string;
  safetyNotes: string;
};

export type ProfileContextModules = {
  minorModuleEnabled: boolean;
  minorModuleData: MinorModuleData;
  elderModuleEnabled: boolean;
  elderModuleData: ElderModuleData;
  specialNeedsModuleEnabled: boolean;
  specialNeedsModuleData: SpecialNeedsModuleData;
  petModuleEnabled: boolean;
  petModuleData: PetModuleData;
  workModuleEnabled: boolean;
  workModuleData: WorkModuleData;
};

export const EMPTY_MINOR_MODULE: MinorModuleData = {
  guardianName: "",
  guardianPhone: "",
  schoolName: "",
  schoolPhone: "",
  pediatricianName: "",
  pediatricianPhone: "",
  pickupNotes: "",
};

export const EMPTY_ELDER_MODULE: ElderModuleData = {
  caregiverName: "",
  caregiverPhone: "",
  mobilitySupport: "",
  memorySupport: "",
  dailyCareNotes: "",
};

export const EMPTY_SPECIAL_NEEDS_MODULE: SpecialNeedsModuleData = {
  conditionSummary: "",
  communicationMethod: "",
  sensoryTriggers: "",
  calmingStrategies: "",
  mobilitySupport: "",
  emergencyNotes: "",
};

export const EMPTY_PET_MODULE: PetModuleData = {
  petName: "",
  species: "",
  breed: "",
  color: "",
  sex: "",
  birthDate: "",
  distinctiveMarks: "",
  ownerName: "",
  ownerPhone: "",
  homeArea: "",
  returnInstructions: "",
  veterinarianName: "",
  veterinarianPhone: "",
  medicalNotes: "",
  careNotes: "",
  isServiceAnimal: false,
};

export const EMPTY_WORK_MODULE: WorkModuleData = {
  employerName: "",
  role: "",
  workSite: "",
  supervisorName: "",
  supervisorPhone: "",
  safetyNotes: "",
};

export const EMPTY_PROFILE_CONTEXT_MODULES: ProfileContextModules = {
  minorModuleEnabled: false,
  minorModuleData: { ...EMPTY_MINOR_MODULE },
  elderModuleEnabled: false,
  elderModuleData: { ...EMPTY_ELDER_MODULE },
  specialNeedsModuleEnabled: false,
  specialNeedsModuleData: { ...EMPTY_SPECIAL_NEEDS_MODULE },
  petModuleEnabled: false,
  petModuleData: { ...EMPTY_PET_MODULE },
  workModuleEnabled: false,
  workModuleData: { ...EMPTY_WORK_MODULE },
};

function parseObject<T extends Record<string, unknown>>(raw: unknown, fallback: T): T {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...fallback, ...(raw as Partial<T>) };
  }

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...fallback, ...(parsed as Partial<T>) };
      }
    } catch {
      return { ...fallback };
    }
  }

  return { ...fallback };
}

export function hydrateProfileContextModules(profile: Record<string, unknown>): ProfileContextModules {
  return {
    minorModuleEnabled: profile.minorModuleEnabled === true,
    minorModuleData: parseObject(profile.minorModuleData, EMPTY_MINOR_MODULE),
    elderModuleEnabled: profile.elderModuleEnabled === true,
    elderModuleData: parseObject(profile.elderModuleData, EMPTY_ELDER_MODULE),
    specialNeedsModuleEnabled: profile.specialNeedsModuleEnabled === true,
    specialNeedsModuleData: parseObject(profile.specialNeedsModuleData, EMPTY_SPECIAL_NEEDS_MODULE),
    petModuleEnabled: profile.petModuleEnabled === true,
    petModuleData: parseObject(profile.petModuleData, EMPTY_PET_MODULE),
    workModuleEnabled: profile.workModuleEnabled === true,
    workModuleData: parseObject(profile.workModuleData, EMPTY_WORK_MODULE),
  };
}

export function hasModuleContent(data: Record<string, unknown>): boolean {
  return Object.values(data).some((value) => {
    if (typeof value === "boolean") return value;
    return typeof value === "string" && value.trim().length > 0;
  });
}

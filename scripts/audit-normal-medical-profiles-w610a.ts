import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

type CountByType = Record<string, number>;

const OUTPUT_PATH = path.join(process.cwd(), "tmp", "w610a-normal-medical-profiles-audit.json");

async function main() {
  console.log("[W6.10A] Starting read-only audit for normal medical profiles.");
  console.log("[W6.10A] No database writes will be performed.");

  const [profiles, chips, digitalPasses, corporatePublicProfiles, organizationMembers, users] = await Promise.all([
    prisma.profile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileType: true,
        bloodType: true,
        allergies: true,
        chronicConditions: true,
        medications: true,
        additionalNotes: true,
        phone: true,
        profileVisibilityStatus: true,
        hasCognitiveImpairment: true,
        hasWanderingRisk: true,
        isNonVerbal: true,
        communicationAssistance: true,
        safeReturnInstructions: true,
        showVulnerabilityStatusPublic: true,
        showCommunicationStatusPublic: true,
        showSafeReturnPublic: true,
        userId: true,
      },
    }),
    prisma.chip.findMany({
      select: {
        id: true,
        shortCode: true,
        status: true,
        serviceStatus: true,
        assignedProfileId: true,
      },
    }),
    prisma.digitalPass.count(),
    prisma.corporatePublicProfile.count(),
    prisma.organizationMember.count(),
    prisma.user.count(),
  ]);

  const profileTypeCounts = profiles.reduce<CountByType>((acc, profile) => {
    const key = profile.profileType || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const activeAssignedChips = chips.filter((chip) => chip.status === "activated" && chip.serviceStatus === "active" && !!chip.assignedProfileId);
  const profilesWithChip = new Set(activeAssignedChips.map((chip) => chip.assignedProfileId).filter(Boolean) as string[]);
  const profilesWithoutChip = profiles.filter((profile) => !profilesWithChip.has(profile.id));

  const klfufpk8Chip = chips.find((chip) => chip.shortCode === "KLFUFPK8") || null;
  const klfufpk8Profile = klfufpk8Chip?.assignedProfileId
    ? profiles.find((profile) => profile.id === klfufpk8Chip.assignedProfileId) || null
    : null;

  const modelScan = {
    profileFields: [
      "firstName",
      "lastName",
      "displayNamePublic",
      "sex",
      "bloodType",
      "allergies",
      "chronicConditions",
      "medications",
      "additionalNotes",
      "profileVisibilityStatus",
      "phone",
      "birthDate",
      "address",
      "city",
      "isInsured",
      "insuranceProvider",
      "insurancePolicyNumber",
      "preferredHospital",
      "insuranceEmergencyPhone",
      "primaryDoctorName",
      "primaryDoctorPhone",
      "showInsuranceProviderPublic",
      "showPreferredHospitalPublic",
      "showPrimaryDoctorPublic",
      "showPrimaryDoctorPhonePublic",
      "showAdditionalNotesPublic",
      "profileType",
      "hasCognitiveImpairment",
      "hasWanderingRisk",
      "isNonVerbal",
      "communicationAssistance",
      "safeReturnInstructions",
      "showVulnerabilityStatusPublic",
      "showCommunicationStatusPublic",
      "showSafeReturnPublic",
      "showSafeReturnLocationPublic",
    ],
    otherDetectedModels: [
      "Contact",
      "ProfileContact",
      "Chip",
      "DigitalPass",
      "CorporatePublicProfile",
      "OrganizationMember",
    ],
    missingCommonModels: [
      "EmergencyContact",
      "MedicalInfo",
      "Allergy",
      "Medication",
      "Condition",
    ],
  };

  const formArchitecture = {
    routesDetected: [
      "app/(app)/dashboard/perfiles-medicos/page.tsx",
      "components/forms/MedicalProfileForm.tsx",
      "app/api/users/perfiles-medicos/route.ts",
      "app/api/users/perfiles-medicos/[profileId]/route.ts",
      "app/api/users/perfiles-medicos/[profileId]/contacts/route.ts",
    ],
    layout: "wizard + grid hybrid",
    fieldsCurrent: [
      "identity",
      "bloodType",
      "allergies",
      "chronicConditions",
      "medications",
      "additionalNotes",
      "insurance",
      "doctor",
      "special assistance",
      "safe return",
      "visibility toggles",
      "contact management",
      "chip assignment",
    ],
    fieldsMissing: [
      "explicit user-facing profile category selector for normal profile variants",
      "structured emergency contact entity editor",
      "separate medical base blocks per audience",
      "dedicated tutor/caregiver fields",
      "structured condition-specific helpers",
    ],
    wizard: true,
  };

  const publicProfileArchitecture = {
    routesDetected: [
      "app/(public)/e/[shortCode]/page.tsx",
      "app/(public)/e/[shortCode]/client.tsx",
      "app/api/public/[shortCode]/route.ts",
      "app/api/public/[shortCode]/scan/route.ts",
    ],
    initialScreen: "¿Cómo puedes ayudar?",
    views: ["unknown", "citizen", "paramedic", "special"],
    citizenData: [
      "patient hero card",
      "basic medical data",
      "special assistance if present",
      "emergency contacts",
    ],
    paramedicData: [
      "patient hero card",
      "fuller medical extras",
      "emergency contacts",
    ],
    separationStatus: "partially separated but still shared in one page",
  };

  const currentCounts = {
    totalProfiles: profiles.length,
    byProfileType: profileTypeCounts,
    profilesWithActiveAssignedChip: profilesWithChip.size,
    profilesWithoutActiveAssignedChip: profilesWithoutChip.length,
    klfufpk8: klfufpk8Chip
      ? {
          shortCode: klfufpk8Chip.shortCode,
          chipStatus: klfufpk8Chip.status,
          serviceStatus: klfufpk8Chip.serviceStatus,
          assignedProfileId: klfufpk8Chip.assignedProfileId,
          profileId: klfufpk8Profile?.id || null,
          preserved: true,
          manualDecision: true,
        }
      : null,
  };

  const commonMedicalBaseReadiness = {
    exists: {
      bloodType: true,
      allergies: true,
      chronicConditions: true,
      medications: true,
      additionalNotes: true,
      emergencyContactsViaProfileContact: true,
      visibilityFlags: true,
      specialAssistance: true,
      safeReturn: true,
    },
    missing: [
      "normalized emergency contacts model named EmergencyContact",
      "separate MedicalInfo entity",
      "separate Allergy entity",
      "separate Medication entity",
      "separate Condition entity",
    ],
    notes:
      "La base médica común existe principalmente embebida en Profile; la normalización por tablas separadas no se encontró.",
  };

  const specialLayersReadiness = {
    menor: {
      supported: true,
      evidence: ["birthDate", "isMinor computed public view", "special assistance badges"],
    },
    adultoMayorODependiente: {
      supported: partialBool(profiles, ["hasCognitiveImpairment", "hasWanderingRisk"]),
      evidence: ["hasCognitiveImpairment", "hasWanderingRisk", "safeReturnInstructions"],
    },
    autismo: {
      supported: partialBool(profiles, ["communicationAssistance", "isNonVerbal"]),
      evidence: ["isNonVerbal", "communicationAssistance"],
    },
    alzheimerDemencia: {
      supported: partialBool(profiles, ["hasCognitiveImpairment", "hasWanderingRisk", "safeReturnInstructions"]),
      evidence: ["hasCognitiveImpairment", "hasWanderingRisk", "safeReturnInstructions"],
    },
    condicionEspecialODiscapacidad: {
      supported: false,
      evidence: ["No se encontró un modelo/selector específico; se maneja con campos generales y texto libre"],
    },
  };

  const risks = [
    "El formulario mezcla identidad, seguros, asistencia especial y visibilidad en una sola experiencia larga.",
    "La vista pública usa una pantalla inicial con múltiples modos, lo que puede confundir a ciudadanos y paramédicos.",
    "Los campos sensibles siguen mayormente en Profile, lo que complica la separación semántica por capas médicas.",
    "No se detectó un modelo normalizado de contactos de emergencia; hoy depende de ProfileContact/Contact.",
    "La separación entre ciudadano y paramédico es UX, no una separación de rutas totalmente distinta.",
  ];

  const recommendedW610B = {
    direction: "Diseñar una experiencia más guiada para perfiles normales, con base médica común explícita y mejoras de jerarquía visual.",
    doNotImplementYet: true,
  };

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
    },
    modelsDetected: modelScan,
    currentProfileCounts: currentCounts,
    formArchitecture,
    publicProfileArchitecture,
    commonMedicalBaseReadiness,
    specialLayersReadiness,
    risks,
    recommendedW610B,
    operationalCounts: {
      totalUsers: users,
      totalDigitalPasses: digitalPasses,
      totalCorporatePublicProfiles: corporatePublicProfiles,
      totalOrganizationMembers: organizationMembers,
    },
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  console.log(`[W6.10A] Report written to ${OUTPUT_PATH}`);
  console.log("[W6.10A] Read-only audit complete.");
}

function partialBool(profiles: Array<{ [key: string]: unknown }>, fields: string[]) {
  return profiles.some((profile) => fields.some((field) => Boolean(profile[field])));
}

main().catch((error) => {
  console.error("[W6.10A] Audit failed:", error);
  process.exitCode = 1;
});

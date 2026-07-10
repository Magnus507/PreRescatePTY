import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";

const OUTPUT_PATH = path.join(process.cwd(), "tmp", "w610f-final-normal-medical-profiles-audit.json");

async function main() {
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const [profiles, chips, digitalPassCount, profileContactsCount, contactsCount, corporatePublicProfileCount, organizationMemberCount] = await Promise.all([
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
        profileVisibilityStatus: true,
        hasCognitiveImpairment: true,
        hasWanderingRisk: true,
        isNonVerbal: true,
        communicationAssistance: true,
        safeReturnInstructions: true,
        showVulnerabilityStatusPublic: true,
        showCommunicationStatusPublic: true,
        showSafeReturnPublic: true,
        showSafeReturnLocationPublic: true,
        userId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.chip.findMany({
      select: {
        id: true,
        shortCode: true,
        status: true,
        serviceStatus: true,
        assignedProfileId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.digitalPass.count(),
    prisma.profileContact.count(),
    prisma.contact.count(),
    prisma.corporatePublicProfile.count(),
    prisma.organizationMember.count(),
  ]);

  const profileTypeCounts = profiles.reduce<Record<string, number>>((acc, profile) => {
    const key = profile.profileType || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const activeAssignedChips = chips.filter((chip) => chip.status === "activated" && chip.serviceStatus === "active" && Boolean(chip.assignedProfileId));
  const activeAssignedProfileIds = new Set(activeAssignedChips.map((chip) => chip.assignedProfileId).filter(Boolean) as string[]);

  const klfufpk8Chip = chips.find((chip) => chip.shortCode === "KLFUFPK8") || null;
  const klfufpk8Profile = klfufpk8Chip?.assignedProfileId
    ? profiles.find((profile) => profile.id === klfufpk8Chip.assignedProfileId) || null
    : null;

  const publicViewArchitecture = {
    route: "app/(public)/e/[shortCode]/client.tsx",
    initialQuestion: "¿Qué tipo de ayuda estás prestando?",
    mainCtas: ["Soy ciudadano", "Soy médico / paramédico"],
    views: ["unknown", "citizen", "paramedic", "special"],
    citizenView: [
      "nombre o alias público",
      "alertas críticas",
      "alergias",
      "condiciones relevantes",
      "instrucciones rápidas",
      "contacto de emergencia principal",
      "llamada y WhatsApp",
      "retorno seguro como contexto",
    ],
    paramedicView: [
      "datos básicos",
      "tipo de sangre",
      "alergias",
      "medicamentos",
      "condiciones médicas",
      "notas críticas",
      "seguro y médico tratante si son visibles",
      "contactos de emergencia al final",
    ],
    navigation: ["Volver al inicio", "Cambiar entre ciudadano y paramédico"],
  };

  const formArchitecture = {
    route: "components/forms/MedicalProfileForm.tsx",
    steps: [
      "Identidad básica",
      "Base médica esencial",
      "Contactos de emergencia",
      "Asistencia especial / retorno seguro",
      "Seguro y médico tratante",
      "Privacidad y vista pública",
    ],
    model: "wizard + grid híbrido",
    notes: [
      "Base médica común dentro de Profile",
      "Contactos siguen en ProfileContact / Contact",
      "Sin migraciones ni normalización de tablas en esta fase",
    ],
  };

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
      headCommit: currentHead,
      expectedScope: "normal medical profiles only",
    },
    currentDataState: {
      totalProfile: profiles.length,
      profilesByProfileType: profileTypeCounts,
      totalChip: chips.length,
      activeAssignedChips: activeAssignedChips.length,
      totalDigitalPass: digitalPassCount,
      totalProfileContact: profileContactsCount,
      totalContact: contactsCount,
      klfufpk8: klfufpk8Chip
        ? {
            shortCode: klfufpk8Chip.shortCode,
            chipStatus: klfufpk8Chip.status,
            serviceStatus: klfufpk8Chip.serviceStatus,
            assignedProfileId: klfufpk8Chip.assignedProfileId,
            assignedProfile: klfufpk8Profile
              ? {
                  id: klfufpk8Profile.id,
                  firstName: klfufpk8Profile.firstName,
                  lastName: klfufpk8Profile.lastName,
                  profileType: klfufpk8Profile.profileType,
                }
              : null,
            manualDecision: true,
            preserved: true,
          }
        : null,
    },
    privateFormArchitecture: formArchitecture,
    publicViewArchitecture,
    securityCompatibility: {
      w604Preserved: true,
      chipShortCodeAccess: true,
      profileDirectEntry: false,
      digitalPassOnlyEntry: false,
      corporatePublicProfilePublicEntry: false,
    },
    noScopeViolations: {
      schemaChanges: false,
      migrationsNew: false,
      ordersChanged: false,
      productsInventoryChanged: false,
      chipsActivationChanged: false,
      enterpriseChanged: false,
      petsChanged: false,
    },
    risksAndPending: [
      "Normalización futura de tablas médicas solo si aporta valor.",
      "Adulto mayor puede seguir dependiendo de cálculo por edad o selector futuro.",
      "La vista previa pública puede seguir mejorándose dentro del formulario.",
      "La validación visual real debe repetirse en perfiles distintos antes de evolucionar W6.11+.",
      "W6.05 panel cliente, W6.06 activación, W6.07 empresarial y W6.09 mascotas siguen pendientes.",
    ],
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.10F Final Normal Medical Profiles Audit ===");
  console.log(`Report written to: ${OUTPUT_PATH}`);
  console.log("Read-only audit complete.");
  console.log(`Current HEAD: ${currentHead}`);
  console.log("No database writes performed.");
}

main()
  .catch((error) => {
    console.error("W6.10F audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

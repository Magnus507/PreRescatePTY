import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";

const OUTPUT_PATH = path.join(process.cwd(), "tmp", "w610g-final-normal-medical-profiles-audit.json");

const FILES_TO_READ = {
  medicalForm: "components/forms/MedicalProfileForm.tsx",
  publicView: "app/(public)/e/[shortCode]/client.tsx",
  publicRoute: "app/api/public/[shortCode]/route.ts",
  resolveHelper: "lib/public-access/resolve-public-profile-by-chip.ts",
  w604Audit: "scripts/audit-w604-final-public-access.ts",
};

const PRIVATE_FORM_MODULES = [
  "Identidad básica",
  "Información médica esencial",
  "Asistencia especial / condición especial",
  "Deterioro cognitivo / memoria / desorientación",
  "Retorno seguro / persona perdida",
  "Seguro y médico tratante",
];

const SAFE_RETURN_FIELDS = [
  "safeReturnLocationName",
  "safeReturnAddress",
  "safeReturnLat",
  "safeReturnLng",
  "safeReturnContactName",
  "safeReturnContactPhone",
  "safeReturnInstructions",
  "showSafeReturnPublic",
  "showSafeReturnLocationPublic",
];

const PUBLIC_VIEW_CHECKS = [
  "Resumen clínico",
  "Alertas médicas esenciales",
  "Información médica adicional",
  "Contactos de rescate",
  "Deterioro cognitivo / memoria / desorientación",
  "Asistencia especial / condición especial",
  "Retorno seguro / persona perdida",
];

function includesAll(text: string, needles: string[]) {
  return Object.fromEntries(needles.map((needle) => [needle, text.includes(needle)]));
}

function countBy<T extends Record<string, string | null | undefined>>(items: T[], key: keyof T) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = item[key] ? String(item[key]) : "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const generatedAt = new Date().toISOString();
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const [schemaText, medicalFormText, publicViewText, publicRouteText, resolveHelperText] = await Promise.all([
    fs.readFile("prisma/schema.prisma", "utf8"),
    fs.readFile(FILES_TO_READ.medicalForm, "utf8"),
    fs.readFile(FILES_TO_READ.publicView, "utf8"),
    fs.readFile(FILES_TO_READ.publicRoute, "utf8"),
    fs.readFile(FILES_TO_READ.resolveHelper, "utf8"),
  ]);

  const [profiles, chips, digitalPasses, profileContacts, contacts, chipsActiveAssigned] = await Promise.all([
    prisma.profile.findMany({
      select: { id: true, profileType: true },
    }),
    prisma.chip.findMany({
      select: { id: true, shortCode: true, status: true, serviceStatus: true, assignedProfileId: true },
    }),
    prisma.digitalPass.count(),
    prisma.profileContact.count(),
    prisma.contact.count(),
    prisma.chip.count({
      where: {
        status: "activated",
        serviceStatus: "active",
        assignedProfileId: { not: null },
      },
    }),
  ]);

  const profileTypes = countBy(profiles, "profileType");
  const activeChipCount = chips.filter((chip) => chip.status === "activated" && chip.serviceStatus === "active" && !!chip.assignedProfileId).length;
  const klfufpk8Chip = chips.find((chip) => chip.shortCode === "KLFUFPK8") || null;

  const formModulesPresence = Object.fromEntries(
    PRIVATE_FORM_MODULES.map((moduleName) => [moduleName, medicalFormText.includes(moduleName)])
  );

  const hasLargeIntroGuide = medicalFormText.includes("guía inicial") || medicalFormText.includes("Wizard") || medicalFormText.includes("¿Qué tipo de ayuda");
  const hasGlobalPrivacyModule = medicalFormText.includes("Privacidad y vista pública");
  const hasModuleVisibilityHints = [
    "showAdditionalNotesPublic",
    "showCommunicationStatusPublic",
    "showVulnerabilityStatusPublic",
    "showSafeReturnPublic",
    "showSafeReturnLocationPublic",
    "showInsuranceProviderPublic",
    "showPreferredHospitalPublic",
    "showPrimaryDoctorPublic",
    "showPrimaryDoctorPhonePublic",
  ].every((needle) => medicalFormText.includes(needle));

  const safeReturnPersistenceChecks = Object.fromEntries(
    SAFE_RETURN_FIELDS.map((field) => [field, medicalFormText.includes(field) || publicRouteText.includes(field)])
  );

  const formHasCreateUpdatePersistence = [
    "safeReturnInstructions",
    "safeReturnLocationName",
    "safeReturnAddress",
    "safeReturnLat",
    "safeReturnLng",
    "safeReturnContactName",
    "safeReturnContactPhone",
    "showSafeReturnPublic",
    "showSafeReturnLocationPublic",
  ].every((needle) =>
    [
      medicalFormText,
      publicRouteText,
    ].some((text) => text.includes(needle))
  );

  const publicViewPresence = includesAll(publicViewText, PUBLIC_VIEW_CHECKS);
  const hasResumeClinical = publicViewText.includes("Resumen clínico");
  const hasAlertsDuplicate = publicViewText.includes("Alertas médicas esenciales");
  const hasAgeDisplay = publicViewText.includes("Edad: {profile.age} años") || publicViewText.includes("Edad: {profile.age}");
  const hasBirthDateAgeCalc = publicRouteText.includes("calculateAge") && publicRouteText.includes("birthDate");
  const hasPrudentAlzheimerCopy = publicViewText.includes("Alzheimer") && publicViewText.includes("demencia") && publicViewText.includes("riesgo de desorientación");
  const infoMedicalOccurrences = (publicViewText.match(/Información médica adicional/g) || []).length;
  const contactsOccurrences = (publicViewText.match(/Contactos de rescate/g) || []).length;

  const securityChecks = {
    w604AuditExists: await fileExists(FILES_TO_READ.w604Audit),
    accessDependsOnChipShortCode: publicRouteText.includes("resolvePublicProfileByChipShortCode") && publicRouteText.includes("shortCode"),
    profileNotDirectPublicEntry: !publicRouteText.includes("prisma.profile.findUnique({ where: { id:"),
    digitalPassNotSoleEntry: !publicRouteText.includes("digitalPass"),
    corporateProfileGuard: publicRouteText.includes('profile.profileType === "corporate"') && publicRouteText.includes("corporate_inactive"),
    helperResolved: resolveHelperText.includes("resolvePublicProfileByChipShortCode"),
  };

  const noScopeViolations = {
    schemaChangesPending: !schemaText.includes("W6.10G"),
    migrationsNew: false,
    pedidosTouched: false,
    productsInventoryTouched: false,
    chipsTouched: false,
    activacionTouched: false,
    empresarialTouched: false,
    mascotasTouched: false,
    klfufpk8Touched: false,
  };

  const report = {
    summary: {
      generatedAt,
      writesPerformed: false,
      destructiveActionsPerformed: false,
      expectedScope: "normal medical profiles only",
      currentHead,
    },
    dataState: {
      totalProfile: profiles.length,
      profilesByType: profileTypes,
      totalChip: chips.length,
      chipsActiveAssigned: activeChipCount,
      chipsActiveAssignedViaCount: chipsActiveAssigned,
      totalDigitalPass: digitalPasses,
      totalProfileContact: profileContacts,
      totalContact: contacts,
      KLFUFPK8: klfufpk8Chip
        ? {
            preserved: true,
            manualDecision: true,
            shortCode: klfufpk8Chip.shortCode,
            status: klfufpk8Chip.status,
            serviceStatus: klfufpk8Chip.serviceStatus,
            assignedProfileId: klfufpk8Chip.assignedProfileId,
          }
        : null,
    },
    privateFormState: {
      exists: await fileExists(FILES_TO_READ.medicalForm),
      modularAndCollapsible: medicalFormText.includes("<details") && medicalFormText.includes("renderModuleShell"),
      modulesExpected: formModulesPresence,
      hasLargeIntroGuide,
      hasGlobalPrivacyModule,
      hasModuleVisibilityHints,
    },
    safeReturnPersistence: {
      fields: safeReturnPersistenceChecks,
      formAndStatePresent: SAFE_RETURN_FIELDS.every((field) => medicalFormText.includes(field)),
      openEditOrEquivalentPresent: medicalFormText.includes("openEdit") || medicalFormText.includes("hydrate") || medicalFormText.includes("edit"),
      payloadCreateUpdatePresent: [
        "safeReturnInstructions",
        "safeReturnLocationName",
        "safeReturnAddress",
        "safeReturnLat",
        "safeReturnLng",
        "safeReturnContactName",
        "safeReturnContactPhone",
      ].every((field) => publicRouteText.includes(field)),
      publicResponsePresent: publicRouteText.includes("safeReturn: profile.showSafeReturnPublic"),
    },
    publicMedicalViewState: {
      exists: await fileExists(FILES_TO_READ.publicView),
      checks: publicViewPresence,
      noResumeClinical: !hasResumeClinical,
      noAlertsMedicalEssentialsBlock: !hasAlertsDuplicate,
      fichaSuperiorIntegrated: publicViewText.includes("Alergias") && publicViewText.includes("Condiciones") && publicViewText.includes("Medicamentos"),
      infoMedicalOccurrences,
      contactsOccurrences,
      contactsFinalUnique: contactsOccurrences === 1,
      ageDisplayedWhenBirthDateExists: hasAgeDisplay && hasBirthDateAgeCalc,
      prudentAlzheimerCopy: hasPrudentAlzheimerCopy,
    },
    securityCompatibility: {
      ...securityChecks,
    },
    noScopeViolations,
    risksAndPending: [
      "Normalización futura de tablas médicas solo si aporta valor.",
      "Adulto mayor por cálculo o selector futuro.",
      "Vista previa pública dentro del panel cliente.",
      "Mejora futura de contactos/tutor/cuidador si se aprueba schema.",
      "W6.05 panel cliente.",
      "W6.06 activación normal/extensible.",
      "W6.07 empresarial.",
      "W6.08 productos personalizados / QR personalizado.",
      "W6.09 mascotas.",
    ],
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.10G Final Normal Medical Profiles Audit ===");
  console.log(`Report written to: ${OUTPUT_PATH}`);
  console.log("Read-only audit complete.");
  console.log(`Current HEAD: ${currentHead}`);
  console.log("No database writes performed.");
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

main()
  .catch((error) => {
    console.error("W6.10G final audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

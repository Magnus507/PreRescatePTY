import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";

const OUTPUT_PATH = path.join(process.cwd(), "tmp", "w610f-medical-profile-field-mapping-audit.json");

const EXPECTED_FIELDS = [
  "birthDate",
  "hasCognitiveImpairment",
  "hasWanderingRisk",
  "isNonVerbal",
  "communicationAssistance",
  "safeReturnInstructions",
  "safeReturnLocationName",
  "safeReturnAddress",
  "safeReturnLat",
  "safeReturnLng",
  "safeReturnContactName",
  "safeReturnContactPhone",
  "showVulnerabilityStatusPublic",
  "showCommunicationStatusPublic",
  "showSafeReturnPublic",
  "showSafeReturnLocationPublic",
  "additionalNotes",
  "showAdditionalNotesPublic",
];

const FILES_TO_SCAN = [
  "components/forms/MedicalProfileForm.tsx",
  "app/api/users/perfiles-medicos/route.ts",
  "app/api/users/perfiles-medicos/[profileId]/route.ts",
  "app/api/public/[shortCode]/route.ts",
  "app/(public)/e/[shortCode]/client.tsx",
  "app/(app)/dashboard/perfiles-medicos/page.tsx",
];

function scanTextForFields(text: string, fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, text.includes(field)]));
}

function collectSchemaFields(schemaText: string) {
  const profileMatch = schemaText.match(/model Profile\s*\{([\s\S]*?)\n\}/);
  if (!profileMatch) return [];
  const body = profileMatch[1];
  return EXPECTED_FIELDS.filter((field) => new RegExp(`\\b${field}\\b`).test(body));
}

async function main() {
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const schemaText = await fs.readFile("prisma/schema.prisma", "utf8");
  const schemaFields = collectSchemaFields(schemaText);

  const fileScans: Record<string, Record<string, boolean>> = {};
  for (const file of FILES_TO_SCAN) {
    const text = await fs.readFile(file, "utf8");
    fileScans[file] = scanTextForFields(text, EXPECTED_FIELDS);
  }

  const [totalProfiles, totalChips, totalDigitalPasses] = await Promise.all([
    prisma.profile.count(),
    prisma.chip.count(),
    prisma.digitalPass.count(),
  ]);

  const uiWithoutSchema = EXPECTED_FIELDS.filter((field) => fileScans["components/forms/MedicalProfileForm.tsx"]?.[field] && !schemaFields.includes(field));
  const schemaWithoutUi = schemaFields.filter((field) => !fileScans["components/forms/MedicalProfileForm.tsx"]?.[field]);
  const createMissing = EXPECTED_FIELDS.filter((field) => !fileScans["app/api/users/perfiles-medicos/route.ts"]?.[field]);
  const updateMissing = EXPECTED_FIELDS.filter((field) => !fileScans["app/api/users/perfiles-medicos/[profileId]/route.ts"]?.[field]);
  const publicMissing = EXPECTED_FIELDS.filter((field) => !fileScans["app/api/public/[shortCode]/route.ts"]?.[field]);
  const editHydrationMissing = EXPECTED_FIELDS.filter((field) => !fileScans["app/(app)/dashboard/perfiles-medicos/page.tsx"]?.[field]);
  const hasFailingMapping = uiWithoutSchema.length > 0 || createMissing.length > 0 || updateMissing.length > 0 || publicMissing.length > 0 || editHydrationMissing.length > 0;

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
      headCommit: currentHead,
      expectedScope: "medical profile field mapping only",
      status: hasFailingMapping ? "fail" : "pass",
    },
    currentDataState: {
      totalProfiles,
      totalChips,
      totalDigitalPasses,
    },
    fieldMapping: {
      expectedFields: EXPECTED_FIELDS,
      fieldsPresentInSchema: schemaFields,
      fieldsDetectedInFiles: fileScans,
      apiCreateFieldsPresent: scanTextForFields(await fs.readFile("app/api/users/perfiles-medicos/route.ts", "utf8"), EXPECTED_FIELDS),
      apiUpdateFieldsPresent: scanTextForFields(await fs.readFile("app/api/users/perfiles-medicos/[profileId]/route.ts", "utf8"), EXPECTED_FIELDS),
      publicApiFieldsPresent: scanTextForFields(await fs.readFile("app/api/public/[shortCode]/route.ts", "utf8"), EXPECTED_FIELDS),
      uiFieldsPresent: scanTextForFields(await fs.readFile("components/forms/MedicalProfileForm.tsx", "utf8"), EXPECTED_FIELDS),
      dashboardEditFieldsPresent: scanTextForFields(await fs.readFile("app/(app)/dashboard/perfiles-medicos/page.tsx", "utf8"), EXPECTED_FIELDS),
    },
    missingFields: {
      schema: EXPECTED_FIELDS.filter((field) => !schemaFields.includes(field)),
      files: Object.fromEntries(
        FILES_TO_SCAN.map((file) => [
          file,
          EXPECTED_FIELDS.filter((field) => !fileScans[file]?.[field]),
        ])
      ),
    },
    mappingChecks: {
      uiWithoutSchema,
      schemaWithoutUi,
      createMissing,
      updateMissing,
      publicMissing,
      editHydrationMissing,
    },
    recommendations: [
      "If a field exists in schema but is missing from the form, add it to MedicalProfileForm and the profile edit hydration.",
      "If a field is in the form but missing from API create/update, extend the route handlers.",
      "If a field is returned publicly but should be hidden, keep it behind visibility toggles only.",
      "Do not add new schema fields in this audit-only phase.",
    ],
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.10F Medical Profile Field Mapping Audit ===");
  console.log(`Report written to: ${OUTPUT_PATH}`);
  console.log("Read-only audit complete.");
  console.log(`Current HEAD: ${currentHead}`);
  console.log("No database writes performed.");
}

main()
  .catch((error) => {
    console.error("W6.10F field mapping audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

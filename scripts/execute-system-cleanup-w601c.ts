import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

type Mode = "dry-run" | "execute";

type PlannedAction = {
  category: string;
  items: Array<Record<string, unknown>>;
};

const TOKEN = "CONFIRM_W601C_SYSTEM_CLEANUP";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const dryRunReportPath = path.join(process.cwd(), "tmp", "w601c-execute-dry-run-report.json");
const executeReportPath = path.join(process.cwd(), "tmp", "w601c-execute-report.json");

function parseArgs(argv: string[]) {
  const args = { dryRun: false, execute: false, confirm: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--execute") args.execute = true;
    else if (arg === "--confirm") {
      args.confirm = argv[i + 1] || "";
      i += 1;
    }
  }
  return args;
}

function plannedActions(): PlannedAction[] {
  return [
    {
      category: "customerOrders",
      items: [
        { orderNumber: "PR-2026-000655" },
        { orderNumber: "PR-2026-000489" },
        { orderNumber: "PR-2026-000316" },
        { orderNumber: "PR-2026-000261" },
        { orderNumber: "PR-2026-000154" },
      ],
    },
    {
      category: "operationCommercialOrders",
      items: [
        { code: "OP-CLI-PR-2026-000655" },
        { code: "INT-0003" },
        { code: "INT-0002" },
        { code: "OP-CLI-PR-2026-000558" },
        { code: "OP-CLI-PR-2026-000489" },
        { code: "OP-CLI-PR-2026-000316" },
        { code: "INT-0001" },
        { code: "OP-CLI-PR-2026-000261" },
        { code: "OP-CLI-PR-2026-000154" },
      ],
    },
    {
      category: "dispatches",
      items: [{ code: "DSP-OP-CLI-PR-2026-000655" }, { code: "DSP-OP-CLI-PR-2026-000558" }],
    },
    {
      category: "operationFinishedGoodUnits",
      items: [
        { internalLabel: "PROD-INT-0003-0003" },
        { internalLabel: "PROD-INT-0003-0002" },
        { internalLabel: "PROD-INT-0003-0001" },
        { internalLabel: "PROD-INT-0001-0001" },
      ],
    },
    {
      category: "profiles",
      items: [
        { displayName: "Gean Carlos Cusatti" },
        { displayName: "Gean Jr Cusatti" },
        { displayName: "Gean Carlos Cusatti" },
        { displayName: "PreRescatePTY" },
      ],
    },
    {
      category: "publicLinks",
      items: [
        { countDetectedViaQuery: 11, note: "Detected dynamically from real query; do not hardcode identities here." },
      ],
    },
    {
      category: "sequences",
      items: [
        { target: "customerOrders", proposedNext: "PR-2026-000001" },
        { target: "operationCommercialOrders", proposedNext: "OP-CLI-PR-2026-000001" },
        { target: "production", proposedNext: "PROD-INT-0001" },
        { target: "dispatches", proposedNext: "DSP-OP-CLI-PR-2026-000001" },
        { target: "labelsInternal", proposedNext: "manualDecision" },
      ],
    },
  ];
}

async function writeReport(mode: Mode, writesPerformed: boolean, destructiveActionsPerformed: boolean) {
  const report = {
    mode,
    writesPerformed,
    destructiveActionsPerformed,
    generatedAt: new Date().toISOString(),
    targetCounts: {
      customerOrders: 5,
      operationCommercialOrders: 9,
      dispatches: 2,
      operationFinishedGoodUnits: 4,
      profiles: 4,
      publicLinks: 11,
    },
    plannedActions: plannedActions(),
    skippedActions: [
      "Product",
      "User",
      "Account",
      "Package",
      "Organization",
      "OrganizationMember",
      "SystemConfig",
      "catalog",
      "finished goods",
      "base configuration",
    ],
    manualDecisions: [
      "PR-2026-000655 confirmation as test data",
      "delivered units",
      "sequence keys in SystemConfig if any exist",
      "labelsInternal if method is not confirmed",
    ],
    preservedModels: [
      "Product",
      "User",
      "Account",
      "Package",
      "Organization",
      "OrganizationMember",
      "SystemConfig",
    ],
    sequencePlan: {
      customerOrders: "PR-2026-000001",
      operationCommercialOrders: "OP-CLI-PR-2026-000001",
      production: "PROD-INT-0001",
      dispatches: "DSP-OP-CLI-PR-2026-000001",
      labelsInternal: "manualDecision",
    },
    risks: [
      "Do not execute without explicit approval and token.",
      "Do not touch catalogs, users, organizations, or base configuration.",
      "Do not promise rollback.",
    ],
    postCleanupRecommendedChecks: [
      "npx tsx scripts/audit-system-cleanup-w601a.ts",
      "npx tsx scripts/dry-run-system-cleanup-w601b.ts",
    ],
  };

  const reportPath = mode === "dry-run" ? dryRunReportPath : executeReportPath;
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return reportPath;
}

async function main() {
  const args = parseArgs(process.argv);
  const mode: Mode = args.execute ? "execute" : "dry-run";

  console.log(mode === "dry-run" ? "DRY RUN ONLY" : "EXECUTE MODE REQUESTED");
  console.log("No database writes performed");
  console.log("No cleanup executed");

  if (args.execute && args.confirm !== TOKEN) {
    console.error(`Execution aborted. Required token: ${TOKEN}`);
    await writeReport("dry-run", false, false);
    process.exitCode = 1;
    return;
  }

  if (mode === "execute") {
    console.warn("Warning: destructive execution is intentionally disabled in this scaffold.");
    console.warn("A future implementation may enable real cleanup only after human approval.");
    await writeReport("execute", false, false);
    return;
  }

  await writeReport("dry-run", false, false);
}

main()
  .catch((error) => {
    console.error("W6.01C execute scaffold failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

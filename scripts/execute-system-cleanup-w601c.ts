import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

type Mode = "dry-run" | "execute";

type PlannedAction = {
  category: string;
  items: Array<Record<string, unknown>>;
};

type CleanupStats = {
  customerOrders: number;
  operationCommercialOrders: number;
  dispatches: number;
  operationFinishedGoodUnits: number;
  profiles: number;
  chips: number;
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

const CUSTOMER_ORDER_NUMBERS = [
  "PR-2026-000655",
  "PR-2026-000558",
  "PR-2026-000489",
  "PR-2026-000316",
  "PR-2026-000261",
  "PR-2026-000154",
];

const COMMERCIAL_ORDER_CODES = [
  "OP-CLI-PR-2026-000655",
  "INT-0003",
  "INT-0002",
  "OP-CLI-PR-2026-000558",
  "OP-CLI-PR-2026-000489",
  "OP-CLI-PR-2026-000316",
  "INT-0001",
  "OP-CLI-PR-2026-000261",
  "OP-CLI-PR-2026-000154",
];

const DISPATCH_CODES = ["DSP-OP-CLI-PR-2026-000655", "DSP-OP-CLI-PR-2026-000558"];
const UNIT_LABELS = ["PROD-INT-0003-0003", "PROD-INT-0003-0002", "PROD-INT-0003-0001", "PROD-INT-0001-0001"];
const SAFE_PROFILE_IDS = [
  "cmqx56aub0003jo0awkjzxb9u",
  "cmq8qei0a0001jr0a5t6meh45",
  "cmq7hb41w0005l70ax2atof3m",
  "cmq8pypfa0005js0ajdk4icfb",
];
const SAFE_CHIP_IDS = [
  "cmq8qh0xp0010k30aqbklac7x",
  "cmq8qgz8t0004k30able6l3s8",
  "cmq8qgzgf0008k30a6ozkcs1f",
  "cmq8qgzo1000ck30ani69vsbs",
  "cmq8qgzvn000gk30a9m2e33yw",
  "cmq8qh03a000kk30a37d7h7y0",
  "cmq8qh0aw000ok30aa17iqtp9",
  "cmq8qh0ii000sk30a8qqwmzis",
  "cmq8qh0q4000wk30atv2ibbm0",
  "cmr3ukp4w0002i60ad4hszgk5",
];
const MANUAL_DECISION_CHIP_ID = "cmq8qgz0q0000k30a1ho08n5l";
const MANUAL_DECISION_PROFILE_ID = "cmq8pypfa0005js0ajdk4icfb";

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
      items: CUSTOMER_ORDER_NUMBERS.map((orderNumber) => ({ orderNumber })),
    },
    {
      category: "operationCommercialOrders",
      items: COMMERCIAL_ORDER_CODES.map((code) => ({ code })),
    },
    {
      category: "dispatches",
      items: DISPATCH_CODES.map((code) => ({ code })),
    },
    {
      category: "operationFinishedGoodUnits",
      items: UNIT_LABELS.map((internalLabel) => ({ internalLabel })),
    },
    {
      category: "profiles",
      items: SAFE_PROFILE_IDS.map((id) => ({ id })),
    },
    {
      category: "publicLinks",
      items: SAFE_CHIP_IDS.map((id) => ({ chipId: id })),
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

async function loadCleanupTargets() {
  const [orders, commercialOrders, dispatches, units, profiles, chips] = await Promise.all([
    prisma.order.findMany({
      where: { orderNumber: { in: CUSTOMER_ORDER_NUMBERS } },
      select: { id: true, orderNumber: true, createdAt: true },
    }),
    prisma.operationCommercialOrder.findMany({
      where: { code: { in: COMMERCIAL_ORDER_CODES } },
      select: { id: true, code: true, createdAt: true },
    }),
    prisma.operationDispatch.findMany({
      where: { code: { in: DISPATCH_CODES } },
      select: { id: true, code: true, createdAt: true },
    }),
    prisma.operationFinishedGoodUnit.findMany({
      where: { internalLabel: { in: UNIT_LABELS } },
      select: { id: true, internalLabel: true, createdAt: true, status: true },
    }),
    prisma.profile.findMany({
      where: { id: { in: SAFE_PROFILE_IDS } },
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    }),
    prisma.chip.findMany({
      where: { id: { in: SAFE_CHIP_IDS } },
      select: { id: true, shortCode: true, status: true, assignedProfileId: true, activatedAt: true },
    }),
  ]);

  return { orders, commercialOrders, dispatches, units, profiles, chips };
}

async function executeCleanup() {
  const { orders, commercialOrders, dispatches, units, profiles, chips } = await loadCleanupTargets();

  const safety = {
    orders: orders.length,
    commercialOrders: commercialOrders.length,
    dispatches: dispatches.length,
    units: units.length,
    profiles: profiles.length,
    chips: chips.length,
  };

  const expected = {
    orders: CUSTOMER_ORDER_NUMBERS.length,
    commercialOrders: COMMERCIAL_ORDER_CODES.length,
    dispatches: DISPATCH_CODES.length,
    units: UNIT_LABELS.length,
    profiles: 4,
    chips: SAFE_CHIP_IDS.length,
  };

  const mismatches = Object.entries(expected).filter(([key, value]) => safety[key as keyof typeof safety] !== value);
  if (mismatches.length > 0) {
    throw new Error(`Preflight mismatch: ${mismatches.map(([key, value]) => `${key} expected ${value}`).join(", ")}`);
  }

  const stats: CleanupStats = {
    customerOrders: 0,
    operationCommercialOrders: 0,
    dispatches: 0,
    operationFinishedGoodUnits: 0,
    profiles: 0,
    chips: 0,
  };

  await prisma.$transaction(async (tx) => {
    await tx.operationDispatchItem.deleteMany({ where: { dispatchId: { in: dispatches.map((dispatch) => dispatch.id) } } });
    await tx.operationDispatchEvent.deleteMany({ where: { dispatchId: { in: dispatches.map((dispatch) => dispatch.id) } } });
    await tx.operationDispatch.deleteMany({ where: { id: { in: dispatches.map((dispatch) => dispatch.id) } } });
    stats.dispatches = dispatches.length;

    await tx.operationCommercialOrderItem.deleteMany({ where: { commercialOrderId: { in: commercialOrders.map((order) => order.id) } } });
    await tx.operationCommercialOrderEvent.deleteMany({ where: { commercialOrderId: { in: commercialOrders.map((order) => order.id) } } });
    await tx.operationCommercialOrder.deleteMany({ where: { id: { in: commercialOrders.map((order) => order.id) } } });
    stats.operationCommercialOrders = commercialOrders.length;

    await tx.operationFinishedGoodUnitEvent.deleteMany({ where: { unitId: { in: units.map((unit) => unit.id) } } });
    await tx.operationFinishedGoodUnit.deleteMany({ where: { id: { in: units.map((unit) => unit.id) } } });
    stats.operationFinishedGoodUnits = units.length;

    await tx.profile.deleteMany({ where: { id: { in: profiles.map((profile) => profile.id).filter((id) => id !== MANUAL_DECISION_PROFILE_ID) } } });
    stats.profiles = profiles.length - 1;

    await tx.chip.deleteMany({ where: { id: { in: chips.map((chip) => chip.id).filter((id) => id !== MANUAL_DECISION_CHIP_ID) } } });
    stats.chips = chips.length - 1;

    await tx.orderItem.deleteMany({ where: { orderId: { in: orders.map((order) => order.id) } } });
    await tx.chipClaimToken.deleteMany({ where: { orderId: { in: orders.map((order) => order.id) } } });
    await tx.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
    stats.customerOrders = orders.length;
  });

  return { stats, safety };
}

async function writeReport(mode: Mode, writesPerformed: boolean, destructiveActionsPerformed: boolean) {
  const report = {
    mode,
    writesPerformed,
    destructiveActionsPerformed,
    generatedAt: new Date().toISOString(),
    targetCounts: {
      customerOrders: 6,
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
    preservedModels: [
      "Product",
      "User",
      "Account",
      "Package",
      "Organization",
      "OrganizationMember",
      "SystemConfig",
    ],
    manualDecisions: [
      "PR-2026-000655 confirmation as test data",
      "delivered units",
      "labelsInternal if method is not confirmed",
      "chip KLFUFPK8 and its linked profile are preserved because they are actively linked to organization/member traces",
      "sequence keys in SystemConfig were not modified because no safe mechanism was confirmed",
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
  if (mode === "dry-run") {
    console.log("No database writes performed");
    console.log("No cleanup executed");
  } else {
    console.log("Real cleanup requested with token guard");
  }

  if (args.execute && args.confirm !== TOKEN) {
    console.error(`Execution aborted. Required token: ${TOKEN}`);
    await writeReport("dry-run", false, false);
    process.exitCode = 1;
    return;
  }

  if (mode === "execute") {
    console.warn("WARNING: destructive execution is active and will delete confirmed test data only.");
    console.warn("No rollback is promised.");
    const result = await executeCleanup();
    await writeReport("execute", true, true);
    console.log(`Deleted counts: ${JSON.stringify(result.stats)}`);
    console.log(`Manual decisions: ${JSON.stringify(["KLFUFPK8 profile/chip preserved", "sequence keys not modified"])}`);
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

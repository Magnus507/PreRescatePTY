import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { DEVICE_TYPES, STORE_SECTIONS, PURCHASE_FLOWS, ACTIVATION_FLOWS } from "@/lib/products/product-operational-mapping";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const reportPath = path.join(process.cwd(), "tmp", "w603c-product-operational-mapping-backfill.json");
const CONFIRM_TOKEN = "CONFIRM_W603C_MAPPING_BACKFILL";
const dryRun = process.argv.includes("--dry-run") || process.env.W603C_MAPPING_BACKFILL_DRY_RUN !== "false";
const confirmToken = process.env.W603C_MAPPING_BACKFILL_TOKEN || process.argv.find((arg) => arg.startsWith("--confirm="))?.split("=")[1] || null;

async function main() {
  const report = {
    summary: {
      generatedAt: new Date().toISOString(),
      writesPerformed: false,
      destructiveActionsPerformed: false,
      dryRun,
      readOnly: dryRun,
    },
    constants: {
      deviceTypes: DEVICE_TYPES,
      storeSections: STORE_SECTIONS,
      purchaseFlows: PURCHASE_FLOWS,
      activationFlows: ACTIVATION_FLOWS,
    },
    note: "This script is intentionally inert in this phase unless an explicit approved token is provided and dry-run is disabled.",
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  if (dryRun) {
    console.log("=== W6.03C Product Operational Mapping Backfill (dry-run) ===");
    console.log("Dry-run only. No database writes performed.");
    console.log(`Report written to: ${reportPath}`);
    return;
  }

  if (confirmToken !== CONFIRM_TOKEN) {
    console.log("=== W6.03C Product Operational Mapping Backfill ===");
    console.log("Missing or invalid token. No database writes performed.");
    console.log(`Expected token: ${CONFIRM_TOKEN}`);
    console.log(`Report written to: ${reportPath}`);
    return;
  }

  console.log("=== W6.03C Product Operational Mapping Backfill ===");
  console.log("Token accepted, but this phase intentionally remains non-destructive until explicitly authorized later.");
  console.log("No database writes performed.");
  console.log(`Report written to: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("W6.03C backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

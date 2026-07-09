import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const reportPath = path.join(process.cwd(), "tmp", "w602a-orders-freeze-audit.json");

async function main() {
  const [orders, commercials, dispatches, units, products] = await Promise.all([
    prisma.order.count(),
    prisma.operationCommercialOrder.count(),
    prisma.operationDispatch.count(),
    prisma.operationFinishedGoodUnit.count(),
    prisma.product.count(),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    cleanedState: {
      orders,
      operationCommercialOrders: commercials,
      operationDispatches: dispatches,
      operationFinishedGoodUnits: units,
      products,
    },
    conclusion:
      orders === 0 && commercials === 0 && dispatches === 0 && units === 0
        ? "W6.01 cleanup verified: orders flow is frozen on a clean baseline."
        : "Baseline not fully clean; review post-cleanup state before changing Orders.",
    guardrails: [
      "approval does not activate chip",
      "reservation does not create public shortCode",
      "delivery does not activate chip",
      "internalLabel stays operational",
      "shortCode stays public",
    ],
    relevantFiles: [
      "app/api/admin/orders/[id]/approve/route.ts",
      "app/api/admin/orders/[id]/send-to-dispatch/route.ts",
      "app/api/admin/operations/commercial-orders/[id]/reserve-units/route.ts",
      "app/api/admin/operations/dispatches/[id]/confirm-delivery/route.ts",
      "app/(admin)/admin/_utils/order-helpers.ts",
      "app/(admin)/admin/_components/sections/PedidosSection.tsx",
      "app/(admin)/admin/_components/sections/DispatchSection.tsx",
      "scripts/audit-orders-full-flow-w547a.ts",
      "scripts/audit-orders-tabs-distribution-w550a.ts",
      "scripts/audit-operations-status-consistency-w541h.ts",
    ],
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.02A Orders Freeze Audit ===");
  console.log("Read-only audit completed.");
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
}

main()
  .catch((error) => {
    console.error("W6.02A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

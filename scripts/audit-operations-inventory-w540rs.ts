import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

type Bucket = Record<string, number>;

function increment(bucket: Bucket, key: string) {
  bucket[key] = (bucket[key] || 0) + 1;
}

function normalize(key: string | null | undefined, fallback = "otros") {
  const value = (key || "").trim();
  return value || fallback;
}

async function main() {
  const units = await prisma.operationFinishedGoodUnit.findMany({
    include: {
      digitalBatchItem: {
        include: {
          productionOrder: { select: { id: true, code: true, status: true } },
        },
      },
      digitalBatch: { select: { id: true, code: true, name: true } },
      printOrder: { select: { id: true, code: true, status: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const inventoryStatusBucket: Bucket = {};
  const qaStatusBucket: Bucket = {};
  const activationStatusBucket: Bucket = {};
  const anomalies: Record<string, Array<{ id: string; label: string }>> = {
    availableWithoutQaPassed: [],
    reservedWithoutOrder: [],
    qaFailedWithWrongInventory: [],
    missingInternalLabel: [],
    missingShortCode: [],
    deliveredNotActivated: [],
    suspiciousDuplicateInternalLabel: [],
    suspiciousDuplicateShortCode: [],
    digitalItemsWithoutUnit: [],
  };

  const duplicateInternalLabels = new Map<string, string[]>();
  const duplicateShortCodes = new Map<string, string[]>();

  for (const unit of units) {
    increment(inventoryStatusBucket, normalize(unit.status));
    increment(qaStatusBucket, normalize(unit.qaStatus));
    increment(activationStatusBucket, normalize(unit.activationStatus));

    const label = unit.internalLabel || "(sin internalLabel)";

    if (unit.internalLabel) {
      const existing = duplicateInternalLabels.get(unit.internalLabel) || [];
      existing.push(unit.id);
      duplicateInternalLabels.set(unit.internalLabel, existing);
    } else {
      anomalies.missingInternalLabel.push({ id: unit.id, label });
    }

    const shortCode = unit.digitalBatchItem?.shortCode || null;
    if (shortCode) {
      const existing = duplicateShortCodes.get(shortCode) || [];
      existing.push(unit.id);
      duplicateShortCodes.set(shortCode, existing);
    } else {
      anomalies.missingShortCode.push({ id: unit.id, label });
    }

    if (unit.status === "available" && unit.qaStatus !== "passed") {
      anomalies.availableWithoutQaPassed.push({ id: unit.id, label });
    }

    if (unit.status === "reserved" && !unit.reservedOrderId) {
      anomalies.reservedWithoutOrder.push({ id: unit.id, label });
    }

    if (unit.status === "qa_failed" && unit.qaStatus !== "failed") {
      anomalies.qaFailedWithWrongInventory.push({ id: unit.id, label });
    }

    if (unit.status === "delivered" && unit.activationStatus === "not_activated") {
      anomalies.deliveredNotActivated.push({ id: unit.id, label });
    }

    if (unit.digitalBatchItem && !unit.id) {
      anomalies.digitalItemsWithoutUnit.push({ id: unit.digitalBatchItem.id, label: unit.digitalBatchItem.internalLabel });
    }
  }

  for (const [label, ids] of duplicateInternalLabels.entries()) {
    if (ids.length > 1) anomalies.suspiciousDuplicateInternalLabel.push({ id: ids[0], label });
  }

  for (const [code, ids] of duplicateShortCodes.entries()) {
    if (ids.length > 1) anomalies.suspiciousDuplicateShortCode.push({ id: ids[0], label: code });
  }

  const summary = {
    totalUnits: units.length,
    inventoryStatus: inventoryStatusBucket,
    qaStatus: qaStatusBucket,
    activationStatus: activationStatusBucket,
    anomalies: Object.fromEntries(Object.entries(anomalies).map(([key, items]) => [key, items.length])),
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("\n--- Detección detallada ---");
  for (const [key, items] of Object.entries(anomalies)) {
    console.log(`${key}: ${items.length}`);
    for (const item of items.slice(0, 10)) {
      console.log(`  - ${item.label} (${item.id})`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

#!/usr/bin/env npx tsx

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const TARGET_PRODUCT_TYPE = "PRP-FG-STICKER-EMP";
const WRONG_PRODUCT_CODE = "PRP-FG-STICKER";
const CORRECT_PRODUCT_CODE = "PRP-FG-STICKER-EMP";
const CORRECT_PRODUCT_NAME = "Sticker PreRescatePTY";

type CandidateUnit = {
  id: string;
  internalLabel: string;
  productCode: string;
  productName: string;
  productType: string;
  status: string;
  qaStatus: string | null;
  activationStatus: string;
  reservedOrderId: string | null;
  reservedAt: Date | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  activatedAt: Date | null;
  digitalBatchId: string | null;
  digitalBatchItemId: string | null;
  printOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  digitalBatchItem: { productionOrderId: string | null } | null;
  digitalBatch: { code: string; productType: string; finishedGoodCode: string | null; status: string } | null;
  printOrder: { code: string; productType: string; finishedGoodCode: string | null; status: string } | null;
};

function isSafeCandidate(unit: CandidateUnit) {
  return (
    unit.productType === TARGET_PRODUCT_TYPE &&
    unit.productCode === WRONG_PRODUCT_CODE &&
    unit.status === "available" &&
    unit.qaStatus === "passed" &&
    unit.activationStatus === "not_activated" &&
    unit.reservedOrderId === null &&
    unit.reservedAt === null &&
    unit.dispatchedAt === null &&
    unit.deliveredAt === null &&
    unit.activatedAt === null &&
    unit.digitalBatchItemId !== null &&
    unit.digitalBatchId !== null &&
    unit.printOrderId !== null &&
    unit.digitalBatchItem?.productionOrderId !== null &&
    unit.digitalBatch?.productType === TARGET_PRODUCT_TYPE &&
    unit.printOrder?.productType === TARGET_PRODUCT_TYPE
  );
}

async function main() {
  const applyChanges = process.env.APPLY_W605G_H5 === "YES_APPLY_W605G_H5";

  const candidates = await prisma.operationFinishedGoodUnit.findMany({
    where: { productType: TARGET_PRODUCT_TYPE, productCode: WRONG_PRODUCT_CODE },
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productName: true,
      productType: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      reservedAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      activatedAt: true,
      digitalBatchId: true,
      digitalBatchItemId: true,
      printOrderId: true,
      createdAt: true,
      updatedAt: true,
      digitalBatchItem: { select: { productionOrderId: true } },
      digitalBatch: { select: { code: true, productType: true, finishedGoodCode: true, status: true } },
      printOrder: { select: { code: true, productType: true, finishedGoodCode: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(JSON.stringify({ applyChanges, candidates }, null, 2));

  const safeCandidates = candidates.filter(isSafeCandidate);

  if (safeCandidates.length !== candidates.length) {
    throw new Error(`Unsafe or ambiguous candidates found: ${candidates.length - safeCandidates.length}`);
  }

  if (!applyChanges) {
    console.log("Dry run complete. Set APPLY_W605G_H5=YES_APPLY_W605G_H5 to apply the correction.");
    return;
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const before = await tx.operationFinishedGoodUnit.findMany({
      where: { id: { in: safeCandidates.map((unit) => unit.id) } },
      select: {
        id: true,
        internalLabel: true,
        productCode: true,
        productName: true,
        productType: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const updates = [];
    for (const unit of before) {
      const after = await tx.operationFinishedGoodUnit.update({
        where: { id: unit.id },
        data: {
          productCode: CORRECT_PRODUCT_CODE,
          productName: CORRECT_PRODUCT_NAME,
        },
        select: {
          id: true,
          internalLabel: true,
          productCode: true,
          productName: true,
          productType: true,
          status: true,
          qaStatus: true,
          activationStatus: true,
        },
      });
      updates.push({ before: unit, after });
    }

    const afterStock = await tx.operationFinishedGoodUnit.groupBy({
      by: ["productCode"],
      _count: { _all: true },
      where: { productCode: { in: [WRONG_PRODUCT_CODE, CORRECT_PRODUCT_CODE] } },
    });

    return { before, updates, afterStock };
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[fix-w605g-h5-misclassified-enterprise-units] error:", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});

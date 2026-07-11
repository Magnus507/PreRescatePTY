import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { buildProductionAssemblyState } from "@/lib/operations/production-assembly-state";
import { getProductMetadata } from "@/app/api/admin/operations/finished-good-units/finished-good-units.helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: productionOrderId } = await params;
  const items = await prisma.operationDigitalBatchItem.findMany({
    where: { productionOrderId },
    include: { batch: true, finishedGoodUnits: true },
    orderBy: [{ sequenceNumber: "asc" }, { internalLabel: "asc" }],
  });

  const units: Array<{
    preparationId: string;
    digitalBatchItemId: string;
    internalLabel: string;
    shortCode: string | null;
    finishedGoodUnitId: string;
    action: "created" | "found" | "linked";
  }> = [];
  const errors: Array<{ preparationId: string; message: string }> = [];
  const readyForQcItems: Array<{ id: string; internalLabel: string; shortCode: string | null }> = [];

  for (const item of items) {
    const printOrder = await prisma.operationPrintOrder.findFirst({ where: { digitalBatchId: item.batchId } });
    const assemblyState = buildProductionAssemblyState(item, { printOrder });
    if (!assemblyState.readyForQc) {
      continue;
    }
    readyForQcItems.push({ id: item.id, internalLabel: item.internalLabel, shortCode: item.shortCode });

    try {
      const unit = await prisma.$transaction(async (tx) => {
        const productMetadata = getProductMetadata(item.batch.productType);
        const existingByBatchItem = await tx.operationFinishedGoodUnit.findUnique({
          where: { digitalBatchItemId: item.id },
        });
        if (existingByBatchItem) {
          const linked = await tx.operationFinishedGoodUnit.update({
            where: { id: existingByBatchItem.id },
            data: {
              digitalBatchId: existingByBatchItem.digitalBatchId || item.batchId,
              digitalBatchItemId: existingByBatchItem.digitalBatchItemId || item.id,
              printOrderId: existingByBatchItem.printOrderId || printOrder?.id || null,
              productCode: productMetadata.productCode,
              productName: productMetadata.productName,
              productType: item.batch.productType,
              qaStatus: existingByBatchItem.qaStatus && ["passed", "failed"].includes(existingByBatchItem.qaStatus) ? existingByBatchItem.qaStatus : "pending",
              status: existingByBatchItem.qaStatus === "passed" || existingByBatchItem.qaStatus === "failed" ? existingByBatchItem.status : "qa_pending",
              activationStatus: existingByBatchItem.activationStatus || "not_activated",
            },
          });
          return { unit: linked, action: "found" as const };
        }

        const existingByLabel = await tx.operationFinishedGoodUnit.findUnique({
          where: { internalLabel: item.internalLabel },
        });

        if (existingByLabel) {
          const linked = await tx.operationFinishedGoodUnit.update({
            where: { id: existingByLabel.id },
            data: {
              digitalBatchId: existingByLabel.digitalBatchId || item.batchId,
              digitalBatchItemId: existingByLabel.digitalBatchItemId || item.id,
              printOrderId: existingByLabel.printOrderId || printOrder?.id || null,
              productCode: productMetadata.productCode,
              productName: productMetadata.productName,
              productType: item.batch.productType,
              qaStatus: existingByLabel.qaStatus && ["passed", "failed"].includes(existingByLabel.qaStatus) ? existingByLabel.qaStatus : "pending",
              status: existingByLabel.qaStatus === "passed" || existingByLabel.qaStatus === "failed" ? existingByLabel.status : "qa_pending",
              activationStatus: existingByLabel.activationStatus || "not_activated",
            },
          });
          return { unit: linked, action: "linked" as const };
        }

        const created = await tx.operationFinishedGoodUnit.create({
          data: {
            internalLabel: item.internalLabel,
            productCode: productMetadata.productCode,
            productName: productMetadata.productName,
            productType: item.batch.productType,
            digitalBatchId: item.batchId,
            digitalBatchItemId: item.id,
            status: "qa_pending",
            qaStatus: "pending",
            activationStatus: "not_activated",
            printOrderId: printOrder?.id || null,
            events: { create: { eventType: "UNIT_COMPLETED", metadataJson: { preparationId: item.id } } },
          },
        });

        return { unit: created, action: "created" as const };
      });

      const fresh = await prisma.operationFinishedGoodUnit.findUnique({
        where: { id: unit.unit.id },
        select: {
          id: true,
          digitalBatchItemId: true,
          internalLabel: true,
          digitalBatchId: true,
          qaStatus: true,
          status: true,
          activationStatus: true,
          reservedOrderId: true,
        },
      });

      if (!fresh?.id || fresh.digitalBatchItemId !== item.id) {
        errors.push({ preparationId: item.id, message: "No se pudo vincular la unidad trazable." });
        continue;
      }

      await prisma.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "UNIT_READY_FOR_QC",
          reason: "Unidad sincronizada para QC",
          metadataJson: JSON.stringify({ preparationId: item.id, unitId: fresh.id, repaired: true }),
          createdById: auth.session.user.id || null,
        },
      });

      units.push({
        preparationId: item.id,
        digitalBatchItemId: item.id,
        internalLabel: fresh.internalLabel,
        shortCode: item.shortCode,
        finishedGoodUnitId: fresh.id,
        action: unit.action,
      });
    } catch (error) {
      errors.push({
        preparationId: item.id,
        message: error instanceof Error ? error.message : "No se pudo sincronizar la unidad trazable.",
      });
    }
  }

  const repairedCount = units.length;
  const stillMissing = readyForQcItems.filter((item) => !units.some((unit) => unit.digitalBatchItemId === item.id));

  if (repairedCount === 0 && stillMissing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo sincronizar la unidad trazable.",
        units: [],
        errors: [...errors, ...stillMissing.map((item) => ({ preparationId: item.id, message: "Sigue sin finishedGoodUnitId." }))],
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    repairedCount,
    units,
    errors,
  });
}

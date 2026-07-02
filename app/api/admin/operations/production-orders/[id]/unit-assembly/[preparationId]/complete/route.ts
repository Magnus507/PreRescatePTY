import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; preparationId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id: productionOrderId, preparationId } = await params;

  const item = await prisma.operationDigitalBatchItem.findUnique({
    where: { id: preparationId },
    include: { finishedGoodUnits: true, batch: true },
  });
  if (!item || item.productionOrderId !== productionOrderId) {
    return NextResponse.json({ error: "Item de preparacion no encontrado" }, { status: 404 });
  }
  if (item.status !== "packaged") {
    return NextResponse.json({ error: "La unidad debe estar empaquetada antes de marcarla lista para QC" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const printOrder = await tx.operationPrintOrder.findFirst({ where: { digitalBatchId: item.batchId } });
    const existingByBatchItem = await tx.operationFinishedGoodUnit.findUnique({
      where: { digitalBatchItemId: item.id },
    });
    const existingByLabel = existingByBatchItem || await tx.operationFinishedGoodUnit.findUnique({
      where: { internalLabel: item.internalLabel },
    });

    const unit = existingByLabel
      ? await tx.operationFinishedGoodUnit.update({
          where: { id: existingByLabel.id },
          data: {
            digitalBatchId: existingByLabel.digitalBatchId || item.batchId,
            digitalBatchItemId: existingByLabel.digitalBatchItemId || item.id,
            printOrderId: existingByLabel.printOrderId || printOrder?.id || null,
            productCode: existingByLabel.productCode || "PRP-FG-STICKER",
            productName: existingByLabel.productName || "Sticker PreRescatePTY",
            productType: existingByLabel.productType || item.batch.productType,
            qaStatus: existingByLabel.qaStatus && ["passed", "failed"].includes(existingByLabel.qaStatus) ? existingByLabel.qaStatus : "pending",
            status: existingByLabel.qaStatus === "passed" || existingByLabel.qaStatus === "failed" ? existingByLabel.status : "qa_pending",
            activationStatus: existingByLabel.activationStatus || "not_activated",
          },
        })
      : await tx.operationFinishedGoodUnit.create({
          data: {
            internalLabel: item.internalLabel,
            productCode: "PRP-FG-STICKER",
            productName: "Sticker PreRescatePTY",
            productType: item.batch.productType,
            digitalBatchId: item.batchId,
            digitalBatchItemId: item.id,
            status: "qa_pending",
            qaStatus: "pending",
            activationStatus: "not_activated",
            printOrderId: printOrder?.id || null,
            events: { create: { eventType: "UNIT_COMPLETED", metadataJson: { preparationId } } },
          },
        });

    await tx.operationDigitalBatchItem.update({
      where: { id: item.id },
      data: { status: "completed" },
    });

    await tx.operationProductionEvent.create({
      data: {
        productionOrderId,
        eventType: "UNIT_READY_FOR_QC",
        reason: "Unidad lista para QC",
        metadataJson: JSON.stringify({ preparationId, unitId: unit.id }),
        createdById: auth.session.user.id || null,
      },
    });

    return unit;
  });

  return NextResponse.json({
    finishedGoodUnitId: result.id,
    finishedGoodUnit: {
      id: result.id,
      internalLabel: result.internalLabel,
      shortCode: null,
      qaStatus: result.qaStatus,
      inventoryStatus: result.status,
      activationStatus: result.activationStatus,
      reservedOrderId: result.reservedOrderId,
    },
  }, { status: 201 });
}

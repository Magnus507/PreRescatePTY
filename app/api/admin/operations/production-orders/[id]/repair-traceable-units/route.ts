import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { buildProductionAssemblyState } from "@/lib/operations/production-assembly-state";

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

  let repaired = 0;

  for (const item of items) {
    const printOrder = await prisma.operationPrintOrder.findFirst({ where: { digitalBatchId: item.batchId } });
    const assemblyState = buildProductionAssemblyState(item, { printOrder });
    if (!assemblyState.readyForQc) continue;

    const existing = await prisma.operationFinishedGoodUnit.findUnique({
      where: { digitalBatchItemId: item.id },
    });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const existingByLabel = await tx.operationFinishedGoodUnit.findUnique({
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
              events: { create: { eventType: "UNIT_COMPLETED", metadataJson: { preparationId: item.id } } },
            },
          });

      await tx.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "UNIT_READY_FOR_QC",
          reason: "Unidad sincronizada para QC",
          metadataJson: JSON.stringify({ preparationId: item.id, unitId: unit.id, repaired: true }),
          createdById: auth.session.user.id || null,
        },
      });
    });

    repaired += 1;
  }

  return NextResponse.json({ ok: true, repaired });
}

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

  const existing = await prisma.operationFinishedGoodUnit.findUnique({
    where: { digitalBatchItemId: item.id },
  });
  if (existing) {
    await prisma.operationDigitalBatchItem.update({
      where: { id: item.id },
      data: { status: "completed" },
    });
    return NextResponse.json({ unit: existing });
  }

  const unit = await prisma.operationFinishedGoodUnit.create({
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
      printOrderId: (await prisma.operationPrintOrder.findFirst({ where: { digitalBatchId: item.batchId } }))?.id || null,
      events: { create: { eventType: "UNIT_COMPLETED", metadataJson: { preparationId } } },
    },
  });

  await prisma.operationDigitalBatchItem.update({
    where: { id: item.id },
    data: { status: "completed" },
  });

  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId,
      eventType: "UNIT_COMPLETED",
      reason: "Unidad lista para QC",
      metadataJson: JSON.stringify({ preparationId, unitId: unit.id }),
      createdById: auth.session.user.id || null,
    },
  });

  return NextResponse.json({ unit }, { status: 201 });
}

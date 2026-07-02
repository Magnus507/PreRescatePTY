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
    include: { finishedGoodUnits: true, productionOrder: true },
  });
  if (!item || item.productionOrderId !== productionOrderId) {
    return NextResponse.json({ error: "Item de preparacion no encontrado" }, { status: 404 });
  }

  const printOrder = await prisma.operationPrintOrder.findFirst({ where: { digitalBatchId: item.batchId } });
  if (!printOrder || printOrder.status !== "received") {
    return NextResponse.json({ error: "La imprenta debe estar recibida" }, { status: 400 });
  }

  await prisma.operationDigitalBatchItem.update({
    where: { id: preparationId },
    data: { status: "assembled" },
  });

  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId,
      eventType: "UNIT_ASSEMBLED",
      reason: "Chip + sticker ensamblado",
      metadataJson: JSON.stringify({ preparationId }),
      createdById: auth.session.user.id || null,
    },
  });

  return NextResponse.json({ ok: true });
}

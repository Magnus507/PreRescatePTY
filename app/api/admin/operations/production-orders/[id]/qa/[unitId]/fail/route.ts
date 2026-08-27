import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { buildProductionAssemblyState } from "@/lib/operations/production-assembly-state";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id: productionOrderId, unitId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

  if (!reason) {
    return NextResponse.json({ error: "reason es requerido" }, { status: 400 });
  }

  try {
    const productionOrder = await prisma.operationProductionOrder.findUnique({
      where: { id: productionOrderId },
      select: { id: true },
    });
    if (!productionOrder) {
      return NextResponse.json({ error: "Orden de producción no encontrada" }, { status: 404 });
    }

    const unit = await prisma.operationFinishedGoodUnit.findUnique({
      where: { id: unitId },
      include: {
        digitalBatchItem: {
          select: {
            productionOrderId: true,
            status: true,
            nfcProgrammed: true,
            qrPrepared: true,
            internalLabel: true,
            shortCode: true,
          },
        },
        printOrder: { select: { status: true } },
      },
    });
    if (!unit) return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    if (unit.digitalBatchItem?.productionOrderId !== productionOrderId) {
      return NextResponse.json({ error: "La unidad no pertenece a esta orden de producción" }, { status: 409 });
    }
    if (unit.qaStatus === "failed") return NextResponse.json({ unit });

    const assemblyState = unit.digitalBatchItem
      ? buildProductionAssemblyState(unit.digitalBatchItem, { printOrder: unit.printOrder })
      : null;
    if (!assemblyState?.readyForQc || unit.status !== "qa_pending" || unit.qaStatus !== "pending") {
      return NextResponse.json(
        { error: "La unidad debe completar identidad, impresión, ensamblaje y empaque antes de QC" },
        { status: 400 }
      );
    }

    const updated = await prisma.operationFinishedGoodUnit.update({
      where: { id: unitId },
      data: {
        qaStatus: "failed",
        status: "qa_failed",
        reservedOrderId: null,
        reservedAt: null,
        events: {
          create: {
            eventType: "QA_FAILED",
            reason,
            metadataJson: { productionOrderId, notes },
          },
        },
      },
    });

    await prisma.operationProductionOrder.update({
      where: { id: productionOrderId },
      data: { status: "qa_pending" },
    });

    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("[operations/production-orders/:id/qa/:unitId/fail] POST error:", error);
    return NextResponse.json({ error: "Error al registrar QC fallido" }, { status: 500 });
  }
}

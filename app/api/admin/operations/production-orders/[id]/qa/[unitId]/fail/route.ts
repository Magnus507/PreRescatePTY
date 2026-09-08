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
    const result = await prisma.$transaction(async (tx) => {
      // Pass and fail decisions share the same production-order row lock. This
      // prevents conflicting QA decisions and keeps multi-unit progress coherent.
      const productionOrderLock = await tx.operationProductionOrder.updateMany({
        where: { id: productionOrderId },
        data: { updatedAt: new Date() },
      });
      if (productionOrderLock.count !== 1) return null;

      const unit = await tx.operationFinishedGoodUnit.findUnique({
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
      if (!unit) throw new Error("UNIT_NOT_FOUND");
      if (unit.digitalBatchItem?.productionOrderId !== productionOrderId) {
        throw new Error("UNIT_NOT_LINKED_TO_PRODUCTION");
      }
      if (unit.qaStatus === "failed") return unit;

      const assemblyState = unit.digitalBatchItem
        ? buildProductionAssemblyState(unit.digitalBatchItem, { printOrder: unit.printOrder })
        : null;
      if (!assemblyState?.readyForQc || unit.status !== "qa_pending" || unit.qaStatus !== "pending") {
        throw new Error("UNIT_NOT_READY");
      }

      const updated = await tx.operationFinishedGoodUnit.update({
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

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: { status: "qa_pending" },
      });

      return updated;
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de producción no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ unit: result });
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_FOUND") {
      return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_LINKED_TO_PRODUCTION") {
      return NextResponse.json({ error: "La unidad no pertenece a esta orden de producción" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_READY") {
      return NextResponse.json(
        { error: "La unidad debe completar identidad, impresión, ensamblaje y empaque antes de QC" },
        { status: 400 }
      );
    }
    console.error("[operations/production-orders/:id/qa/:unitId/fail] POST error:", error);
    return NextResponse.json({ error: "Error al registrar QC fallido" }, { status: 500 });
  }
}

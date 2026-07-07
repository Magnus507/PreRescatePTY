import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { hasCompleteQaChecklist, normalizeQaChecklist } from "@/app/api/admin/operations/finished-good-units/finished-good-units.helpers";

export const dynamic = "force-dynamic";

function getCommercialOrderIdFromNotes(notes: string | null) {
  const match = notes?.match(/\[commercialOrderId:([^\]]+)\]/);
  return match?.[1] || null;
}

function toJson(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
}

function isInternalProductionOrder(notes: string | null, code: string | null) {
  const normalizedNotes = notes || "";
  const normalizedCode = code || "";
  return normalizedNotes.includes("Pedido interno para fabricar inventario") || normalizedCode.startsWith("PROD-INT-");
}

async function refreshCommercialOrder(tx: Prisma.TransactionClient, commercialOrderId: string) {
  const totalRequired = await tx.operationCommercialOrderItem.aggregate({
    where: { commercialOrderId },
    _sum: { quantity: true },
  });
  const requiredQty = totalRequired._sum.quantity || 0;
  const reservedQty = await tx.operationFinishedGoodUnit.count({
    where: { reservedOrderId: commercialOrderId, status: "reserved", qaStatus: "passed" },
  });

  await tx.operationCommercialOrder.update({
    where: { id: commercialOrderId },
    data: {
      status: reservedQty >= requiredQty && requiredQty > 0 ? "stock_reserved" : "pending_stock",
      fulfillmentStatus: reservedQty > 0 ? "reserved" : "pending",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id: productionOrderId, unitId } = await params;
  const body = await req.json().catch(() => ({}));
  const checklist = normalizeQaChecklist(body?.checklist);
  const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

  if (!hasCompleteQaChecklist(checklist)) {
    return NextResponse.json({ error: "No se puede aprobar QA si todos los controles obligatorios no están completos." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productionOrder = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        select: { id: true, code: true, notes: true, status: true },
      });
      if (!productionOrder) return null;

      const unit = await tx.operationFinishedGoodUnit.findUnique({
        where: { id: unitId },
      });
      if (!unit) throw new Error("UNIT_NOT_FOUND");
      if (unit.qaStatus === "passed") return { unit };
      if (unit.status !== "qa_pending" && unit.status !== "assembled") {
        throw new Error("UNIT_NOT_READY");
      }
      if (unit.digitalBatchItemId == null || unit.digitalBatchId == null) {
        throw new Error("UNIT_NOT_LINKED");
      }

      const commercialOrderId = getCommercialOrderIdFromNotes(productionOrder.notes);
      const internalProduction = isInternalProductionOrder(productionOrder.notes, productionOrder.code);
      const now = new Date();
      const updated = await tx.operationFinishedGoodUnit.update({
        where: { id: unitId },
        data: {
          qaStatus: "passed",
          activationStatus: "not_activated",
          status: commercialOrderId && !internalProduction ? "reserved" : "available",
          reservedOrderId: commercialOrderId && !internalProduction ? commercialOrderId : null,
          reservedAt: commercialOrderId && !internalProduction ? now : null,
          events: {
            create: [
              {
                eventType: "QA_PASSED",
                reason: notes || "QC aprobado",
                metadataJson: toJson({ productionOrderId, checklist }),
              },
              {
                eventType: commercialOrderId && !internalProduction ? "UNIT_RESERVED_FOR_ORDER" : "INVENTORY_AVAILABLE",
                reason: commercialOrderId && !internalProduction ? "Unidad reservada para pedido origen" : "Unidad disponible en inventario",
                referenceType: commercialOrderId && !internalProduction ? "commercial_order" : "production_order",
                referenceId: commercialOrderId && !internalProduction ? commercialOrderId : productionOrderId,
                metadataJson: toJson({ productionOrderId, commercialOrderId: internalProduction ? null : commercialOrderId, checklist }),
              },
            ],
          },
        },
      });

      if (commercialOrderId) {
        await refreshCommercialOrder(tx, commercialOrderId);
      }

      const totalUnits = await tx.operationDigitalBatchItem.count({
        where: { batchId: unit.digitalBatchId, productionOrderId },
      });
      const resolvedUnits = await tx.operationFinishedGoodUnit.count({
        where: {
          digitalBatchId: unit.digitalBatchId,
          qaStatus: "passed",
          status: { in: ["available", "reserved"] },
        },
      });

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: {
          producedQuantity: { increment: 1 },
        },
      });

      if (totalUnits > 0 && resolvedUnits >= totalUnits) {
        await tx.operationProductionOrder.update({
          where: { id: productionOrderId },
          data: { status: "completed" },
        });
        await tx.operationProductionEvent.create({
          data: {
            productionOrderId,
            eventType: "PRODUCTION_COMPLETED",
            quantity: resolvedUnits,
            reason: "Producción completada tras QC",
            metadataJson: JSON.stringify({ productionOrderId, resolvedUnits, totalUnits }),
            createdById: auth.session.user.id || null,
          },
        });
      }

      return { unit: updated };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ unit: result.unit });
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_FOUND") {
      return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_READY") {
      return NextResponse.json({ error: "La unidad no está lista para QC" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_LINKED") {
      return NextResponse.json({ error: "La unidad no está vinculada correctamente" }, { status: 400 });
    }
    console.error("[operations/production-orders/:id/qa/:unitId/pass] POST error:", error);
    return NextResponse.json({ error: "Error al aprobar QC" }, { status: 500 });
  }
}

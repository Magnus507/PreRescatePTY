import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  hasCompleteQaChecklist,
  normalizeQaChecklist,
} from "@/app/api/admin/operations/finished-good-units/finished-good-units.helpers";
import { buildProductionAssemblyState } from "@/lib/operations/production-assembly-state";
import { routeCustomerProductionUnit } from "@/lib/operations/customer-production-routing";

export const dynamic = "force-dynamic";

function toJson(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
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
    return NextResponse.json(
      { error: "No se puede aprobar QA si todos los controles obligatorios no están completos." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productionOrder = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        select: {
          id: true,
          code: true,
          status: true,
          plannedQuantity: true,
        },
      });
      if (!productionOrder) return null;

      const unit = await tx.operationFinishedGoodUnit.findUnique({
        where: { id: unitId },
        include: {
          digitalBatchItem: {
            select: {
              id: true,
              productionOrderId: true,
              status: true,
              nfcProgrammed: true,
              qrPrepared: true,
              internalLabel: true,
              shortCode: true,
            },
          },
          printOrder: {
            select: { status: true },
          },
        },
      });
      if (!unit) throw new Error("UNIT_NOT_FOUND");
      if (!unit.digitalBatchItem || unit.digitalBatchItem.productionOrderId !== productionOrderId) {
        throw new Error("UNIT_NOT_LINKED_TO_PRODUCTION");
      }

      // Idempotent recovery path: a unit that already passed QC can be routed
      // again. This repairs historic customer-production rows whose SKU/type was
      // inconsistent without duplicating QA events. Internal production remains
      // inventory stock and is a no-op here.
      if (unit.qaStatus === "passed") {
        const routed = await routeCustomerProductionUnit(tx, { productionOrderId, unitId });
        return { unit: routed.unit || unit, reservation: routed.reservation };
      }

      const assemblyState = buildProductionAssemblyState(unit.digitalBatchItem, {
        printOrder: unit.printOrder,
      });
      if (!assemblyState.readyForQc || unit.status !== "qa_pending" || unit.qaStatus !== "pending") {
        throw new Error("UNIT_NOT_READY");
      }

      await tx.operationFinishedGoodUnit.update({
        where: { id: unitId },
        data: {
          qaStatus: "passed",
          activationStatus: "not_activated",
          status: "available",
          reservedOrderId: null,
          reservedAt: null,
          events: {
            create: [
              {
                eventType: "QA_PASSED",
                reason: notes || "QC aprobado",
                metadataJson: toJson({ productionOrderId, checklist }),
              },
              {
                eventType: "INVENTORY_AVAILABLE",
                reason: "Unidad aprobada; pendiente de enrutamiento según origen de producción",
                referenceType: "production_order",
                referenceId: productionOrderId,
                metadataJson: toJson({ productionOrderId }),
              },
            ],
          },
        },
      });

      // A customer backorder is normalized to its canonical finished-good SKU
      // and immediately reserved to the originating order. Internal production
      // is intentionally left available in inventory.
      const routed = await routeCustomerProductionUnit(tx, { productionOrderId, unitId });

      const acceptedUnits = await tx.operationFinishedGoodUnit.count({
        where: {
          digitalBatchItem: { productionOrderId },
          qaStatus: "passed",
          status: { in: ["available", "reserved", "dispatched", "delivered", "activated"] },
        },
      });

      const plannedQuantity = Math.max(0, Math.floor(productionOrder.plannedQuantity));
      const completed = plannedQuantity > 0 && acceptedUnits >= plannedQuantity;

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: {
          producedQuantity: acceptedUnits,
          status: completed ? "completed" : "qa_pending",
        },
      });

      if (completed && productionOrder.status !== "completed") {
        await tx.operationProductionEvent.create({
          data: {
            productionOrderId,
            eventType: "PRODUCTION_COMPLETED",
            quantity: acceptedUnits,
            reason: "Producción completada tras QC",
            metadataJson: JSON.stringify({
              productionOrderId,
              acceptedUnits,
              plannedQuantity,
              routingKind: routed.kind,
              commercialOrderId: routed.commercialOrder?.id || null,
              customerOrderId: routed.customerOrderId,
              reservationStatus: routed.reservation?.summary.status || null,
            }),
            createdById: auth.session.user.id || null,
          },
        });
      }

      const refreshedUnit = await tx.operationFinishedGoodUnit.findUnique({
        where: { id: unitId },
      });

      return { unit: refreshedUnit, reservation: routed.reservation };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ unit: result.unit, reservation: result.reservation });
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_FOUND") {
      return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    }
    if (
      error instanceof Error &&
      ["UNIT_NOT_LINKED_TO_PRODUCTION", "CUSTOMER_PRODUCTION_UNIT_MISMATCH"].includes(error.message)
    ) {
      return NextResponse.json({ error: "La unidad no pertenece a esta orden de producción" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_READY") {
      return NextResponse.json({ error: "La unidad debe completar identidad, impresión, ensamblaje y empaque antes de QC" }, { status: 400 });
    }
    if (
      error instanceof Error &&
      [
        "CUSTOMER_PRODUCTION_ORDER_NOT_FOUND",
        "CUSTOMER_PRODUCTION_PRODUCT_UNRESOLVED",
        "CUSTOMER_PRODUCTION_CONTEXT_INCOMPLETE",
        "CUSTOMER_PRODUCTION_IDENTITY_LOCKED",
      ].includes(error.message)
    ) {
      return NextResponse.json(
        { error: "La producción de cliente no pudo reconciliarse de forma segura con su pedido." },
        { status: 409 }
      );
    }
    console.error("[operations/production-orders/:id/qa/:unitId/pass] POST error:", error);
    return NextResponse.json({ error: "Error al aprobar QC" }, { status: 500 });
  }
}

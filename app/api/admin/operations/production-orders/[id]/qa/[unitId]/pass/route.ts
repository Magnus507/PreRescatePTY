import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  hasCompleteQaChecklist,
  normalizeQaChecklist,
} from "@/app/api/admin/operations/finished-good-units/finished-good-units.helpers";
import { buildProductionAssemblyState } from "@/lib/operations/production-assembly-state";
import { reserveCommercialOrderStock } from "@/lib/operations/commercial-order-reservation";

export const dynamic = "force-dynamic";

type ProductionSource = {
  customerOrderId: string | null;
  commercialOrderId: string | null;
  internal: boolean;
};

function toJson(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
}

function parseMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function resolveProductionSource(input: {
  code: string;
  notes: string | null;
  events: Array<{ eventType: string; metadataJson: string | null }>;
}): ProductionSource {
  for (const event of input.events) {
    if (event.eventType !== "CREATED") continue;
    const metadata = parseMetadata(event.metadataJson);
    if (!metadata) continue;

    const sourceType = typeof metadata.sourceType === "string" ? metadata.sourceType : null;
    const orderSource = typeof metadata.orderSource === "string" ? metadata.orderSource : null;
    const orderId = typeof metadata.orderId === "string" ? metadata.orderId : null;
    const commercialOrderId = typeof metadata.commercialOrderId === "string" ? metadata.commercialOrderId : null;

    if (sourceType === "customer_order" && orderId) {
      return { customerOrderId: orderId, commercialOrderId, internal: false };
    }
    if (orderSource === "internal") {
      return { customerOrderId: null, commercialOrderId, internal: true };
    }
    if (commercialOrderId) {
      return { customerOrderId: null, commercialOrderId, internal: false };
    }
  }

  const legacyCommercialOrderId = input.notes?.match(/\[commercialOrderId:([^\]]+)\]/)?.[1]
    || input.notes?.match(/W605H-B-BACKORDER-PRODUCTION:([^\s]+)/)?.[1]
    || null;

  return {
    customerOrderId: null,
    commercialOrderId: legacyCommercialOrderId,
    internal:
      input.code.startsWith("PROD-INT-") ||
      Boolean(input.notes?.includes("Pedido interno para fabricar inventario")),
  };
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
          notes: true,
          status: true,
          plannedQuantity: true,
          events: {
            where: { eventType: "CREATED" },
            orderBy: { createdAt: "asc" },
            select: { eventType: true, metadataJson: true },
          },
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
      if (unit.qaStatus === "passed") return { unit, reservation: null };
      if (!unit.digitalBatchItem || unit.digitalBatchItem.productionOrderId !== productionOrderId) {
        throw new Error("UNIT_NOT_LINKED_TO_PRODUCTION");
      }

      const assemblyState = buildProductionAssemblyState(unit.digitalBatchItem, {
        printOrder: unit.printOrder,
      });
      if (!assemblyState.readyForQc || unit.status !== "qa_pending" || unit.qaStatus !== "pending") {
        throw new Error("UNIT_NOT_READY");
      }

      const source = resolveProductionSource(productionOrder);
      let commercialOrder = source.commercialOrderId
        ? await tx.operationCommercialOrder.findUnique({
            where: { id: source.commercialOrderId },
            select: { id: true, sourceId: true, customerType: true },
          })
        : null;

      if (!commercialOrder && source.customerOrderId) {
        commercialOrder = await tx.operationCommercialOrder.findFirst({
          where: { sourceId: source.customerOrderId },
          orderBy: { createdAt: "desc" },
          select: { id: true, sourceId: true, customerType: true },
        });
      }

      const customerOrderId = source.customerOrderId || commercialOrder?.sourceId || null;
      const internalProduction = source.internal || commercialOrder?.customerType === "internal";

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
                reason: "Unidad aprobada y disponible para inventario",
                referenceType: "production_order",
                referenceId: productionOrderId,
                metadataJson: toJson({
                  productionOrderId,
                  customerOrderId,
                  commercialOrderId: commercialOrder?.id || null,
                }),
              },
            ],
          },
        },
      });

      let reservation = null;
      if (!internalProduction && commercialOrder) {
        reservation = await reserveCommercialOrderStock(tx, {
          orderId: commercialOrder.id,
          allowPartial: true,
        });
      }

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
            }),
            createdById: auth.session.user.id || null,
          },
        });
      }

      const refreshedUnit = await tx.operationFinishedGoodUnit.findUnique({
        where: { id: unitId },
      });

      return { unit: refreshedUnit, reservation };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ unit: result.unit, reservation: result.reservation });
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_FOUND") {
      return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_LINKED_TO_PRODUCTION") {
      return NextResponse.json({ error: "La unidad no pertenece a esta orden de producción" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "UNIT_NOT_READY") {
      return NextResponse.json({ error: "La unidad debe completar identidad, impresión, ensamblaje y empaque antes de QC" }, { status: 400 });
    }
    console.error("[operations/production-orders/:id/qa/:unitId/pass] POST error:", error);
    return NextResponse.json({ error: "Error al aprobar QC" }, { status: 500 });
  }
}

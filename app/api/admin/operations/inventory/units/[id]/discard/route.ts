import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const TERMINAL_OR_OWNED_STATUSES = new Set(["reserved", "dispatched", "delivered", "activated", "discarded", "cancelled"]);
const ACTIVE_PRODUCTION_STATUSES = new Set(["draft", "planned", "sent_to_print", "print_received", "started", "paused", "qa_pending"]);

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const unit = await tx.operationFinishedGoodUnit.findUnique({
        where: { id },
        include: {
          dispatchItems: { select: { id: true } },
          warranties: { select: { id: true } },
          returns: { select: { id: true } },
          originalReplacements: { select: { id: true } },
          replacementReplacements: { select: { id: true } },
          chip: {
            select: {
              id: true,
              status: true,
              ownerUserId: true,
              accountId: true,
              assignedProfileId: true,
            },
          },
          digitalBatchItem: {
            select: {
              productionOrderId: true,
              productionOrder: { select: { status: true } },
            },
          },
        },
      });

      if (!unit) return null;

      const blockedByRelations =
        unit.dispatchItems.length > 0 ||
        unit.warranties.length > 0 ||
        unit.returns.length > 0 ||
        unit.originalReplacements.length > 0 ||
        unit.replacementReplacements.length > 0;
      const chipOwned = Boolean(unit.chip?.ownerUserId || unit.chip?.accountId || unit.chip?.assignedProfileId);
      const activeProduction = Boolean(
        unit.digitalBatchItem?.productionOrderId &&
        unit.digitalBatchItem.productionOrder &&
        ACTIVE_PRODUCTION_STATUSES.has(unit.digitalBatchItem.productionOrder.status)
      );

      if (
        unit.reservedOrderId ||
        TERMINAL_OR_OWNED_STATUSES.has(unit.status) ||
        unit.activationStatus === "activated" ||
        blockedByRelations ||
        chipOwned
      ) {
        throw new Error("UNIT_IN_USE");
      }

      if (activeProduction && unit.qaStatus === "pending") {
        throw new Error("ACTIVE_PRODUCTION");
      }

      const previousStatus = unit.status;
      const previousQaStatus = unit.qaStatus;
      const updated = await tx.operationFinishedGoodUnit.update({
        where: { id },
        data: {
          status: "discarded",
          events: {
            create: {
              eventType: "DISCARDED",
              reason: "Descartada manualmente desde Inventario",
              referenceType: "admin_inventory",
              referenceId: auth.session.user.id || null,
              metadataJson: {
                previousStatus,
                previousQaStatus,
              },
            },
          },
        },
      });

      if (unit.chip && !chipOwned && unit.chip.status === "inventory") {
        await tx.chip.update({ where: { id: unit.chip.id }, data: { status: "damaged" } });
      }

      return updated;
    });

    if (!result) return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    return NextResponse.json({ success: true, unit: result });
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_IN_USE") {
      return NextResponse.json({ error: "Esta unidad ya está reservada, despachada, activada o vinculada a otro proceso" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ACTIVE_PRODUCTION") {
      return NextResponse.json({ error: "Esta unidad pertenece a una producción activa. Resuélvela desde Producción." }, { status: 409 });
    }
    console.error("[operations/inventory/units/:id/discard] POST error:", error);
    return NextResponse.json({ error: "No se pudo descartar la unidad" }, { status: 500 });
  }
}

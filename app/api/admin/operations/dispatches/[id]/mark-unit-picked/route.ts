import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const requestId = getAuditRequestId(req);
  const body = await req.json().catch(() => ({}));
  const unitId = typeof body.unitId === "string" ? body.unitId.trim() : "";
  const picked = Boolean(body.picked);

  if (!unitId) {
    return NextResponse.json({ error: "unitId es requerido" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: {
          items: {
            include: { unitRecord: true },
          },
        },
      });

      if (!dispatch) throw new Error("DISPATCH_NOT_FOUND");
      if (!["draft", "pending_pick", "pending_preparation"].includes(dispatch.status)) {
        throw new Error("DISPATCH_LOCKED");
      }

      const item = dispatch.items.find((row) => row.unitId === unitId);
      if (!item || !item.unitRecord) throw new Error("UNIT_NOT_IN_DISPATCH");

      const unit = item.unitRecord;
      if (!unit.internalLabel?.trim()) throw new Error("NO_INTERNAL_LABEL");
      if (unit.activationStatus !== "not_activated") throw new Error("UNIT_ACTIVATED");
      if (["dispatched", "delivered"].includes(unit.status)) throw new Error("UNIT_ALREADY_SHIPPED");

      const pickedAt = picked ? new Date() : null;
      const updatedItem = await tx.operationDispatchItem.update({
        where: { id: item.id },
        data: {
          pickedAt,
          status: picked ? "picked" : "pending_pick",
        },
        select: {
          id: true,
          unitId: true,
          status: true,
          pickedAt: true,
        },
      });

      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: dispatch.id,
          eventType: picked ? "UNIT_PICKED" : "UNIT_UNPICKED",
          reason: picked ? "Unidad separada físicamente" : "Unidad devuelta a preparación",
          referenceType: "unit",
          referenceId: unitId,
          metadataJson: JSON.stringify({
            unitId,
            internalLabel: unit.internalLabel,
            picked,
            pickedAt: pickedAt?.toISOString() || null,
          }),
          createdById: auth.session.user.id || null,
        },
      });

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_dispatch_item",
        entityId: item.id,
        action: picked ? "dispatch.unit_picked" : "dispatch.unit_unpicked",
        requestId,
        before: {
          dispatchId: dispatch.id,
          unitId,
          status: item.status,
          pickedAt: item.pickedAt?.toISOString() || null,
        },
        after: {
          dispatchId: dispatch.id,
          unitId,
          status: updatedItem.status,
          pickedAt: updatedItem.pickedAt?.toISOString() || null,
        },
      });

      return {
        unitId,
        picked,
        item: {
          ...updatedItem,
          pickedAt: updatedItem.pickedAt?.toISOString() || null,
        },
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = {
      DISPATCH_NOT_FOUND: "Despacho no encontrado",
      DISPATCH_LOCKED: "El despacho ya no permite separar unidades",
      UNIT_NOT_IN_DISPATCH: "La unidad no pertenece a este despacho",
      NO_INTERNAL_LABEL: "La unidad no tiene internalLabel",
      UNIT_ACTIVATED: "La unidad ya fue activada",
      UNIT_ALREADY_SHIPPED: "La unidad ya fue enviada o entregada",
    };
    if (map[message]) {
      return NextResponse.json({ error: map[message] }, { status: 400 });
    }
    console.error("[operations/dispatches/:id/mark-unit-picked] POST error:", error);
    return NextResponse.json({ error: "No se pudo marcar la unidad" }, { status: 500 });
  }
}

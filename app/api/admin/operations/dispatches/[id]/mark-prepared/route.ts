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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!dispatch) throw new Error("NOT_FOUND");
      if (!["draft", "pending_pick", "pending_preparation"].includes(dispatch.status)) {
        throw new Error("LOCKED");
      }
      if (dispatch.items.length === 0) throw new Error("NO_ITEMS");

      const traceableItems = dispatch.items.filter((item) => Boolean(item.unitId));
      // The dedicated physical-dispatch workflow is unit based. Aggregate
      // finished-good dispatches remain on the legacy event ledger and must not
      // enter this path, otherwise they can become prepared with zero units.
      if (traceableItems.length === 0 || traceableItems.length !== dispatch.items.length) {
        throw new Error("UNTRACEABLE_ITEMS");
      }

      const unitIds = traceableItems
        .map((item) => item.unitId)
        .filter((unitId): unitId is string => Boolean(unitId));
      if (new Set(unitIds).size !== unitIds.length) {
        throw new Error("DUPLICATE_UNIT_IN_DISPATCH");
      }

      const allPicked = traceableItems.every(
        (item) => Boolean(item.pickedAt) || ["picked", "packed"].includes(item.status)
      );
      if (!allPicked) throw new Error("NOT_READY");

      const physicalUnits = await tx.operationFinishedGoodUnit.findMany({
        where: { id: { in: unitIds } },
        select: {
          id: true,
          status: true,
          qaStatus: true,
          activationStatus: true,
          dispatchedAt: true,
          deliveredAt: true,
          activatedAt: true,
        },
      });
      if (
        physicalUnits.length !== unitIds.length ||
        physicalUnits.some(
          (unit) =>
            unit.status !== "reserved" ||
            unit.qaStatus !== "passed" ||
            unit.activationStatus !== "not_activated" ||
            Boolean(unit.dispatchedAt) ||
            Boolean(unit.deliveredAt) ||
            Boolean(unit.activatedAt)
        )
      ) {
        throw new Error("UNIT_NO_LONGER_PREPARABLE");
      }

      const preparedAt = new Date();
      await tx.operationDispatchItem.updateMany({
        where: { dispatchId: id },
        data: {
          status: "packed",
          packedAt: preparedAt,
        },
      });

      await tx.operationDispatch.update({
        where: { id },
        data: { status: "prepared" },
      });

      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: id,
          eventType: "PACKED",
          reason: "Despacho preparado",
          referenceType: "dispatch",
          referenceId: id,
          metadataJson: JSON.stringify({
            preparedAt: preparedAt.toISOString(),
            itemCount: dispatch.items.length,
            traceableUnitCount: traceableItems.length,
          }),
          createdById: auth.session.user.id || null,
        },
      });

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_dispatch",
        entityId: dispatch.id,
        action: "dispatch.prepared",
        requestId,
        before: { status: dispatch.status, itemCount: dispatch.items.length },
        after: { status: "prepared", preparedAt: preparedAt.toISOString() },
      });

      return { status: "prepared" as const, preparedAt: preparedAt.toISOString() };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = {
      NOT_FOUND: "Despacho no encontrado",
      LOCKED: "El despacho no permite prepararse",
      NO_ITEMS: "El despacho no contiene artículos",
      UNTRACEABLE_ITEMS: "Todos los artículos deben tener una unidad física trazable antes de preparar",
      DUPLICATE_UNIT_IN_DISPATCH: "Una misma unidad física aparece más de una vez en el despacho",
      NOT_READY: "Todas las unidades físicas deben estar separadas antes de preparar el despacho",
      UNIT_NO_LONGER_PREPARABLE: "Una unidad física dejó de estar reservada, aprobada por QA o disponible para envío",
    };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 409 });
    console.error("[operations/dispatches/:id/mark-prepared] POST error:", error);
    return NextResponse.json({ error: "No se pudo marcar preparado" }, { status: 500 });
  }
}

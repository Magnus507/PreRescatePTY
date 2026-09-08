import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CANCELLABLE_STATUSES = [
  "draft",
  "pending_pick",
  "pending_preparation",
  "picked",
  "packed",
  "prepared",
  "reserved",
  "released",
] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const requestId = getAuditRequestId(req);
  const body = await req.json().catch(() => ({}));
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 1000)
      : "Despacho cancelado antes del envío";

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize cancellation against mark-sent. A concurrent sender that wins
      // this row lock first changes the status to dispatched; cancellation then
      // re-evaluates the predicate and fails without releasing any unit.
      const lock = await tx.operationDispatch.updateMany({
        where: { id, status: { in: [...CANCELLABLE_STATUSES] } },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1) {
        const current = await tx.operationDispatch.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) throw new Error("NOT_FOUND");
        if (current.status === "cancelled") return { alreadyCancelled: true } as const;
        throw new Error("DISPATCH_ALREADY_COMMITTED");
      }

      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: {
          items: {
            include: { unitRecord: true },
          },
        },
      });
      if (!dispatch) throw new Error("NOT_FOUND");

      const commercialOrder = await tx.operationCommercialOrder.findFirst({
        where: { dispatchId: id },
        select: {
          id: true,
          sourceId: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
        },
      });

      const unitItems = dispatch.items.filter((item) => Boolean(item.unitId));
      if (unitItems.length > 0 && unitItems.length !== dispatch.items.length) {
        throw new Error("MIXED_TRACEABILITY");
      }

      // Aggregate/non-unit dispatches can only use this recovery endpoint before
      // any aggregate reservation state exists. Reserved aggregate inventory is
      // still owned by the legacy event workflow, which knows how to reverse its
      // OperationFinishedGoodEvent ledger entries.
      if (unitItems.length === 0 && dispatch.status === "reserved") {
        throw new Error("AGGREGATE_DISPATCH_USE_EVENT_CANCEL");
      }

      let releasedUnitCount = 0;
      if (unitItems.length > 0) {
        if (!commercialOrder && dispatch.destinationType === "customer") {
          throw new Error("CUSTOMER_ORDER_NOT_FOUND");
        }

        const reservationOrderId = commercialOrder?.sourceId || commercialOrder?.id || null;
        for (const item of unitItems) {
          const unit = item.unitRecord;
          if (!unit) throw new Error("UNIT_NOT_FOUND");
          if (
            unit.status !== "reserved" ||
            unit.qaStatus !== "passed" ||
            unit.activationStatus !== "not_activated" ||
            unit.dispatchedAt ||
            unit.deliveredAt ||
            unit.activatedAt
          ) {
            throw new Error("UNIT_ALREADY_COMMITTED");
          }
          if (reservationOrderId && unit.reservedOrderId !== reservationOrderId) {
            throw new Error("RESERVATION_OWNERSHIP_CHANGED");
          }
          if (!unit.reservedOrderId) {
            throw new Error("UNIT_NOT_RESERVED");
          }
        }

        // Detach the historical dispatch rows before returning units to stock.
        // The dispatch item keeps its labels/SKU snapshot but no longer blocks
        // future reservation through the unit relation.
        for (const item of unitItems) {
          await tx.operationDispatchItem.update({
            where: { id: item.id },
            data: { unitId: null, status: "cancelled" },
          });
        }

        if (reservationOrderId) {
          const release = await releaseEligibleOrderReservations(tx, {
            orderId: reservationOrderId,
            actorId: auth.session.user.id || null,
            reason,
          });
          if (release.blockedCount > 0) {
            throw new Error("RESERVATION_RELEASE_BLOCKED");
          }
          releasedUnitCount = release.releasedCount;
        } else {
          // A traceable direct dispatch without a commercial order still needs a
          // deterministic reservation owner. Refuse to guess rather than make a
          // potentially committed unit saleable again.
          throw new Error("RESERVATION_OWNER_NOT_FOUND");
        }
      }

      await tx.operationDispatchItem.updateMany({
        where: { dispatchId: id },
        data: { status: "cancelled" },
      });
      await tx.operationDispatch.update({
        where: { id },
        data: { status: "cancelled" },
      });
      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: id,
          eventType: "CANCELLED",
          reason,
          referenceType: commercialOrder ? "commercial_order" : "dispatch",
          referenceId: commercialOrder?.id || id,
          metadataJson: JSON.stringify({
            commercialOrderId: commercialOrder?.id || null,
            reservationOrderId: commercialOrder?.sourceId || commercialOrder?.id || null,
            releasedUnitCount,
          }),
          createdById: auth.session.user.id || null,
        },
      });

      if (commercialOrder) {
        const sourceOrder = commercialOrder.sourceId
          ? await tx.order.findUnique({
              where: { id: commercialOrder.sourceId },
              select: { orderStatus: true },
            })
          : null;
        const sourceCancelled = sourceOrder?.orderStatus === "cancelled";

        await tx.operationCommercialOrder.update({
          where: { id: commercialOrder.id },
          data: {
            dispatchId: null,
            status: sourceCancelled ? "cancelled" : "accepted",
            fulfillmentStatus: "pending",
          },
        });
      }

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_dispatch",
        entityId: dispatch.id,
        action: "dispatch.cancelled",
        requestId,
        before: {
          status: dispatch.status,
          commercialOrderId: commercialOrder?.id || null,
          unitCount: unitItems.length,
        },
        after: {
          status: "cancelled",
          releasedUnitCount,
          commercialOrderId: commercialOrder?.id || null,
        },
      });

      return {
        alreadyCancelled: false,
        status: "cancelled" as const,
        releasedUnitCount,
      };
    });

    if (result.alreadyCancelled) {
      return NextResponse.json({ success: true, status: "cancelled", alreadyCancelled: true });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const map: Record<string, string> = {
      NOT_FOUND: "Despacho no encontrado",
      DISPATCH_ALREADY_COMMITTED: "El despacho ya fue enviado/entregado y no puede cancelarse",
      MIXED_TRACEABILITY: "El despacho mezcla artículos trazables y no trazables; requiere revisión manual",
      AGGREGATE_DISPATCH_USE_EVENT_CANCEL: "El despacho agregado reservado debe cancelarse por su flujo de inventario legacy",
      CUSTOMER_ORDER_NOT_FOUND: "No se encontró el pedido comercial dueño del despacho",
      UNIT_NOT_FOUND: "Una unidad del despacho ya no existe",
      UNIT_ALREADY_COMMITTED: "Una unidad ya fue enviada, entregada o activada",
      RESERVATION_OWNERSHIP_CHANGED: "La reserva física ya no pertenece al pedido del despacho",
      UNIT_NOT_RESERVED: "Una unidad del despacho dejó de estar reservada",
      RESERVATION_RELEASE_BLOCKED: "No se pudo liberar de forma segura toda la reserva del pedido",
      RESERVATION_OWNER_NOT_FOUND: "No se pudo determinar el dueño de la reserva física",
    };
    if (map[message]) {
      return NextResponse.json({ error: map[message] }, { status: 409 });
    }
    console.error("[operations/dispatches/:id/cancel] POST error:", error);
    return NextResponse.json({ error: "No se pudo cancelar el despacho" }, { status: 500 });
  }
}

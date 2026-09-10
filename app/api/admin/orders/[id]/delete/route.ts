import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_REVIEW_ROLES } from "@/lib/rbac";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";

const PRE_PRODUCTION_STATUSES = ["draft", "planned"];

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const confirmText = String(body?.confirmText || "").trim();
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const actorId = auth.session.user.id || null;
  const cancellationReason =
    reason || `Pedido cancelado por ${auth.session.user.email || auth.session.user.id || "admin"}`;

  if (confirmText !== "ELIMINAR") {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize cancellation against approval/dispatch flows that also mutate
      // the authoritative checkout Order. Re-read after the lock so the decision
      // cannot be based on the stale list snapshot shown in the admin UI.
      const orderLock = await tx.order.updateMany({
        where: { id },
        data: { updatedAt: new Date() },
      });
      if (orderLock.count !== 1) throw new Error("ORDER_NOT_FOUND");

      const order = await tx.order.findUnique({
        where: { id },
        select: {
          id: true,
          orderNumber: true,
          providerReference: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          paymentProofUrl: true,
          manualPaymentReference: true,
          orderStatus: true,
          paymentStatus: true,
        },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.orderStatus === "completed") throw new Error("ORDER_FINALIZED");

      const linkedCommercialOrders = await tx.operationCommercialOrder.findMany({
        where: {
          sourceId: id,
          customerType: { not: "internal" },
        },
        select: {
          id: true,
          code: true,
          status: true,
          fulfillmentStatus: true,
          dispatch: {
            select: { id: true, status: true },
          },
        },
      });

      const liveDispatch = linkedCommercialOrders
        .map((commercialOrder) => commercialOrder.dispatch)
        .find((dispatch) => dispatch && dispatch.status !== "cancelled");
      if (liveDispatch) throw new Error("ACTIVE_DISPATCH_MUST_BE_CANCELLED_FIRST");

      // Release and cancellation are one atomic transaction. If any physical
      // reservation became committed since the UI loaded, abort the whole
      // cancellation instead of cancelling the order around a stranded unit.
      const reservationResult = await releaseEligibleOrderReservations(tx, {
        orderId: id,
        actorId,
        reason: cancellationReason,
        dryRun: false,
      });
      if (reservationResult.blockedCount > 0) {
        throw new Error("RESERVATION_RELEASE_BLOCKED");
      }

      const commercialOrderIds = linkedCommercialOrders.map((commercialOrder) => commercialOrder.id);
      const productionLinkFilters = [
        {
          events: {
            some: {
              eventType: "CREATED",
              metadataJson: { contains: `"orderId":"${id}"` },
            },
          },
        },
        ...commercialOrderIds.flatMap((commercialOrderId) => [
          {
            events: {
              some: {
                eventType: "CREATED",
                metadataJson: { contains: `"commercialOrderId":"${commercialOrderId}"` },
              },
            },
          },
          {
            notes: { contains: `[commercialOrderId:${commercialOrderId}]` },
          },
        ]),
      ];

      const linkedProductionOrders = productionLinkFilters.length > 0
        ? await tx.operationProductionOrder.findMany({
            where: { OR: productionLinkFilters },
            select: {
              id: true,
              code: true,
              status: true,
              producedQuantity: true,
              _count: { select: { digitalItems: true } },
            },
          })
        : [];

      const cancelledProductionOrders: Array<{ id: string; code: string }> = [];
      const preservedProductionOrders: Array<{ id: string; code: string; status: string }> = [];

      for (const productionOrder of linkedProductionOrders) {
        const preProduction =
          PRE_PRODUCTION_STATUSES.includes(productionOrder.status) &&
          Number(productionOrder.producedQuantity) === 0 &&
          productionOrder._count.digitalItems === 0;

        if (!preProduction) {
          if (!["completed", "cancelled", "failed"].includes(productionOrder.status)) {
            preservedProductionOrders.push({
              id: productionOrder.id,
              code: productionOrder.code,
              status: productionOrder.status,
            });
          }
          continue;
        }

        // Compare-and-set the same parent row used by production preparation.
        // Once digital/physical production has started, cancellation of customer
        // demand must not pretend that work never existed: that output continues
        // to inventory and downstream reservation guards keep it away from the
        // cancelled customer.
        const cancelled = await tx.operationProductionOrder.updateMany({
          where: {
            id: productionOrder.id,
            status: { in: PRE_PRODUCTION_STATUSES },
            producedQuantity: 0,
            digitalItems: { none: {} },
          },
          data: { status: "cancelled" },
        });

        if (cancelled.count !== 1) {
          preservedProductionOrders.push({
            id: productionOrder.id,
            code: productionOrder.code,
            status: productionOrder.status,
          });
          continue;
        }

        await tx.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "CANCELLED",
            reason: cancellationReason,
            metadataJson: JSON.stringify({
              source: "admin_order_cancellation",
              orderId: id,
              beforePhysicalProduction: true,
            }),
            createdById: actorId,
          },
        });
        cancelledProductionOrders.push({
          id: productionOrder.id,
          code: productionOrder.code,
        });
      }

      let cancelledCommercialOrdersCount = 0;
      for (const commercialOrder of linkedCommercialOrders) {
        if (commercialOrder.status === "cancelled") continue;

        await tx.operationCommercialOrder.update({
          where: { id: commercialOrder.id },
          data: {
            status: "cancelled",
            fulfillmentStatus: "pending",
          },
        });
        await tx.operationCommercialOrderEvent.create({
          data: {
            commercialOrderId: commercialOrder.id,
            eventType: "CANCELLED",
            reason: cancellationReason,
            referenceType: "order",
            referenceId: id,
            metadataJson: JSON.stringify({
              source: "admin_order_cancellation",
              orderId: id,
              previousStatus: commercialOrder.status,
              previousFulfillmentStatus: commercialOrder.fulfillmentStatus,
              releasedUnitCount: reservationResult.releasedCount,
            }),
            createdById: actorId,
          },
        });
        cancelledCommercialOrdersCount += 1;
      }

      await tx.order.update({
        where: { id },
        data: {
          orderStatus: "cancelled",
          paymentStatus: "cancelled",
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: "order",
          entityId: id,
          action: "soft_delete",
          oldValuesJson: JSON.stringify({
            orderNumber: order.orderNumber,
            providerReference: order.providerReference,
            customerName: order.customerName,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
          }),
          newValuesJson: JSON.stringify({
            deletedAt: new Date().toISOString(),
            deletedMode: "soft_delete",
            deleteSource: "admin_orders_tab",
            deletedReason: reason || null,
            deletedBy: actorId || auth.session.user.email || null,
            releasedReservationsCount: reservationResult.releasedCount,
            cancelledCommercialOrdersCount,
            cancelledProductionOrderIds: cancelledProductionOrders.map((production) => production.id),
            preservedProductionOrderIds: preservedProductionOrders.map((production) => production.id),
          }),
        },
      });

      return {
        order,
        reservationResult,
        cancelledCommercialOrdersCount,
        cancelledProductionOrders,
        preservedProductionOrders,
      };
    });

    return NextResponse.json({
      success: true,
      deleted: true,
      mode: "soft_delete",
      orderId: id,
      orderNumber: result.order.orderNumber,
      cancelled: true,
      releasedReservationsCount: result.reservationResult.releasedCount,
      blockedReservationsCount: result.reservationResult.blockedCount,
      releasedUnits: result.reservationResult.releasedUnits,
      blockedUnits: result.reservationResult.blockedUnits,
      cancelledCommercialOrdersCount: result.cancelledCommercialOrdersCount,
      cancelledProductionOrders: result.cancelledProductionOrders,
      preservedProductionOrders: result.preservedProductionOrders,
      message:
        result.cancelledProductionOrders.length > 0
          ? "Pedido cancelado, reservas liberadas y producción aún no iniciada cancelada."
          : result.reservationResult.releasedCount > 0
            ? "Pedido cancelado y reservas elegibles liberadas."
            : "Pedido cancelado sin reservas para liberar.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }
    if (message === "ORDER_FINALIZED") {
      return NextResponse.json(
        { error: "Un pedido ya entregado no puede cancelarse desde Pedidos." },
        { status: 409 }
      );
    }
    if (message === "ACTIVE_DISPATCH_MUST_BE_CANCELLED_FIRST") {
      return NextResponse.json(
        { error: "Cancela primero el despacho vinculado antes de cancelar el pedido." },
        { status: 409 }
      );
    }
    if (message === "RESERVATION_RELEASE_BLOCKED") {
      return NextResponse.json(
        { error: "Una reserva física ya avanzó y no puede liberarse de forma segura." },
        { status: 409 }
      );
    }

    console.error("[admin/orders/:id/delete] error", error);
    return NextResponse.json({ error: "No se pudo cancelar el pedido." }, { status: 500 });
  }
}

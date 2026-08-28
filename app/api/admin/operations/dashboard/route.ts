import { OperationFinishedGoodUnitStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ACTIVE_PRODUCTION_STATUSES = ["draft", "planned", "sent_to_print", "print_received", "started", "paused", "qa_pending"];
const ACTIVE_DISPATCH_STATUSES = ["draft", "reserved", "released", "pending_pick", "pending_preparation", "prepared", "sent", "shipped", "dispatched"];
const HIDDEN_INVENTORY_STATUSES: OperationFinishedGoodUnitStatus[] = ["discarded", "cancelled"];
const ACTIVE_PEDIDOS_ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped"];
const BLOCKED_PEDIDOS_PAYMENT_STATUSES: OrderPaymentStatus[] = ["rejected", "cancelled"];

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const [
      totalProductionOrders,
      productionDraft,
      productionStarted,
      productionActive,
      productionCompleted,
      totalDispatches,
      dispatchActive,
      dispatchReserved,
      dispatchDispatched,
      dispatchDelivered,
      deliveredPendingActivation,
      totalCommercialOrders,
      activePedidosOrders,
      commercialPaid,
      warrantiesClaimOpen,
      replacementsApproved,
      returnsReceived,
      physicalUnitsTotal,
      physicalUnitsAvailable,
      physicalUnitsReserved,
      physicalUnitsQaPending,
      physicalUnitsQaFailed,
      physicalUnitsDispatched,
      physicalUnitsDelivered,
      physicalUnitsActivated,
    ] = await Promise.all([
      prisma.operationProductionOrder.count(),
      prisma.operationProductionOrder.count({ where: { status: "draft" } }),
      prisma.operationProductionOrder.count({ where: { status: "started" } }),
      prisma.operationProductionOrder.count({ where: { status: { in: ACTIVE_PRODUCTION_STATUSES } } }),
      prisma.operationProductionOrder.count({ where: { status: "completed" } }),
      prisma.operationDispatch.count(),
      prisma.operationDispatch.count({ where: { status: { in: ACTIVE_DISPATCH_STATUSES } } }),
      prisma.operationDispatch.count({ where: { status: "reserved" } }),
      prisma.operationDispatch.count({ where: { status: { in: ["sent", "shipped", "dispatched"] } } }),
      prisma.operationDispatch.count({ where: { status: "delivered" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "delivered", activationStatus: "not_activated" } }),
      prisma.operationCommercialOrder.count(),
      prisma.order.count({
        where: {
          orderStatus: { in: ACTIVE_PEDIDOS_ORDER_STATUSES },
          paymentStatus: { notIn: BLOCKED_PEDIDOS_PAYMENT_STATUSES },
        },
      }),
      prisma.operationCommercialOrder.count({ where: { paymentStatus: "paid" } }),
      prisma.operationWarranty.count({ where: { coverageStatus: "claim_open" } }),
      prisma.operationReplacement.count({ where: { status: "approved" } }),
      prisma.operationReturn.count({ where: { status: "received" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES } } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "available", qaStatus: "passed", activationStatus: "not_activated", reservedOrderId: null } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "reserved" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES }, qaStatus: "pending" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES }, qaStatus: "failed" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "dispatched" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "delivered" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES }, activationStatus: "activated" } }),
    ]);

    return NextResponse.json({
      dashboard: {
        commercial: { totalCommercialOrders, activePedidosOrders, commercialPaid },
        production: { totalProductionOrders, productionDraft, productionStarted, productionActive, productionCompleted },
        physicalUnits: {
          total: physicalUnitsTotal,
          available: physicalUnitsAvailable,
          reserved: physicalUnitsReserved,
          qaPending: physicalUnitsQaPending,
          qaFailed: physicalUnitsQaFailed,
          dispatched: physicalUnitsDispatched,
          delivered: physicalUnitsDelivered,
          activated: physicalUnitsActivated,
        },
        dispatch: { totalDispatches, dispatchActive, dispatchReserved, dispatchDispatched, dispatchDelivered, deliveredPendingActivation },
        warranties: { warrantiesClaimOpen },
        replacements: { replacementsApproved },
        returns: { returnsReceived },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[operations/dashboard] GET error:", error);
    return NextResponse.json({ error: "Error al cargar dashboard de operaciones" }, { status: 500 });
  }
}

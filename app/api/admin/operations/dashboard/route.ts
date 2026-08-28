import { OperationFinishedGoodUnitStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { calculateFinishedGoodBalance } from "../finished-goods/finished-goods.helpers";
import { MoneyInput, parseMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const ACTIVE_PRODUCTION_STATUSES = ["draft", "planned", "sent_to_print", "print_received", "started", "paused", "qa_pending"];
const HIDDEN_INVENTORY_STATUSES: OperationFinishedGoodUnitStatus[] = ["discarded", "cancelled"];
const ACTIVE_PEDIDOS_ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped"];
const BLOCKED_PEDIDOS_PAYMENT_STATUSES: OrderPaymentStatus[] = ["rejected", "cancelled"];

function numberOrZero(value: MoneyInput) {
  return Number.parseFloat(parseMoney(value).toFixed(2));
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const [
      totalMaterials,
      activeMaterials,
      materialEventsCount,
      totalProductionOrders,
      productionDraft,
      productionStarted,
      productionActive,
      productionCompleted,
      productionProduced,
      totalQcInspections,
      qcPending,
      qcInProgress,
      qcCompleted,
      qcQuantities,
      totalPackingBatches,
      packingInProgress,
      packingCompleted,
      packingPacked,
      totalFinishedGoods,
      totalFinishedGoodEvents,
      finishedGoodEventTotals,
      totalDispatches,
      dispatchDraft,
      dispatchReserved,
      dispatchDispatched,
      dispatchDelivered,
      deliveredPendingActivation,
      totalCommercialOrders,
      activePedidosOrders,
      commercialConfirmed,
      commercialPaid,
      commercialAmount,
      totalWarranties,
      warrantiesActive,
      warrantiesClaimOpen,
      warrantiesExpired,
      totalReplacements,
      replacementsApproved,
      replacementsCompleted,
      totalReturns,
      returnsReceived,
      returnsCompleted,
      returnedToInventory,
      physicalUnitsTotal,
      physicalUnitsAvailable,
      physicalUnitsReserved,
      physicalUnitsQaPending,
      physicalUnitsQaFailed,
      physicalUnitsDispatched,
      physicalUnitsDelivered,
      physicalUnitsActivated,
    ] = await Promise.all([
      prisma.operationMaterial.count(),
      prisma.operationMaterial.count({ where: { status: "active" } }),
      prisma.operationMaterialEvent.count(),
      prisma.operationProductionOrder.count(),
      prisma.operationProductionOrder.count({ where: { status: "draft" } }),
      prisma.operationProductionOrder.count({ where: { status: "started" } }),
      prisma.operationProductionOrder.count({ where: { status: { in: ACTIVE_PRODUCTION_STATUSES } } }),
      prisma.operationProductionOrder.count({ where: { status: "completed" } }),
      prisma.operationProductionOrder.aggregate({ _sum: { producedQuantity: true } }),
      prisma.operationQcInspection.count(),
      prisma.operationQcInspection.count({ where: { status: "pending" } }),
      prisma.operationQcInspection.count({ where: { status: "in_progress" } }),
      prisma.operationQcInspection.count({ where: { status: "completed" } }),
      prisma.operationQcInspection.aggregate({ _sum: { passedQuantity: true, failedQuantity: true } }),
      prisma.operationPackingBatch.count(),
      prisma.operationPackingBatch.count({ where: { status: "in_progress" } }),
      prisma.operationPackingBatch.count({ where: { status: "completed" } }),
      prisma.operationPackingBatch.aggregate({ _sum: { packedQuantity: true } }),
      prisma.operationFinishedGood.count(),
      prisma.operationFinishedGoodEvent.count(),
      prisma.operationFinishedGoodEvent.groupBy({ by: ["eventType"], _sum: { quantity: true } }),
      prisma.operationDispatch.count(),
      prisma.operationDispatch.count({ where: { status: "draft" } }),
      prisma.operationDispatch.count({ where: { status: "reserved" } }),
      prisma.operationDispatch.count({ where: { status: "dispatched" } }),
      prisma.operationDispatch.count({ where: { status: "delivered" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "delivered", activationStatus: "not_activated" } }),
      prisma.operationCommercialOrder.count(),
      prisma.order.count({
        where: {
          orderStatus: { in: ACTIVE_PEDIDOS_ORDER_STATUSES },
          paymentStatus: { notIn: BLOCKED_PEDIDOS_PAYMENT_STATUSES },
        },
      }),
      prisma.operationCommercialOrder.count({ where: { status: "confirmed" } }),
      prisma.operationCommercialOrder.count({ where: { paymentStatus: "paid" } }),
      prisma.operationCommercialOrder.aggregate({ _sum: { totalAmount: true } }),
      prisma.operationWarranty.count(),
      prisma.operationWarranty.count({ where: { status: "active" } }),
      prisma.operationWarranty.count({ where: { coverageStatus: "claim_open" } }),
      prisma.operationWarranty.count({ where: { status: "expired" } }),
      prisma.operationReplacement.count(),
      prisma.operationReplacement.count({ where: { status: "approved" } }),
      prisma.operationReplacement.count({ where: { status: "completed" } }),
      prisma.operationReturn.count(),
      prisma.operationReturn.count({ where: { status: "received" } }),
      prisma.operationReturn.count({ where: { status: "completed" } }),
      prisma.operationReturnEvent.aggregate({ where: { eventType: "RETURNED_TO_INVENTORY" }, _sum: { quantity: true } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES } } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "available", qaStatus: "passed", activationStatus: "not_activated", reservedOrderId: null } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "reserved" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES }, qaStatus: "pending" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES }, qaStatus: "failed" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "dispatched" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: "delivered" } }),
      prisma.operationFinishedGoodUnit.count({ where: { status: { notIn: HIDDEN_INVENTORY_STATUSES }, activationStatus: "activated" } }),
    ]);

    const totalAvailableBalance = calculateFinishedGoodBalance(
      finishedGoodEventTotals.map((item) => ({ eventType: item.eventType, quantity: numberOrZero(item._sum.quantity) }))
    );

    return NextResponse.json({
      dashboard: {
        materials: { totalMaterials, activeMaterials, materialEventsCount },
        production: { totalProductionOrders, productionDraft, productionStarted, productionActive, productionCompleted, totalProducedQuantity: numberOrZero(productionProduced._sum.producedQuantity) },
        qc: { totalQcInspections, qcPending, qcInProgress, qcCompleted, totalPassedQuantity: numberOrZero(qcQuantities._sum.passedQuantity), totalFailedQuantity: numberOrZero(qcQuantities._sum.failedQuantity) },
        packing: { totalPackingBatches, packingInProgress, packingCompleted, totalPackedQuantity: numberOrZero(packingPacked._sum.packedQuantity) },
        finishedGoods: { totalFinishedGoods, totalFinishedGoodEvents, totalAvailableBalance },
        physicalUnits: { total: physicalUnitsTotal, available: physicalUnitsAvailable, reserved: physicalUnitsReserved, qaPending: physicalUnitsQaPending, qaFailed: physicalUnitsQaFailed, dispatched: physicalUnitsDispatched, delivered: physicalUnitsDelivered, activated: physicalUnitsActivated },
        dispatch: { totalDispatches, dispatchDraft, dispatchReserved, dispatchDispatched, dispatchDelivered, deliveredPendingActivation },
        commercial: { totalCommercialOrders, activePedidosOrders, commercialConfirmed, commercialPaid, commercialTotalAmount: numberOrZero(commercialAmount._sum.totalAmount) },
        warranties: { totalWarranties, warrantiesActive, warrantiesClaimOpen, warrantiesExpired },
        replacements: { totalReplacements, replacementsApproved, replacementsCompleted },
        returns: { totalReturns, returnsReceived, returnsCompleted, totalReturnedToInventoryQuantity: numberOrZero(returnedToInventory._sum.quantity) },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[operations/dashboard] GET error:", error);
    return NextResponse.json({ error: "Error al cargar dashboard de operaciones" }, { status: 500 });
  }
}

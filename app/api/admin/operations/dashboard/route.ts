import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { calculateFinishedGoodBalance } from "../finished-goods/finished-goods.helpers";

export const dynamic = "force-dynamic";

function numberOrZero(value: number | null | undefined) {
  return value || 0;
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
      totalCommercialOrders,
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
    ] = await Promise.all([
      prisma.operationMaterial.count(),
      prisma.operationMaterial.count({ where: { status: "active" } }),
      prisma.operationMaterialEvent.count(),
      prisma.operationProductionOrder.count(),
      prisma.operationProductionOrder.count({ where: { status: "draft" } }),
      prisma.operationProductionOrder.count({ where: { status: "started" } }),
      prisma.operationProductionOrder.count({ where: { status: "completed" } }),
      prisma.operationProductionOrder.aggregate({ _sum: { producedQuantity: true } }),
      prisma.operationQcInspection.count(),
      prisma.operationQcInspection.count({ where: { status: "pending" } }),
      prisma.operationQcInspection.count({ where: { status: "in_progress" } }),
      prisma.operationQcInspection.count({ where: { status: "completed" } }),
      prisma.operationQcInspection.aggregate({
        _sum: {
          passedQuantity: true,
          failedQuantity: true,
        },
      }),
      prisma.operationPackingBatch.count(),
      prisma.operationPackingBatch.count({ where: { status: "in_progress" } }),
      prisma.operationPackingBatch.count({ where: { status: "completed" } }),
      prisma.operationPackingBatch.aggregate({ _sum: { packedQuantity: true } }),
      prisma.operationFinishedGood.count(),
      prisma.operationFinishedGoodEvent.count(),
      prisma.operationFinishedGoodEvent.groupBy({
        by: ["eventType"],
        _sum: { quantity: true },
      }),
      prisma.operationDispatch.count(),
      prisma.operationDispatch.count({ where: { status: "draft" } }),
      prisma.operationDispatch.count({ where: { status: "reserved" } }),
      prisma.operationDispatch.count({ where: { status: "dispatched" } }),
      prisma.operationDispatch.count({ where: { status: "delivered" } }),
      prisma.operationCommercialOrder.count(),
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
      prisma.operationReturnEvent.aggregate({
        where: { eventType: "RETURNED_TO_INVENTORY" },
        _sum: { quantity: true },
      }),
    ]);

    const totalAvailableBalance = calculateFinishedGoodBalance(
      finishedGoodEventTotals.map((item) => ({
        eventType: item.eventType,
        quantity: numberOrZero(item._sum.quantity),
      }))
    );

    return NextResponse.json({
      dashboard: {
        materials: {
          totalMaterials,
          activeMaterials,
          materialEventsCount,
        },
        production: {
          totalProductionOrders,
          productionDraft,
          productionStarted,
          productionCompleted,
          totalProducedQuantity: numberOrZero(productionProduced._sum.producedQuantity),
        },
        qc: {
          totalQcInspections,
          qcPending,
          qcInProgress,
          qcCompleted,
          totalPassedQuantity: numberOrZero(qcQuantities._sum.passedQuantity),
          totalFailedQuantity: numberOrZero(qcQuantities._sum.failedQuantity),
        },
        packing: {
          totalPackingBatches,
          packingInProgress,
          packingCompleted,
          totalPackedQuantity: numberOrZero(packingPacked._sum.packedQuantity),
        },
        finishedGoods: {
          totalFinishedGoods,
          totalFinishedGoodEvents,
          totalAvailableBalance,
        },
        dispatch: {
          totalDispatches,
          dispatchDraft,
          dispatchReserved,
          dispatchDispatched,
          dispatchDelivered,
        },
        commercial: {
          totalCommercialOrders,
          commercialConfirmed,
          commercialPaid,
          commercialTotalAmount: numberOrZero(commercialAmount._sum.totalAmount),
        },
        warranties: {
          totalWarranties,
          warrantiesActive,
          warrantiesClaimOpen,
          warrantiesExpired,
        },
        replacements: {
          totalReplacements,
          replacementsApproved,
          replacementsCompleted,
        },
        returns: {
          totalReturns,
          returnsReceived,
          returnsCompleted,
          totalReturnedToInventoryQuantity: numberOrZero(returnedToInventory._sum.quantity),
        },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[operations/dashboard] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar dashboard de operaciones" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { isCommercialOrderEligibleForReservation } from "@/lib/operations/commercial-order-reservation";
import {
  resolveCustomerProductionRoutingContext,
  routeCustomerProductionUnit,
} from "@/lib/operations/customer-production-routing";

export const dynamic = "force-dynamic";

const MAX_RECONCILIATION_BATCH = 50;

async function loadCandidateUnits() {
  return prisma.operationFinishedGoodUnit.findMany({
    where: {
      status: "available",
      qaStatus: "passed",
      activationStatus: "not_activated",
      reservedOrderId: null,
      digitalBatchItem: { productionOrderId: { not: null } },
    },
    orderBy: { updatedAt: "asc" },
    take: MAX_RECONCILIATION_BATCH,
    select: {
      id: true,
      productCode: true,
      productName: true,
      productType: true,
      status: true,
      qaStatus: true,
      reservedOrderId: true,
      digitalBatchItem: { select: { productionOrderId: true } },
    },
  });
}

async function inspectPending() {
  const candidates = await loadCandidateUnits();
  const pending: Array<{
    unitId: string;
    productionOrderId: string;
    commercialOrderId: string;
    canonicalProductCode: string;
    currentProductCode: string;
  }> = [];

  for (const unit of candidates) {
    const productionOrderId = unit.digitalBatchItem?.productionOrderId;
    if (!productionOrderId) continue;
    try {
      const context = await resolveCustomerProductionRoutingContext(prisma, productionOrderId);
      if (
        context.kind !== "customer" ||
        !context.commercialOrder ||
        !context.canonicalFinishedGood ||
        !isCommercialOrderEligibleForReservation(context.commercialOrder)
      ) {
        continue;
      }

      pending.push({
        unitId: unit.id,
        productionOrderId,
        commercialOrderId: context.commercialOrder.id,
        canonicalProductCode: context.canonicalFinishedGood.code,
        currentProductCode: unit.productCode,
      });
    } catch (error) {
      console.error("[customer-production-reconciliation] inspect candidate failed", {
        unitId: unit.id,
        productionOrderId,
        error: error instanceof Error ? error.message : "UNKNOWN",
      });
    }
  }

  return pending;
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const pending = await inspectPending();
    return NextResponse.json({
      pendingCount: pending.length,
      hasPending: pending.length > 0,
      truncated: pending.length >= MAX_RECONCILIATION_BATCH,
    });
  } catch (error) {
    console.error("[customer-production-reconciliation] GET error", error);
    return NextResponse.json({ error: "No se pudo verificar la conciliación operativa" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const requestId = getAuditRequestId(req);

  try {
    const pending = await inspectPending();
    let reconciledCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const candidate of pending) {
      try {
        const outcome = await prisma.$transaction(async (tx) => {
          const before = await tx.operationFinishedGoodUnit.findUnique({
            where: { id: candidate.unitId },
            select: {
              id: true,
              productCode: true,
              productName: true,
              productType: true,
              status: true,
              qaStatus: true,
              reservedOrderId: true,
            },
          });
          if (!before) return { changed: false };

          // Re-check the safety preconditions under the write transaction. Never
          // steal a unit that became reserved, dispatched, activated or otherwise
          // changed after the inspection pass.
          if (
            before.status !== "available" ||
            before.qaStatus !== "passed" ||
            before.reservedOrderId
          ) {
            return { changed: false };
          }

          const routed = await routeCustomerProductionUnit(tx, {
            productionOrderId: candidate.productionOrderId,
            unitId: candidate.unitId,
          });

          const after = routed.unit;
          const changed = Boolean(
            after &&
              (routed.identityReconciled ||
                after.reservedOrderId !== before.reservedOrderId ||
                after.status !== before.status)
          );

          if (changed) {
            await writeAuditLog(tx, {
              accountId: auth.session.user.accountId,
              actorUserId: auth.session.user.id,
              entityType: "OperationFinishedGoodUnit",
              entityId: candidate.unitId,
              action: "customer_production_reconciled",
              requestId,
              before,
              after: {
                productCode: after?.productCode || before.productCode,
                productName: after?.productName || before.productName,
                productType: after?.productType || before.productType,
                status: after?.status || before.status,
                reservedOrderId: after?.reservedOrderId || null,
                productionOrderId: candidate.productionOrderId,
                commercialOrderId: candidate.commercialOrderId,
              },
            });
          }

          return { changed };
        });

        if (outcome.changed) reconciledCount += 1;
        else skippedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error("[customer-production-reconciliation] POST candidate failed", {
          unitId: candidate.unitId,
          productionOrderId: candidate.productionOrderId,
          error: error instanceof Error ? error.message : "UNKNOWN",
        });
      }
    }

    const remaining = await inspectPending();
    return NextResponse.json({
      success: failedCount === 0,
      reconciledCount,
      skippedCount,
      failedCount,
      remainingCount: remaining.length,
    });
  } catch (error) {
    console.error("[customer-production-reconciliation] POST error", error);
    return NextResponse.json({ error: "No se pudo reconciliar la producción de cliente" }, { status: 500 });
  }
}

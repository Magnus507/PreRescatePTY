import type { Prisma, PrismaClient } from "@prisma/client";

type ProjectionReconciliationResult =
  | { kind: "reconciled"; commercialOrderId: string; dispatchId: string }
  | { kind: "already_consistent"; commercialOrderId: string; dispatchId: string }
  | { kind: "skipped"; commercialOrderId: string; reason: string };

const DELIVERED_UNIT_STATUSES = new Set(["delivered", "activated"]);

/**
 * Repairs only a commercial-order projection that can be proven delivered from
 * the source Order, Dispatch, DispatchItems and physical units. This is a
 * deliberately fail-closed historical reconciliation; it never manufactures a
 * delivery state from a partial or ambiguous record.
 */
export async function reconcileDeliveredCommercialOrderProjection(
  tx: Prisma.TransactionClient,
  commercialOrderId: string
): Promise<ProjectionReconciliationResult> {
  // Serialize recovery with any concurrent fulfillment mutation on the same
  // commercial order. PostgreSQL holds the row write lock until transaction end.
  const lock = await tx.operationCommercialOrder.updateMany({
    where: { id: commercialOrderId },
    data: { updatedAt: new Date() },
  });
  if (lock.count !== 1) {
    return { kind: "skipped", commercialOrderId, reason: "COMMERCIAL_ORDER_NOT_FOUND" };
  }

  const commercialOrder = await tx.operationCommercialOrder.findUnique({
    where: { id: commercialOrderId },
    include: {
      dispatch: {
        include: {
          items: {
            include: {
              unitRecord: {
                select: {
                  id: true,
                  status: true,
                  deliveredAt: true,
                  reservedOrderId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!commercialOrder) {
    return { kind: "skipped", commercialOrderId, reason: "COMMERCIAL_ORDER_NOT_FOUND" };
  }
  if (commercialOrder.customerType === "internal") {
    return { kind: "skipped", commercialOrderId, reason: "INTERNAL_ORDER" };
  }
  if (!commercialOrder.sourceId) {
    return { kind: "skipped", commercialOrderId, reason: "SOURCE_ORDER_REQUIRED" };
  }

  const dispatch = commercialOrder.dispatch;
  if (!dispatch || dispatch.status !== "delivered" || !dispatch.deliveredAt) {
    return { kind: "skipped", commercialOrderId, reason: "DISPATCH_NOT_PROVABLY_DELIVERED" };
  }

  if (
    commercialOrder.status === "completed" &&
    commercialOrder.fulfillmentStatus === "delivered"
  ) {
    return {
      kind: "already_consistent",
      commercialOrderId,
      dispatchId: dispatch.id,
    };
  }

  const sourceOrder = await tx.order.findUnique({
    where: { id: commercialOrder.sourceId },
    select: { orderStatus: true, paymentStatus: true },
  });
  if (
    !sourceOrder ||
    sourceOrder.orderStatus !== "completed" ||
    sourceOrder.paymentStatus !== "paid"
  ) {
    return { kind: "skipped", commercialOrderId, reason: "SOURCE_ORDER_NOT_COMPLETED_PAID" };
  }

  if (dispatch.items.length === 0) {
    return { kind: "skipped", commercialOrderId, reason: "DISPATCH_HAS_NO_ITEMS" };
  }

  const reservationOwnerId = commercialOrder.sourceId;
  const unitIds = new Set<string>();
  for (const item of dispatch.items) {
    if (
      item.status !== "delivered" ||
      !item.deliveredAt ||
      !item.unitId ||
      !item.unitRecord ||
      !item.unitRecord.deliveredAt ||
      !DELIVERED_UNIT_STATUSES.has(item.unitRecord.status) ||
      item.unitRecord.reservedOrderId !== reservationOwnerId
    ) {
      return { kind: "skipped", commercialOrderId, reason: "PHYSICAL_DELIVERY_NOT_CONSISTENT" };
    }
    if (unitIds.has(item.unitId)) {
      return { kind: "skipped", commercialOrderId, reason: "DUPLICATE_UNIT_IN_DISPATCH" };
    }
    unitIds.add(item.unitId);
  }

  const updated = await tx.operationCommercialOrder.updateMany({
    where: {
      id: commercialOrder.id,
      dispatchId: dispatch.id,
      OR: [
        { status: { not: "completed" } },
        { fulfillmentStatus: { not: "delivered" } },
      ],
    },
    data: {
      status: "completed",
      fulfillmentStatus: "delivered",
    },
  });

  if (updated.count !== 1) {
    const current = await tx.operationCommercialOrder.findUnique({
      where: { id: commercialOrder.id },
      select: { status: true, fulfillmentStatus: true },
    });
    if (current?.status === "completed" && current.fulfillmentStatus === "delivered") {
      return {
        kind: "already_consistent",
        commercialOrderId,
        dispatchId: dispatch.id,
      };
    }
    return { kind: "skipped", commercialOrderId, reason: "PROJECTION_CHANGED_CONCURRENTLY" };
  }

  await tx.operationCommercialOrderEvent.create({
    data: {
      commercialOrderId: commercialOrder.id,
      eventType: "DELIVERY_RECONCILED",
      reason: "Proyección comercial histórica reconciliada desde entrega física confirmada",
      referenceType: "dispatch",
      referenceId: dispatch.id,
      metadataJson: JSON.stringify({
        sourceOrderId: commercialOrder.sourceId,
        dispatchId: dispatch.id,
        dispatchDeliveredAt: dispatch.deliveredAt.toISOString(),
        unitCount: unitIds.size,
        previousStatus: commercialOrder.status,
        previousFulfillmentStatus: commercialOrder.fulfillmentStatus,
        reconciliationSource: "block1_delivery_projection_recovery",
      }),
      createdById: null,
    },
  });

  return {
    kind: "reconciled",
    commercialOrderId,
    dispatchId: dispatch.id,
  };
}

export async function recoverDeliveredCommercialOrderProjections(
  db: PrismaClient,
  input: { limit?: number } = {}
) {
  const limit = Math.max(1, Math.min(25, Math.floor(input.limit || 10)));
  const candidates = await db.operationCommercialOrder.findMany({
    where: {
      sourceId: { not: null },
      customerType: { not: "internal" },
      dispatchId: { not: null },
      OR: [
        { status: { not: "completed" } },
        { fulfillmentStatus: { not: "delivered" } },
      ],
    },
    orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
    take: Math.max(limit * 4, 25),
    select: { id: true },
  });

  let reconciled = 0;
  let alreadyConsistent = 0;
  let skipped = 0;
  const failures: Array<{ commercialOrderId: string; code: string }> = [];

  for (const candidate of candidates) {
    if (reconciled + alreadyConsistent >= limit) break;
    try {
      const result = await db.$transaction((tx) =>
        reconcileDeliveredCommercialOrderProjection(tx, candidate.id)
      );
      if (result.kind === "reconciled") reconciled += 1;
      else if (result.kind === "already_consistent") alreadyConsistent += 1;
      else skipped += 1;
    } catch (error) {
      const code = error instanceof Error
        ? error.message.replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 120)
        : "UNKNOWN_DELIVERY_RECONCILIATION_ERROR";
      failures.push({ commercialOrderId: candidate.id, code });
    }
  }

  return {
    scanned: candidates.length,
    reconciled,
    alreadyConsistent,
    skipped,
    failed: failures.length,
    failures,
  };
}

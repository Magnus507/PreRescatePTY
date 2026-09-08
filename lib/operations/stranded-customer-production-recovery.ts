import type { PrismaClient } from "@prisma/client";
import { reconcileCustomerProducedUnitReservation } from "@/lib/operations/customer-produced-unit-reservation";

type ProductionSource = {
  customerOrderId: string | null;
  commercialOrderId: string | null;
  internal: boolean;
};

type RecoveryOutcome =
  | { kind: "reserved"; identityReconciled: boolean }
  | { kind: "skipped"; reason: string; identityReconciled?: boolean };

function parseMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function resolveProductionSource(input: {
  code: string;
  notes: string | null;
  events: Array<{ eventType: string; metadataJson: string | null }>;
}): ProductionSource {
  for (const event of input.events) {
    if (event.eventType !== "CREATED") continue;
    const metadata = parseMetadata(event.metadataJson);
    if (!metadata) continue;

    const sourceType = typeof metadata.sourceType === "string" ? metadata.sourceType : null;
    const orderSource = typeof metadata.orderSource === "string" ? metadata.orderSource : null;
    const orderId = typeof metadata.orderId === "string" ? metadata.orderId : null;
    const commercialOrderId = typeof metadata.commercialOrderId === "string" ? metadata.commercialOrderId : null;

    if (sourceType === "customer_order" && orderId) {
      return { customerOrderId: orderId, commercialOrderId, internal: false };
    }
    if (orderSource === "internal") {
      return { customerOrderId: null, commercialOrderId, internal: true };
    }
    if (commercialOrderId) {
      return { customerOrderId: null, commercialOrderId, internal: false };
    }
  }

  const legacyCommercialOrderId = input.notes?.match(/\[commercialOrderId:([^\]]+)\]/)?.[1]
    || input.notes?.match(/W605H-B-BACKORDER-PRODUCTION:([^\s]+)/)?.[1]
    || null;

  return {
    customerOrderId: null,
    commercialOrderId: legacyCommercialOrderId,
    internal:
      input.code.startsWith("PROD-INT-") ||
      Boolean(input.notes?.includes("Pedido interno para fabricar inventario")),
  };
}

function isTerminalCommercialOrder(order: { status: string; paymentStatus: string }) {
  return (
    order.status === "cancelled" ||
    ["cancelled", "rejected", "refunded"].includes(order.paymentStatus)
  );
}

function safeErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN_RECOVERY_ERROR";
  return error.message.replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 120) || "UNKNOWN_RECOVERY_ERROR";
}

export async function recoverStrandedCustomerProducedUnits(
  db: PrismaClient,
  input: { limit?: number } = {}
) {
  const limit = Math.max(1, Math.min(25, Math.floor(input.limit || 10)));

  // Only inspect production orders that carry customer-order provenance. This
  // deliberately excludes ordinary/internal production from automatic recovery.
  const productionOrders = await db.operationProductionOrder.findMany({
    where: {
      OR: [
        {
          events: {
            some: {
              eventType: "CREATED",
              metadataJson: { contains: "\"sourceType\":\"customer_order\"" },
            },
          },
        },
        { notes: { contains: "[commercialOrderId:" } },
        { notes: { contains: "W605H-B-BACKORDER-PRODUCTION:" } },
      ],
    },
    orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
    take: Math.max(limit * 4, 25),
    select: { id: true },
  });

  const candidates: Array<{ productionOrderId: string; unitId: string }> = [];
  for (const productionOrder of productionOrders) {
    if (candidates.length >= limit) break;
    const units = await db.operationFinishedGoodUnit.findMany({
      where: {
        digitalBatchItem: { productionOrderId: productionOrder.id },
        status: "available",
        qaStatus: "passed",
        activationStatus: "not_activated",
        reservedOrderId: null,
        dispatchItems: { none: {} },
      },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
      take: limit - candidates.length,
      select: { id: true },
    });
    candidates.push(...units.map((unit) => ({
      productionOrderId: productionOrder.id,
      unitId: unit.id,
    })));
  }

  let reserved = 0;
  let identityReconciled = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ unitId: string; code: string }> = [];

  for (const candidate of candidates) {
    try {
      const outcome = await db.$transaction<RecoveryOutcome>(async (tx) => {
        const productionOrder = await tx.operationProductionOrder.findUnique({
          where: { id: candidate.productionOrderId },
          select: {
            id: true,
            code: true,
            notes: true,
            outputType: true,
            events: {
              where: { eventType: "CREATED" },
              orderBy: { createdAt: "asc" },
              select: { eventType: true, metadataJson: true },
            },
          },
        });
        if (!productionOrder) return { kind: "skipped", reason: "PRODUCTION_NOT_FOUND" };

        const source = resolveProductionSource(productionOrder);
        if (source.internal) return { kind: "skipped", reason: "INTERNAL_PRODUCTION" };

        let commercialOrder = source.commercialOrderId
          ? await tx.operationCommercialOrder.findUnique({
              where: { id: source.commercialOrderId },
              select: {
                id: true,
                sourceId: true,
                customerType: true,
                status: true,
                paymentStatus: true,
              },
            })
          : null;

        if (!commercialOrder && source.customerOrderId) {
          commercialOrder = await tx.operationCommercialOrder.findFirst({
            where: { sourceId: source.customerOrderId },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              sourceId: true,
              customerType: true,
              status: true,
              paymentStatus: true,
            },
          });
        }

        if (!commercialOrder) return { kind: "skipped", reason: "COMMERCIAL_ORDER_NOT_FOUND" };
        if (commercialOrder.customerType === "internal") {
          return { kind: "skipped", reason: "INTERNAL_COMMERCIAL_ORDER" };
        }

        const reservationOrderId = commercialOrder.sourceId || commercialOrder.id;
        let unit = await tx.operationFinishedGoodUnit.findUnique({
          where: { id: candidate.unitId },
          select: {
            id: true,
            productCode: true,
            status: true,
            qaStatus: true,
            activationStatus: true,
            reservedOrderId: true,
            dispatchItems: { select: { id: true }, take: 1 },
          },
        });
        if (!unit) return { kind: "skipped", reason: "UNIT_NOT_FOUND" };

        if (
          unit.status !== "available" ||
          unit.qaStatus !== "passed" ||
          unit.activationStatus !== "not_activated" ||
          unit.reservedOrderId !== null ||
          unit.dispatchItems.length > 0
        ) {
          return { kind: "skipped", reason: "UNIT_NO_LONGER_STRANDED" };
        }

        let repairedIdentity = false;
        if (productionOrder.outputType) {
          const canonicalFinishedGood = await tx.operationFinishedGood.findUnique({
            where: { code: productionOrder.outputType },
            select: { code: true, name: true, productType: true },
          });

          if (canonicalFinishedGood && unit.productCode !== canonicalFinishedGood.code) {
            const repaired = await tx.operationFinishedGoodUnit.updateMany({
              where: {
                id: unit.id,
                status: "available",
                qaStatus: "passed",
                activationStatus: "not_activated",
                reservedOrderId: null,
                dispatchItems: { none: {} },
              },
              data: {
                productCode: canonicalFinishedGood.code,
                productName: canonicalFinishedGood.name,
                productType: canonicalFinishedGood.productType,
              },
            });
            if (repaired.count !== 1) {
              throw new Error("HISTORICAL_IDENTITY_RECONCILIATION_RACE");
            }

            await tx.operationFinishedGoodUnitEvent.create({
              data: {
                unitId: unit.id,
                eventType: "PRODUCT_IDENTITY_RECONCILED",
                reason: "Identidad histórica reconciliada desde la orden de producción",
                referenceType: "production_order",
                referenceId: productionOrder.id,
                metadataJson: {
                  previousProductCode: unit.productCode,
                  canonicalProductCode: canonicalFinishedGood.code,
                  commercialOrderId: commercialOrder.id,
                  customerOrderId: reservationOrderId,
                  reconciliationSource: "commerce_order_sync_recovery",
                },
              },
            });
            repairedIdentity = true;
            unit = { ...unit, productCode: canonicalFinishedGood.code };
          }
        }

        await reconcileCustomerProducedUnitReservation(tx, {
          commercialOrderId: commercialOrder.id,
          unitId: unit.id,
        });

        // The reconciler serializes on the commercial order. Re-read both rows
        // while that lock is still held so a concurrent cancellation is a valid
        // terminal outcome rather than a false recovery failure.
        const [refreshedOrder, refreshedUnit] = await Promise.all([
          tx.operationCommercialOrder.findUnique({
            where: { id: commercialOrder.id },
            select: { status: true, paymentStatus: true },
          }),
          tx.operationFinishedGoodUnit.findUnique({
            where: { id: unit.id },
            select: {
              status: true,
              reservedOrderId: true,
              qaStatus: true,
              activationStatus: true,
              dispatchItems: { select: { id: true }, take: 1 },
            },
          }),
        ]);

        if (!refreshedOrder || !refreshedUnit) {
          throw new Error("HISTORICAL_RECOVERY_STATE_NOT_FOUND");
        }

        if (isTerminalCommercialOrder(refreshedOrder)) {
          if (
            refreshedUnit.status !== "available" ||
            refreshedUnit.reservedOrderId !== null ||
            refreshedUnit.qaStatus !== "passed" ||
            refreshedUnit.activationStatus !== "not_activated" ||
            refreshedUnit.dispatchItems.length > 0
          ) {
            throw new Error("HISTORICAL_TERMINAL_ORDER_UNIT_STATE_INVALID");
          }

          return {
            kind: "skipped",
            reason: "SOURCE_ORDER_TERMINAL",
            identityReconciled: repairedIdentity,
          };
        }

        if (
          refreshedUnit.status !== "reserved" ||
          refreshedUnit.reservedOrderId !== reservationOrderId
        ) {
          throw new Error("HISTORICAL_CUSTOMER_UNIT_NOT_RESERVED");
        }

        await tx.operationProductionEvent.create({
          data: {
            productionOrderId: productionOrder.id,
            eventType: "CUSTOMER_UNIT_RECOVERED",
            reason: "Unidad histórica post-QC conciliada con su pedido origen",
            metadataJson: JSON.stringify({
              unitId: unit.id,
              commercialOrderId: commercialOrder.id,
              customerOrderId: reservationOrderId,
              identityReconciled: repairedIdentity,
            }),
            createdById: null,
          },
        });

        return { kind: "reserved", identityReconciled: repairedIdentity };
      });

      if (outcome.identityReconciled) identityReconciled += 1;
      if (outcome.kind === "reserved") {
        reserved += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      failures.push({ unitId: candidate.unitId, code: safeErrorCode(error) });
    }
  }

  return {
    scanned: candidates.length,
    reserved,
    identityReconciled,
    skipped,
    failed,
    failures,
  };
}

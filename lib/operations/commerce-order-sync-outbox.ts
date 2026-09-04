import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { parseMoney } from "@/lib/money";
import {
  SyncRealOrderToOperationsInput,
  syncRealOrderToOperations,
} from "@/lib/operations/sync-real-order-to-operations";

type OutboxDbClient = Pick<PrismaClient, "commerceOrderSyncOutbox">;
type StoredOrderOutboxDbClient = Pick<PrismaClient, "order" | "commerceOrderSyncOutbox">;
type DbClient = PrismaClient;

export const COMMERCE_ORDER_SYNC_EVENT_TYPE = "commerce.order.sync_requested";
export const COMMERCE_ORDER_SYNC_PAYLOAD_VERSION = 1;

export type CommerceOrderSyncOutboxPayloadV1 = {
  version: typeof COMMERCE_ORDER_SYNC_PAYLOAD_VERSION;
  syncInput: SyncRealOrderToOperationsInput;
};

export type CommerceOrderSyncOutboxRow = {
  id: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  deduplicationKey: string;
  payloadVersion: number;
  payloadJson: string;
  status: string;
  attempts: number;
  availableAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  processedAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredOrderItemSnapshot = {
  productId: string | null;
  productType: string;
  productName: string | null;
  productCode: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal | Prisma.DecimalJsLike | number | string;
  operationalMappingId: string | null;
  operationalMappingStatus: string | null;
  operationalFinishedGoodId: string | null;
  operationalProductCode: string | null;
  operationalProductName: string | null;
};

type StoredCommerceOrderSnapshot = {
  id: string;
  orderNumber: string;
  orderType: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerDocument: string | null;
  providerReference: string | null;
  paymentStatus: string | null;
  manualPaymentReference: string | null;
  paymentProofUrl: string | null;
  currency: string | null;
  amount: Prisma.Decimal | Prisma.DecimalJsLike | number | string;
  organizationId: string | null;
  items: StoredOrderItemSnapshot[];
};

export type CommerceOrderSyncBatchSummary = {
  claimed: number;
  processed: number;
  retrying: number;
  failed: number;
  skipped: number;
  recoveredLeases: number;
  deadLettered: number;
};

export const COMMERCE_ORDER_SYNC_LEASE_MS = 15 * 60_000;
export const COMMERCE_ORDER_SYNC_MAX_ATTEMPTS = 8;

export function buildCommerceOrderSyncPayload(
  syncInput: SyncRealOrderToOperationsInput
): CommerceOrderSyncOutboxPayloadV1 {
  return {
    version: COMMERCE_ORDER_SYNC_PAYLOAD_VERSION,
    syncInput,
  };
}

function buildDeduplicationKey(syncInput: SyncRealOrderToOperationsInput, suffix?: string) {
  const parts = [
    COMMERCE_ORDER_SYNC_EVENT_TYPE,
    syncInput.sourceType,
    syncInput.sourceId,
    `v${COMMERCE_ORDER_SYNC_PAYLOAD_VERSION}`,
  ];
  if (suffix) parts.push(suffix);
  return parts.join(":");
}

function sanitizeErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown sync error";
  return rawMessage.slice(0, 500);
}

function isPermanentCommerceSyncError(error: unknown) {
  const message = sanitizeErrorMessage(error).toLowerCase();
  return [
    "unmapped",
    "order_item_unmapped",
    "inconsisten",
    "invalid",
    "inválid",
    "not found",
    "no encontrado",
    "missing",
    "no disponible",
    "sin mapping",
    "mismatch",
  ].some((pattern) => message.includes(pattern));
}

function nextRetryAt(attempts: number) {
  const baseDelayMs = 5 * 60 * 1000;
  const cappedDelayMs = Math.min(6 * 60 * 60 * 1000, baseDelayMs * Math.pow(2, Math.max(0, attempts - 1)));
  return new Date(Date.now() + cappedDelayMs);
}

function isMappedSnapshot(item: StoredOrderItemSnapshot) {
  return Boolean(
    item.productId &&
      item.operationalMappingId &&
      item.operationalFinishedGoodId &&
      item.operationalProductCode &&
      item.operationalProductName &&
      item.operationalMappingStatus !== "unmapped"
  );
}

function buildSyncInputFromStoredOrder(
  sourceType: SyncRealOrderToOperationsInput["sourceType"],
  order: StoredCommerceOrderSnapshot
): SyncRealOrderToOperationsInput {
  const items = order.items.map((item) => {
    const mapped = isMappedSnapshot(item);
    if (!mapped && sourceType === "checkout") {
      throw new Error("ORDER_ITEM_UNMAPPED");
    }

    return {
      productId: item.productId,
      productCode: item.productCode || item.operationalProductCode || item.productType,
      productName: item.productName || item.operationalProductName || item.productType,
      quantity: item.quantity,
      unitPrice: parseMoney(item.unitPrice),
      unit: "unit",
      finishedGoodId: mapped ? item.operationalFinishedGoodId : null,
      operationalMappingId: mapped ? item.operationalMappingId : null,
      operationalProductCode: mapped ? item.operationalProductCode : null,
      operationalProductName: mapped ? item.operationalProductName : null,
      operationalFinishedGoodId: mapped ? item.operationalFinishedGoodId : null,
    };
  });

  return {
    sourceType,
    sourceId: order.id,
    sourceCode: order.orderNumber,
    orderType: order.orderType === "corporate_employee_purchase" ? "enterprise" : "customer",
    customerName: order.customerName,
    contactEmail: order.customerEmail,
    contactPhone: order.customerPhone,
    customerReference: order.providerReference,
    paymentStatus: order.paymentStatus,
    paymentReference: order.manualPaymentReference || order.paymentProofUrl || null,
    currency: order.currency,
    notes: `orderId:${order.id}`,
    organizationId: order.organizationId,
    totalAmount: parseMoney(order.amount),
    items,
  };
}

export async function enqueueCommerceOrderSyncOutbox(
  db: OutboxDbClient,
  syncInput: SyncRealOrderToOperationsInput,
  options: { deduplicationSuffix?: string } = {}
) {
  const payload = buildCommerceOrderSyncPayload(syncInput);
  const deduplicationKey = buildDeduplicationKey(syncInput, options.deduplicationSuffix);

  return db.commerceOrderSyncOutbox.create({
    data: {
      eventType: COMMERCE_ORDER_SYNC_EVENT_TYPE,
      sourceType: syncInput.sourceType,
      sourceId: syncInput.sourceId,
      deduplicationKey,
      payloadVersion: payload.version,
      payloadJson: JSON.stringify(payload),
      status: "pending",
      attempts: 0,
      availableAt: new Date(),
    },
  });
}

export async function enqueueStoredCommerceOrderSyncOutbox(
  db: StoredOrderOutboxDbClient,
  options: {
    orderId: string;
    sourceType: SyncRealOrderToOperationsInput["sourceType"];
    deduplicationSuffix: string;
  }
) {
  const order = (await db.order.findUnique({
    where: { id: options.orderId },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customerDocument: true,
      providerReference: true,
      paymentStatus: true,
      manualPaymentReference: true,
      paymentProofUrl: true,
      currency: true,
      amount: true,
      organizationId: true,
      items: {
        select: {
          productId: true,
          productType: true,
          productName: true,
          productCode: true,
          quantity: true,
          unitPrice: true,
          operationalMappingId: true,
          operationalMappingStatus: true,
          operationalFinishedGoodId: true,
          operationalProductCode: true,
          operationalProductName: true,
        },
      },
    },
  })) as StoredCommerceOrderSnapshot | null;

  if (!order) throw new Error("ORDER_NOT_FOUND");
  return enqueueCommerceOrderSyncOutbox(
    db,
    buildSyncInputFromStoredOrder(options.sourceType, order),
    { deduplicationSuffix: options.deduplicationSuffix }
  );
}

export async function claimCommerceOrderSyncOutboxBatch(
  db: OutboxDbClient,
  options: { limit: number; workerId: string; now?: Date }
) {
  const now = options.now ?? new Date();
  const candidates = (await db.commerceOrderSyncOutbox.findMany({
    where: {
      status: { in: ["pending", "retrying"] },
      availableAt: { lte: now },
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: options.limit,
  })) as CommerceOrderSyncOutboxRow[];

  const claimed: CommerceOrderSyncOutboxRow[] = [];

  for (const candidate of candidates) {
    const updated = await db.commerceOrderSyncOutbox.updateMany({
      where: {
        id: candidate.id,
        status: { in: ["pending", "retrying"] },
        availableAt: { lte: now },
      },
      data: {
        status: "processing",
        lockedAt: now,
        lockedBy: options.workerId,
        attempts: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      claimed.push(candidate);
    }
  }

  return claimed;
}

export async function recoverStaleCommerceOrderSyncLeases(
  db: OutboxDbClient,
  options?: { limit?: number; now?: Date; leaseMs?: number }
) {
  const now = options?.now ?? new Date();
  const expiredBefore = new Date(now.getTime() - (options?.leaseMs ?? COMMERCE_ORDER_SYNC_LEASE_MS));
  const staleRows = (await db.commerceOrderSyncOutbox.findMany({
    where: {
      status: "processing",
      OR: [{ lockedAt: null }, { lockedAt: { lte: expiredBefore } }],
    },
    orderBy: [{ lockedAt: "asc" }, { createdAt: "asc" }],
    take: Math.min(Math.max(options?.limit ?? 100, 1), 500),
  })) as CommerceOrderSyncOutboxRow[];

  let recovered = 0;
  let deadLettered = 0;
  for (const row of staleRows) {
    const exhausted = row.attempts >= COMMERCE_ORDER_SYNC_MAX_ATTEMPTS;
    const result = await db.commerceOrderSyncOutbox.updateMany({
      where: {
        id: row.id,
        status: "processing",
        lockedAt: row.lockedAt,
        lockedBy: row.lockedBy,
      },
      data: {
        status: exhausted ? "failed" : "retrying",
        availableAt: now,
        lockedAt: null,
        lockedBy: null,
        lastErrorCode: exhausted ? "LEASE_EXPIRED_MAX_ATTEMPTS" : "LEASE_EXPIRED",
        lastErrorMessage: exhausted
          ? "Worker lease expired after maximum attempts; manual reconciliation required"
          : "Worker lease expired and was returned to the retry queue",
      },
    });
    if (result.count !== 1) continue;
    if (exhausted) deadLettered += 1;
    else recovered += 1;
  }

  return { recovered, deadLettered };
}

export async function processCommerceOrderSyncOutboxBatch(
  db: DbClient,
  options: { limit?: number; workerId: string; now?: Date }
): Promise<CommerceOrderSyncBatchSummary> {
  const recovery = await recoverStaleCommerceOrderSyncLeases(db as OutboxDbClient, {
    limit: options.limit ?? 10,
    now: options.now,
  });
  const claimed = await claimCommerceOrderSyncOutboxBatch(db as OutboxDbClient, {
    limit: options.limit ?? 10,
    workerId: options.workerId,
    now: options.now,
  });

  let processed = 0;
  let retrying = 0;
  let failed = 0;

  for (const event of claimed) {
    try {
      const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const order = (await tx.order.findUnique({
          where: { id: event.sourceId },
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            customerDocument: true,
            providerReference: true,
            paymentStatus: true,
            manualPaymentReference: true,
            paymentProofUrl: true,
            currency: true,
            amount: true,
            organizationId: true,
            items: {
              select: {
                productId: true,
                productType: true,
                productName: true,
                productCode: true,
                quantity: true,
                unitPrice: true,
                operationalMappingId: true,
                operationalMappingStatus: true,
                operationalFinishedGoodId: true,
                operationalProductCode: true,
                operationalProductName: true,
              },
            },
          },
        })) as StoredCommerceOrderSnapshot | null;

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        const syncInput = buildSyncInputFromStoredOrder(event.sourceType as SyncRealOrderToOperationsInput["sourceType"], order);
        const syncResult = await syncRealOrderToOperations(tx, syncInput);
        const finalized = await tx.commerceOrderSyncOutbox.updateMany({
          where: {
            id: event.id,
            status: "processing",
            lockedBy: options.workerId,
          },
          data: {
            status: "processed",
            processedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });
        if (finalized.count !== 1) {
          throw new Error("OUTBOX_LEASE_LOST");
        }
        return syncResult;
      });

      if (result?.created) {
        logger.info("[commerce-order-sync] processed event", {
          eventId: event.id,
          sourceType: event.sourceType,
          sourceId: event.sourceId,
        });
      }
      processed += 1;
    } catch (error) {
      const message = sanitizeErrorMessage(error);
      const retryable = !isPermanentCommerceSyncError(error);
      const attempts = event.attempts + 1;
      const exhausted = attempts >= COMMERCE_ORDER_SYNC_MAX_ATTEMPTS;
      const willRetry = retryable && !exhausted;
      const availableAt = willRetry ? nextRetryAt(attempts) : null;

      await db.commerceOrderSyncOutbox.updateMany({
        where: {
          id: event.id,
          status: "processing",
          lockedBy: options.workerId,
        },
        data: {
          status: willRetry ? "retrying" : "failed",
          attempts,
          availableAt: availableAt ?? event.availableAt,
          lockedAt: null,
          lockedBy: null,
          processedAt: null,
          lastErrorCode: exhausted
            ? "MAX_ATTEMPTS_EXCEEDED"
            : retryable
              ? "RETRYABLE_SYNC_ERROR"
              : "PERMANENT_SYNC_ERROR",
          lastErrorMessage: message,
        },
      });

      if (willRetry) retrying += 1;
      else failed += 1;

      logger.warn("[commerce-order-sync] event failed", {
        eventId: event.id,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        retryable: willRetry,
      });
    }
  }

  return {
    claimed: claimed.length,
    processed,
    retrying,
    failed,
    skipped: 0,
    recoveredLeases: recovery.recovered,
    deadLettered: recovery.deadLettered + failed,
  };
}

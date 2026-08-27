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
};

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
  options: { limit: number; workerId: string }
) {
  const now = new Date();
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

export async function processCommerceOrderSyncOutboxBatch(
  db: DbClient,
  options: { limit?: number; workerId: string }
): Promise<CommerceOrderSyncBatchSummary> {
  const claimed = await claimCommerceOrderSyncOutboxBatch(db as OutboxDbClient, {
    limit: options.limit ?? 10,
    workerId: options.workerId,
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
        await tx.commerceOrderSyncOutbox.update({
          where: { id: event.id },
          data: {
            status: "processed",
            processedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });
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
      const availableAt = retryable ? nextRetryAt(attempts) : null;

      await db.commerceOrderSyncOutbox.update({
        where: { id: event.id },
        data: {
          status: retryable ? "retrying" : "failed",
          attempts,
          availableAt: availableAt ?? event.availableAt,
          lockedAt: null,
          lockedBy: null,
          processedAt: null,
          lastErrorCode: retryable ? "RETRYABLE_SYNC_ERROR" : "PERMANENT_SYNC_ERROR",
          lastErrorMessage: message,
        },
      });

      if (retryable) retrying += 1;
      else failed += 1;

      logger.warn("[commerce-order-sync] event failed", {
        eventId: event.id,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        retryable,
      });
    }
  }

  return {
    claimed: claimed.length,
    processed,
    retrying,
    failed,
    skipped: 0,
  };
}

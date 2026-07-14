import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import {
  SyncRealOrderToOperationsInput,
  syncRealOrderToOperations,
} from "@/lib/operations/sync-real-order-to-operations";

type OutboxDbClient = Pick<PrismaClient, "commerceOrderSyncOutbox">;
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

function buildDeduplicationKey(syncInput: SyncRealOrderToOperationsInput) {
  return [
    COMMERCE_ORDER_SYNC_EVENT_TYPE,
    syncInput.sourceType,
    syncInput.sourceId,
    `v${COMMERCE_ORDER_SYNC_PAYLOAD_VERSION}`,
  ].join(":");
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

export async function enqueueCommerceOrderSyncOutbox(
  db: OutboxDbClient,
  syncInput: SyncRealOrderToOperationsInput
) {
  const payload = buildCommerceOrderSyncPayload(syncInput);
  const deduplicationKey = buildDeduplicationKey(syncInput);

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
  const claimed = await claimCommerceOrderSyncOutboxBatch(db, {
    limit: options.limit ?? 10,
    workerId: options.workerId,
  });

  let processed = 0;
  let retrying = 0;
  let failed = 0;

  for (const event of claimed) {
    try {
      const payload = JSON.parse(event.payloadJson) as CommerceOrderSyncOutboxPayloadV1;

      if (payload.version !== COMMERCE_ORDER_SYNC_PAYLOAD_VERSION || !payload.syncInput) {
        throw new Error("UNSUPPORTED_OUTBOX_PAYLOAD_VERSION");
      }

      const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const syncResult = await syncRealOrderToOperations(tx, payload.syncInput);
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

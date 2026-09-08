import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCommerceOrderSyncOutboxBatch } from "@/lib/operations/commerce-order-sync-outbox";
import { recoverStrandedCustomerProducedUnits } from "@/lib/operations/stranded-customer-production-recovery";
import { CRON_MONITOR_KEYS, recordCronSuccess } from "@/lib/cron-monitoring";

function authorizeCronRequest(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false as const, response: NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 }) };
  }

  const authorization = req.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return { ok: false as const, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  return { ok: true as const };
}

async function buildReconciliationSummary() {
  type OutboxSourceRow = { sourceId: string };
  type SourcePairOverlapCounts = {
    historicalMultiEventSourcePairs: bigint;
    activeOverlappingSourcePairs: bigint;
  };

  const [pending, processing, retrying, failed, staleProcessing, orders, outboxRows, unresolvedCommercialOrders] =
    await Promise.all([
      prisma.commerceOrderSyncOutbox.count({ where: { status: "pending" } }),
      prisma.commerceOrderSyncOutbox.count({ where: { status: "processing" } }),
      prisma.commerceOrderSyncOutbox.count({ where: { status: "retrying" } }),
      prisma.commerceOrderSyncOutbox.count({ where: { status: "failed" } }),
      prisma.commerceOrderSyncOutbox.count({
        where: {
          status: "processing",
          lockedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
        },
      }),
      prisma.order.findMany({
        where: {
          packageId: null,
          orderType: { in: ["customer", "corporate_employee_purchase"] },
        },
        select: { id: true },
      }),
      prisma.commerceOrderSyncOutbox.findMany({
        select: { sourceId: true },
      }) as Promise<OutboxSourceRow[]>,
      prisma.operationCommercialOrder.count({
        where: {
          OR: [{ sourceType: null }, { sourceId: null }],
        },
      }),
    ]);

  const outboxSourceIds = new Set(outboxRows.map((row) => row.sourceId));
  const missingOutboxOrders = orders.filter((order) => !outboxSourceIds.has(order.id)).length;

  // A source pair can legitimately have multiple historical lifecycle events:
  // deduplication is enforced by the unique deduplicationKey, which includes the
  // event suffix. Keep that historical count informational and separately report
  // only source pairs with more than one non-terminal event at the same time.
  const sourcePairOverlap = await prisma.$queryRaw<SourcePairOverlapCounts[]>`
    SELECT
      COUNT(*) FILTER (WHERE "totalCount" > 1)::bigint AS "historicalMultiEventSourcePairs",
      COUNT(*) FILTER (WHERE "activeCount" > 1)::bigint AS "activeOverlappingSourcePairs"
    FROM (
      SELECT
        "sourceType",
        "sourceId",
        COUNT(*) AS "totalCount",
        COUNT(*) FILTER (
          WHERE status IN ('pending', 'processing', 'retrying')
        ) AS "activeCount"
      FROM "CommerceOrderSyncOutbox"
      WHERE "sourceType" IS NOT NULL AND "sourceId" IS NOT NULL
      GROUP BY "sourceType", "sourceId"
    ) grouped
  `.catch(() => [{
    historicalMultiEventSourcePairs: BigInt(0),
    activeOverlappingSourcePairs: BigInt(0),
  }]);

  const historicalMultiEventSourcePairs = Number(sourcePairOverlap[0]?.historicalMultiEventSourcePairs || 0);
  const activeOverlappingSourcePairs = Number(sourcePairOverlap[0]?.activeOverlappingSourcePairs || 0);

  return {
    pending,
    processing,
    retrying,
    failed,
    staleProcessing,
    missingOutboxOrders,
    unresolvedCommercialOrders,
    historicalMultiEventSourcePairs,
    activeOverlappingSourcePairs,
    // Backward-compatible health field: unlike the previous implementation,
    // this now represents only simultaneous non-terminal overlap, not harmless
    // historical lifecycle events for the same source.
    duplicateSourcePairs: activeOverlappingSourcePairs,
  };
}

export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return auth.response;

  const reconciliation = await buildReconciliationSummary();
  return NextResponse.json({ reconciliation });
}

export async function POST(req: NextRequest) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return auth.response;

  const limit = Number(new URL(req.url).searchParams.get("limit") || "10");
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 25) : 10;
  const result = await processCommerceOrderSyncOutboxBatch(prisma, {
    limit: safeLimit,
    workerId: "cron:commerce-order-sync",
  });

  // Recover historical customer-produced units that already passed QC but were
  // left as free inventory by the pre-fix flow. The helper is intentionally
  // strict: internal production, dispatched/activated units and SKU mismatches
  // are never silently converted or reserved.
  const customerProductionRecovery = await recoverStrandedCustomerProducedUnits(prisma, {
    limit: safeLimit,
  });

  const reconciliation = await buildReconciliationSummary();
  await recordCronSuccess(CRON_MONITOR_KEYS.commerceOrderSync, {
    ...result,
    ...reconciliation,
    customerProductionRecovery,
  });

  return NextResponse.json({
    result,
    customerProductionRecovery,
    reconciliation,
  });
}

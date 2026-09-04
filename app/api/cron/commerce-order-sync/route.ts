import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCommerceOrderSyncOutboxBatch } from "@/lib/operations/commerce-order-sync-outbox";
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
  type DuplicatePairCount = { count: bigint };

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
  const duplicateSourcePairs = await prisma.$queryRaw<DuplicatePairCount[]>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT "sourceType", "sourceId"
      FROM "CommerceOrderSyncOutbox"
      WHERE "sourceType" IS NOT NULL AND "sourceId" IS NOT NULL
      GROUP BY "sourceType", "sourceId"
      HAVING COUNT(*) > 1
    ) duplicated
  `.catch(() => [{ count: BigInt(0) }]);

  return {
    pending,
    processing,
    retrying,
    failed,
    staleProcessing,
    missingOutboxOrders,
    unresolvedCommercialOrders,
    duplicateSourcePairs: Number(duplicateSourcePairs[0]?.count || 0),
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
  const result = await processCommerceOrderSyncOutboxBatch(prisma, {
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 25) : 10,
    workerId: "cron:commerce-order-sync",
  });

  const reconciliation = await buildReconciliationSummary();
  await recordCronSuccess(CRON_MONITOR_KEYS.commerceOrderSync, {
    ...result,
    ...reconciliation,
  });

  return NextResponse.json({
    result,
    reconciliation,
  });
}

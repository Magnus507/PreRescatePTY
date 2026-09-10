import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CRON_MONITOR_KEYS, parseCronRun } from "@/lib/cron-monitoring";
import { RESCUE_NOTIFICATION_DELIVERY_POLICY } from "@/lib/notifications/delivery-policy";
import { buildWorkerReadinessChecks } from "@/lib/operations/worker-readiness";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const keys = Object.values(CRON_MONITOR_KEYS);
    const [
      configs,
      oldestNotification,
      oldestCommerceEvent,
      oldestStorageCleanup,
      notificationDeadLetters,
      commerceDeadLetters,
      storageDeadLetters,
    ] =
      await Promise.all([
        prisma.systemConfig.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } }),
        prisma.notification.findFirst({
          where: { status: { in: ["pending", "retrying", "processing"] } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.commerceOrderSyncOutbox.findFirst({
          where: { status: { in: ["pending", "retrying", "processing"] } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.storageCleanupOutbox.findFirst({
          where: { status: { in: ["pending", "retrying", "processing"] } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.notification.count({ where: { status: "dead_letter" } }),
        prisma.commerceOrderSyncOutbox.count({ where: { status: "failed" } }),
        prisma.storageCleanupOutbox.count({ where: { status: "failed" } }),
      ]);

    const values = new Map(configs.map((config) => [config.key, config.value]));
    const lastNotify = parseCronRun(values.get(CRON_MONITOR_KEYS.notify));
    const lastCommerce = parseCronRun(values.get(CRON_MONITOR_KEYS.commerceOrderSync));
    const lastExpiry = parseCronRun(values.get(CRON_MONITOR_KEYS.expireChips));
    const checks = buildWorkerReadinessChecks({
      now: Date.now(),
      lastNotify,
      lastCommerce,
      lastExpiry,
      oldestNotification: oldestNotification?.createdAt ?? null,
      oldestCommerceEvent: oldestCommerceEvent?.createdAt ?? null,
      oldestStorageCleanup: oldestStorageCleanup?.createdAt ?? null,
      notificationDeadLetters,
      commerceDeadLetters,
      storageDeadLetters,
      automatedNotificationDeliveryEnabled: RESCUE_NOTIFICATION_DELIVERY_POLICY.automatedDeliveryEnabled,
    });
    const healthy = Object.values(checks).every(Boolean);

    return NextResponse.json(
      {
        status: healthy ? "ready" : "degraded",
        checks,
        queue: { notificationDeadLetters, commerceDeadLetters, storageDeadLetters },
        notificationDelivery: RESCUE_NOTIFICATION_DELIVERY_POLICY,
      },
      { status: healthy ? 200 : 503 }
    );
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { CRON_MONITOR_KEYS, recordCronSuccess } from "@/lib/cron-monitoring";
import { processStorageCleanupOutbox } from "@/lib/storage-cleanup-outbox";

export const dynamic = "force-dynamic";

/**
 * Legacy-compatible maintenance endpoint.
 *
 * Product policy no longer expires rescue IDs by time, so this route must never
 * mutate Chip.serviceStatus from serviceEndDate. The endpoint remains scheduled
 * because it also drains the independent storage-cleanup outbox and provides a
 * monitored heartbeat used by operations.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const runAt = new Date();
  const storageCleanup = await processStorageCleanupOutbox();
  const summary = {
    expiredCount: 0,
    legacyTimeExpiryDisabled: true,
    storageCleanup,
  };

  logger.info("[cron/expire-chips] Lifetime policy active; skipped time-based expiry", summary);
  await recordCronSuccess(CRON_MONITOR_KEYS.expireChips, summary);

  return NextResponse.json({
    message: "Vencimiento por tiempo deshabilitado; mantenimiento completado.",
    count: 0,
    legacyTimeExpiryDisabled: true,
    storageCleanup,
    runAt: runAt.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

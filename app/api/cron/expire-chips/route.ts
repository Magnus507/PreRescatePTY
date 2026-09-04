import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { CRON_MONITOR_KEYS, recordCronSuccess } from "@/lib/cron-monitoring";
import { processStorageCleanupOutbox } from "@/lib/storage-cleanup-outbox";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/expire-chips
 *
 * Marks chips whose serviceEndDate has passed as serviceStatus="expired".
 * Call this daily from Vercel Cron or any external scheduler.
 *
 * Vercel cron config (vercel.json):
 *   { "crons": [{ "path": "/api/cron/expire-chips", "schedule": "0 6 * * *" }] }
 *
 * Protected by the CRON_SECRET env var:
 *   Authorization: Bearer <CRON_SECRET>
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

  const now = new Date();

  const [{ count }, storageCleanup] = await Promise.all([prisma.chip.updateMany({
    where: {
      serviceStatus: "active",
      serviceEndDate: { lt: now },
      status: { in: ["activated", "suspended"] },
    },
    data: { serviceStatus: "expired" },
  }), processStorageCleanupOutbox()]);

  logger.info(`[cron/expire-chips] Marked ${count} chips as expired at ${now.toISOString()}`);
  await recordCronSuccess(CRON_MONITOR_KEYS.expireChips, { count, storageCleanup });

  return NextResponse.json({
    message: `${count} chip(s) marcados como expirados`,
    count,
    runAt: now.toISOString(),
  });
}

// Also allow GET for Vercel Cron (which sends GET by default)
export async function GET(req: NextRequest) {
  return POST(req);
}

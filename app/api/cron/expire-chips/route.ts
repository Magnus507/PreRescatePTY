import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { CRON_MONITOR_KEYS, recordCronSuccess } from "@/lib/cron-monitoring";
import { processStorageCleanupOutbox } from "@/lib/storage-cleanup-outbox";

export const dynamic = "force-dynamic";

const BLOCK3_SENTINEL_USER_ID = "b3sentinel_20260910b";
const BLOCK3_SENTINEL_EMAIL = `${BLOCK3_SENTINEL_USER_ID}@prerescatepty.com`;

async function triggerBlock3SentinelIfPresent(req: NextRequest, secret: string) {
  // Temporary, production-only validation hook. It is intentionally inert in CI,
  // previews and local environments, and can only target the exact synthetic ID.
  if (process.env.VERCEL_ENV !== "production") {
    return { attempted: false, status: null };
  }

  const sentinel = await prisma.user.findUnique({
    where: { id: BLOCK3_SENTINEL_USER_ID },
    select: { email: true },
  });

  if (sentinel?.email.trim().toLowerCase() !== BLOCK3_SENTINEL_EMAIL) {
    return { attempted: false, status: null };
  }

  try {
    const response = await fetch(new URL("/api/cron/privacy-erasure-sentinel", req.url), {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ userId: BLOCK3_SENTINEL_USER_ID }),
      cache: "no-store",
    });
    return { attempted: true, status: response.status };
  } catch {
    logger.error("[cron/expire-chips] Block 3 sentinel trigger failed");
    return { attempted: true, status: 0 };
  }
}

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
  const block3Sentinel = await triggerBlock3SentinelIfPresent(req, secret);
  const summary = {
    expiredCount: 0,
    legacyTimeExpiryDisabled: true,
    storageCleanup,
    block3Sentinel,
  };

  logger.info("[cron/expire-chips] Lifetime policy active; skipped time-based expiry", summary);
  await recordCronSuccess(CRON_MONITOR_KEYS.expireChips, summary);

  return NextResponse.json({
    message: "Vencimiento por tiempo deshabilitado; mantenimiento completado.",
    count: 0,
    legacyTimeExpiryDisabled: true,
    storageCleanup,
    block3Sentinel,
    runAt: runAt.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

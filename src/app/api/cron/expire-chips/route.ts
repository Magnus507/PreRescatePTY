import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const now = new Date();

  const { count } = await prisma.chip.updateMany({
    where: {
      serviceStatus: "active",
      serviceEndDate: { lt: now },
      status: { in: ["activated", "suspended"] },
    },
    data: { serviceStatus: "expired" },
  });

  console.log(`[cron/expire-chips] Marked ${count} chips as expired at ${now.toISOString()}`);

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

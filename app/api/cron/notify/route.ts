import { NextRequest, NextResponse } from "next/server";
import { processPendingEmergencyNotifications } from "@/lib/emergency-notification-queue";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/notify
 *
 * Processes up to 50 pending Notification records and attempts delivery.
 * Call every minute from Vercel Cron or external scheduler.
 *
 * Vercel cron config (vercel.json):
 *   { "crons": [{ "path": "/api/cron/notify", "schedule": "* * * * *" }] }
 *
 * Protected by CRON_SECRET env var:
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

  const result = await processPendingEmergencyNotifications({
    take: 50,
    includeStaleProcessing: true,
  });

  if (result.processed === 0) {
    return NextResponse.json({ message: "No hay notificaciones pendientes", processed: 0 });
  }

  return NextResponse.json({
    message: `Procesadas ${result.processed} notificaciones: ${result.sent} enviadas, ${result.failed} fallidas`,
    sent: result.sent,
    failed: result.failed,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

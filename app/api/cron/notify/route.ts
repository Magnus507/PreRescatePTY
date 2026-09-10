import { NextResponse } from "next/server";
import { CRON_MONITOR_KEYS, recordCronSuccess } from "@/lib/cron-monitoring";
import { RESCUE_NOTIFICATION_DELIVERY_POLICY } from "@/lib/notifications/delivery-policy";

export const dynamic = "force-dynamic";

function authorizeCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false as const, response: NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 }) };
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return { ok: false as const, response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  return { ok: true as const };
}

export async function POST(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return auth.response;

  // Product policy: rescue notifications are manual-only. Keep the endpoint and
  // heartbeat healthy so existing scheduler monitoring remains valid, but never
  // lease or send historical/pending emergency Notification rows.
  const result = {
    claimed: 0,
    sent: 0,
    retrying: 0,
    failed: 0,
    deadLettered: 0,
    skipped: 0,
    deliveryMode: RESCUE_NOTIFICATION_DELIVERY_POLICY.mode,
    disabled: !RESCUE_NOTIFICATION_DELIVERY_POLICY.automatedDeliveryEnabled,
  };

  await recordCronSuccess(CRON_MONITOR_KEYS.notify, result);

  return NextResponse.json({
    message: "Entrega automática de rescate deshabilitada; WhatsApp manual activo.",
    ...result,
  });
}

export async function GET(req: Request) {
  return POST(req);
}

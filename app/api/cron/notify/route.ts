import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { processPendingEmergencyNotifications } from "@/lib/emergency-alerts";
import { CRON_MONITOR_KEYS, recordCronSuccess } from "@/lib/cron-monitoring";

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

  const result = await processPendingEmergencyNotifications(prisma, { limit: 25 });
  await recordCronSuccess(CRON_MONITOR_KEYS.notify, result);
  logger.info("[cron/notify] processed emergency notifications", result);

  return NextResponse.json({
    message: "Notificaciones procesadas",
    ...result,
  });
}

export async function GET(req: Request) {
  return POST(req);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmergencyNotification } from "@/lib/notifications";

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

  const pending = await prisma.notification.findMany({
    where: { status: "pending" },
    include: {
      chip: {
        include: {
          assignedProfile: { select: { firstName: true, lastName: true, displayNamePublic: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  if (pending.length === 0) {
    return NextResponse.json({ message: "No hay notificaciones pendientes", processed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const notif of pending) {
    const profile = notif.chip.assignedProfile;
    const profileName = profile
      ? (profile.displayNamePublic || `${profile.firstName} ${profile.lastName}`.trim())
      : "Usuario PreRescate";

    const result = await sendEmergencyNotification({
      recipient: notif.recipient,
      type: notif.channel as "email" | "sms" | "whatsapp",
      profileName,
      shortCode: notif.chip.shortCode,
      notificationId: notif.id,
    });

    await prisma.notification.update({
      where: { id: notif.id },
      data: {
        status: result.success ? "sent" : "failed",
        providerResponse: result.providerResponse ?? null,
        sentAt: result.success ? new Date() : null,
      },
    });

    result.success ? sent++ : failed++;
  }

  return NextResponse.json({
    message: `Procesadas ${pending.length} notificaciones: ${sent} enviadas, ${failed} fallidas`,
    sent,
    failed,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

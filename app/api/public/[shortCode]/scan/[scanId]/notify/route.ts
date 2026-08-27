import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { resolvePublicProfileByChipShortCode } from "@/lib/public-access/resolve-public-profile-by-chip";
import {
  processPendingEmergencyNotifications,
  queueEmergencyNotificationsFromScan,
} from "@/lib/emergency-alerts";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortCode: string; scanId: string }> }
) {
  const { shortCode, scanId } = await params;
  if (!scanId || scanId.length > 64) {
    return NextResponse.json({ error: "Escaneo inválido" }, { status: 400 });
  }

  const ip = getClientIp(req, "manual-emergency-alert");
  const limiter = await rateLimit("manual-emergency-alert", `${ip}:${scanId}`, {
    limit: 3,
    windowMs: 10 * 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "El aviso ya fue solicitado. Intenta más tarde." }, { status: 429 });
  }

  const resolution = await resolvePublicProfileByChipShortCode(shortCode);
  if (!resolution.ok) {
    return NextResponse.json({ error: "Perfil no disponible" }, { status: 404 });
  }

  const scan = await prisma.scanEvent.findUnique({
    where: { id: scanId },
    select: { id: true, chipId: true, profileId: true, accountId: true },
  });
  if (!scan || scan.chipId !== resolution.chip.id || scan.profileId !== resolution.profile.id) {
    return NextResponse.json({ error: "Escaneo no encontrado" }, { status: 404 });
  }

  const plan = await prisma.$transaction((tx) =>
    queueEmergencyNotificationsFromScan(tx, {
      scanEventId: scan.id,
      chipId: resolution.chip.id,
      shortCode: resolution.chip.shortCode,
      profileId: resolution.profile.id,
      profileName:
        resolution.profile.displayNamePublic ||
        `${resolution.profile.firstName} ${resolution.profile.lastName}`.trim(),
      accountId: scan.accountId,
      publicUrl: `/e/${resolution.chip.shortCode}`,
      trigger: "manual",
    })
  );

  if (plan.queued > 0) {
    after(async () => {
      await processPendingEmergencyNotifications(prisma, { limit: 25 });
    });
  }

  return NextResponse.json({
    message: plan.queued > 0 ? "Aviso enviado a los contactos." : "Aviso registrado.",
    notificationStatus: plan.status,
    queued: plan.queued,
    disabled: plan.disabled,
    reason: plan.reason,
  });
}

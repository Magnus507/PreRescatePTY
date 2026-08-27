import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";
import { CONSENT_TEXT_VERSION, CONSENT_TYPE } from "@/domains/consents/consent.constants";

export const dynamic = "force-dynamic";

const preferenceSchema = z.object({ automaticAlertsEnabled: z.boolean() });

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as { id?: string }).id : undefined;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accountId: true },
  });
  return user?.accountId ? user : null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const consent = await prisma.consent.findFirst({
    where: {
      consentType: CONSENT_TYPE.AUTOMATIC_EMERGENCY_ALERTS,
      revokedAt: null,
      OR: [{ userId: user.id }, { accountId: user.accountId }],
    },
    select: { id: true, grantedAt: true },
  });

  return NextResponse.json({
    automaticAlertsEnabled: !!consent,
    grantedAt: consent?.grantedAt || null,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = preferenceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Preferencia inválida" }, { status: 400 });
  }

  const { automaticAlertsEnabled } = parsed.data;
  const ipAddress = getClientIp(req, "alert-preferences");
  const userAgent = req.headers.get("user-agent");

  await prisma.$transaction(async (tx) => {
    const activeConsent = await tx.consent.findFirst({
      where: {
        consentType: CONSENT_TYPE.AUTOMATIC_EMERGENCY_ALERTS,
        revokedAt: null,
        OR: [{ userId: user.id }, { accountId: user.accountId }],
      },
      select: { id: true },
    });

    if (automaticAlertsEnabled && !activeConsent) {
      await tx.consent.create({
        data: {
          accountId: user.accountId,
          userId: user.id,
          consentType: CONSENT_TYPE.AUTOMATIC_EMERGENCY_ALERTS,
          textVersion: CONSENT_TEXT_VERSION.AUTOMATIC_EMERGENCY_ALERTS,
          ipAddress,
          userAgent,
          evidenceJson: JSON.stringify({ enabled: true, source: "dashboard_settings" }),
        },
      });
    }

    if (!automaticAlertsEnabled) {
      await tx.consent.updateMany({
        where: {
          consentType: CONSENT_TYPE.AUTOMATIC_EMERGENCY_ALERTS,
          revokedAt: null,
          OR: [{ userId: user.id }, { accountId: user.accountId }],
        },
        data: { revokedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        accountId: user.accountId,
        actorUserId: user.id,
        entityType: "consent",
        entityId: activeConsent?.id || user.id,
        action: automaticAlertsEnabled ? "enable_automatic_emergency_alerts" : "disable_automatic_emergency_alerts",
        newValuesJson: JSON.stringify({ automaticAlertsEnabled }),
      },
    });
  });

  return NextResponse.json({ automaticAlertsEnabled });
}

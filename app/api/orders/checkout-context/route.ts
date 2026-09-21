import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONSENT_TEXT_VERSION, CONSENT_TYPE } from "@/domains/consents/consent.constants";
import { ProfileRepository } from "@/domains/profiles/repositories/profile.repository";

function clean(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [user, profile, currentLegalConsent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        phone: true,
      },
    }),
    ProfileRepository.findByUserId(session.user.id),
    prisma.consent.findFirst({
      where: {
        userId: session.user.id,
        consentType: CONSENT_TYPE.TERMS_AND_PRIVACY,
        textVersion: CONSENT_TEXT_VERSION.TERMS_AND_PRIVACY,
        revokedAt: null,
      },
      orderBy: { grantedAt: "desc" },
      select: { id: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const recipientName = [clean(profile?.firstName), clean(profile?.lastName)]
    .filter(Boolean)
    .join(" ");

  return NextResponse.json(
    {
      recipientName,
      phone: clean(user.phone) || clean(profile?.phone),
      address: clean(profile?.address),
      city: clean(profile?.city),
      email: clean(user.email),
      legalAcceptanceRequired: !currentLegalConsent,
      legalTextVersion: CONSENT_TEXT_VERSION.TERMS_AND_PRIVACY,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { activationCode } = body;

  if (!activationCode) {
    return NextResponse.json(
      { error: "Código de activación requerido" },
      { status: 400 }
    );
  }

  // Find the claim token
  const claimToken = await prisma.chipClaimToken.findUnique({
    where: { activationCode: activationCode.toUpperCase().trim() },
    include: { chip: true },
  });

  if (!claimToken) {
    return NextResponse.json(
      { error: "Código de activación inválido" },
      { status: 404 }
    );
  }

  if (claimToken.usedAt) {
    return NextResponse.json(
      { error: "Este código ya fue utilizado" },
      { status: 409 }
    );
  }

  if (new Date() > claimToken.expiresAt) {
    return NextResponse.json(
      { error: "Este código ha expirado" },
      { status: 410 }
    );
  }

  const chip = claimToken.chip;

  if (chip.status !== "inventory" && chip.status !== "sold") {
    return NextResponse.json(
      { error: "Este chip no está disponible para activación" },
      { status: 409 }
    );
  }

  // Find the user's account and profile to associate
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user || !user.accountId || !user.profile) {
    return NextResponse.json({ error: "Debes completar tu perfil antes de activar un chip" }, { status: 400 });
  }

  // Activate the chip
  const now = new Date();
  const serviceEndDate = new Date(now);
  serviceEndDate.setFullYear(serviceEndDate.getFullYear() + 2);

  await prisma.chip.update({
    where: { id: chip.id },
    data: {
      status: "activated",
      ownerUserId: userId,
      accountId: user.accountId,
      assignedProfileId: user.profile.id,
      activatedAt: now,
      serviceStartDate: now,
      serviceEndDate: serviceEndDate,
      serviceStatus: "active"
    },
  });

  // Mark token as used
  await prisma.chipClaimToken.update({
    where: { id: claimToken.id },
    data: { usedAt: new Date() },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      entityType: "chip",
      entityId: chip.id,
      action: "activate",
      newValuesJson: JSON.stringify({
        shortCode: chip.shortCode,
        activationCode,
      }),
    },
  });

  return NextResponse.json({
    message: "Chip activado exitosamente",
    chip: {
      shortCode: chip.shortCode,
      serialPublic: chip.serialPublic,
      nfcUrl: chip.nfcUrl,
      qrUrl: chip.qrUrl,
    },
  });
}

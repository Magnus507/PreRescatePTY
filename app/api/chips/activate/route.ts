import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { chipActivationSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  const parsedBody = chipActivationSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.errors[0]?.message || "Código de activación inválido" },
      { status: 400 }
    );
  }

  const { activationCode } = parsedBody.data;

  // Find the claim token
  const claimToken = await prisma.chipClaimToken.findUnique({
    where: { activationCode },
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

  // Use Centralized Account State
  const state = await AccountStateService.getAccountState(userId);

  const currentUserProfile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!AccountStateService.isMedicalProfileComplete(currentUserProfile)) {
    return NextResponse.json({ error: "Debes completar tu perfil médico (nombre, apellido y tipo de sangre) antes de activar un chip" }, { status: 400 });
  }

  if (state.serviceStatus === "expired") {
    return NextResponse.json(
      { error: "Tu cuenta ha expirado. Por favor renueva tu servicio para usar chips." },
      { status: 403 }
    );
  }

  // Use atomic transaction to prevent race conditions on chip limit enforcement
  try {
    await prisma.$transaction(async (tx) => {
      // Re-read account state within transaction (not from cache) to ensure atomicity
      const account = await tx.account.findUnique({
        where: { id: state.accountId as string }
      });

      if (!account) {
        throw new Error("Cuenta no encontrada");
      }

      const currentActiveCount = await tx.chip.count({
        where: { accountId: account.id, status: { in: ["activated", "suspended", "sold"] } }
      });

      // Enforce plan chip limit
      if (currentActiveCount >= account.maxChipsAllocated) {
        throw new Error(`Has alcanzado el límite de ${account.maxChipsAllocated} chip(s) en tu plan actual. Adquiere chips adicionales para activar más.`);
      }
      const targetAccountId = account.id;

      // Find the current user's own profile. Another complete profile in the same
      // account must not unlock activation for this chip.
      const profile = await tx.profile.findFirst({
        where: { userId }
      });

      if (!AccountStateService.isMedicalProfileComplete(profile)) {
        throw Object.assign(
          new Error("Debes completar tu perfil médico (nombre, apellido y tipo de sangre) antes de activar un chip"),
          { status: 400 }
        );
      }

      // Activate the chip within transaction
      const now = new Date();
      const serviceEndDate = new Date(now);
      serviceEndDate.setMonth(serviceEndDate.getMonth() + state.serviceDurationMonths);

      await tx.chip.update({
        where: { id: chip.id },
        data: {
          status: "activated",
          ownerUserId: userId,
          accountId: targetAccountId,
          assignedProfileId: profile.id,
          activatedAt: now,
          serviceStartDate: now,
          serviceEndDate: serviceEndDate,
          serviceStatus: "active"
        },
      });

      // Mark token as used
      await tx.chipClaimToken.update({
        where: { id: claimToken.id },
        data: { usedAt: new Date() },
      });

      // Auto-confirm delivery if token is linked to an order
      if (claimToken.orderId) {
        await tx.order.update({
          where: { id: claimToken.orderId },
          data: {
            orderStatus: "completed",
            paymentStatus: "paid"
          }
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: "chip",
          entityId: chip.id,
          action: "activate",
          newValuesJson: JSON.stringify({
            shortCode: chip.shortCode,
            activationCodeSuffix: activationCode.slice(-4),
          }),
        },
      });
    });

    // Invalidate cache after successful activation (outside transaction)
    await AccountStateService.invalidateCache(userId);
  } catch (error: unknown) {
    console.error("[chips/activate] Error:", error);
    const message = error instanceof Error ? error.message : "Error al activar el chip";
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }

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

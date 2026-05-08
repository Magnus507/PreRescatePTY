import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

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

  // Use Centralized Account State
  const state = await AccountStateService.getAccountState(userId);

  if (!state.hasCompletedMedicalProfile) {
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

      // Enforce plan chip limit or Auto-Upgrade to Personalizado
      let targetAccountId = state.accountId;
      if (currentActiveCount >= account.maxChipsAllocated) {
        // If they have a code, it means they already got/bought the chip.
        // Instead of blocking, we transition them to 'Plan Personalizado'
        // to allow unlimited growth as requested by the user.
        const customPkg = await tx.package.findFirst({
          where: { name: "Plan Personalizado" }
        });

        if (customPkg) {
          // Update account with incremented limit (atomically within transaction)
          const updated = await tx.account.update({
            where: { id: account.id },
            data: {
              packageId: customPkg.id,
              maxChipsAllocated: { increment: 1 },
              maxProfilesAllocated: { increment: 1 }
            }
          });
          targetAccountId = updated.id;
        } else {
          // If no custom package exists, we just forcibly increment it anyway
          const updated = await tx.account.update({
             where: { id: account.id },
             data: {
                maxChipsAllocated: { increment: 1 },
                maxProfilesAllocated: { increment: 1 }
             }
          });
          targetAccountId = updated.id;
        }
      }

      // Find profile ID (we know it exists because hasCompletedMedicalProfile is true)
      const profile = await tx.profile.findFirst({
        where: { userId }
      });

      if (!profile) {
        throw new Error("No se encontró el perfil o cuenta asociada");
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

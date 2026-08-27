import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { markFinishedGoodUnitActivated } from "@/lib/operations/activate-finished-good-unit";
import { requireActiveAccountSession } from "@/lib/rbac";
import {
  ACTIVATABLE_CHIP_STATUSES,
  CHIP_SERVICE_STATUS,
  CHIP_STATUS,
  USED_CAPACITY_CHIP_STATUSES,
} from "@/domains/chips/chip-lifecycle.constants";
import {
  activationCodeLookupWhere,
  normalizeActivationCode,
} from "@/domains/chips/activation-code.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;
  const userId = auth.session.user.id;

  // Rate limit: 5 activation attempts per minute per user
  const limiter = await rateLimit("corporate-chip-activate", userId, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de activación. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const activationCode = typeof body.activationCode === "string"
    ? normalizeActivationCode(body.activationCode)
    : "";

  if (!activationCode) {
    return NextResponse.json(
      { error: "Código de activación inválido." },
      { status: 400 }
    );
  }

  // Use Centralized Account State
  const state = await AccountStateService.getAccountState(userId);

  if (state.serviceStatus === "expired") {
    return NextResponse.json(
      { error: "Tu cuenta ha expirado. Por favor renueva tu servicio para usar chips." },
      { status: 403 }
    );
  }

  try {
    const activationSyncData = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Find the claim token
      const claimToken = await tx.chipClaimToken.findFirst({
        where: activationCodeLookupWhere(activationCode),
        include: { chip: true },
      });

      if (!claimToken) {
        throw Object.assign(
          new Error("Código de activación inválido."),
          { status: 404 }
        );
      }

      if (claimToken.usedAt) {
        throw Object.assign(
          new Error("Este código ya fue utilizado."),
          { status: 409 }
        );
      }

      if (claimToken.expiresAt && new Date() > claimToken.expiresAt) {
        throw Object.assign(
          new Error("Este código ha expirado."),
          { status: 410 }
        );
      }

      const chip = claimToken.chip;

      if (!ACTIVATABLE_CHIP_STATUSES.includes(chip.status as (typeof ACTIVATABLE_CHIP_STATUSES)[number])) {
        throw Object.assign(
          new Error("Este chip no está disponible para activación."),
          { status: 409 }
        );
      }

      // 2. Find the corporate member for this user
      const userProfile = await tx.profile.findUnique({
        where: { userId },
      });

      if (!userProfile) {
        throw Object.assign(
          new Error("No se encontró tu perfil de usuario."),
          { status: 400 }
        );
      }

      const member = await tx.organizationMember.findFirst({
        where: {
          profileId: userProfile.id,
          corporateStatus: "paid_active",
        },
        include: {
          profile: true,
        },
      });

      if (!member) {
        throw Object.assign(
          new Error("No tienes un vínculo empresarial activo."),
          { status: 403 }
        );
      }

      if (!member.corporateProfileId) {
        throw Object.assign(
          new Error("No se encontró tu perfil empresarial."),
          { status: 400 }
        );
      }

      // Validar que no tenga ya un chip empresarial activo
      const existingActivatedChip = await tx.corporateOrderEmployeeItem.findFirst({
        where: {
          organizationMemberId: member.id,
          fulfillmentStatus: "activated",
          chipId: { not: null },
        },
      });

      if (existingActivatedChip) {
        throw Object.assign(
          new Error("Ya tienes un chip empresarial activo. Contacta a tu empresa para gestionar un reemplazo."),
          { status: 409 }
        );
      }

      const corporateProfile = await tx.profile.findUnique({
        where: { id: member.corporateProfileId },
      });

      if (!corporateProfile || corporateProfile.profileType !== "corporate") {
        throw Object.assign(
          new Error("El perfil vinculado no es un perfil empresarial válido."),
          { status: 400 }
        );
      }

      // Verify the corporate profile belongs to the same account as the user
      if (corporateProfile.accountId !== userProfile.accountId) {
        throw Object.assign(
          new Error("Este chip corporativo no pertenece a tu cuenta."),
          { status: 403 }
        );
      }

      if (!AccountStateService.isMedicalProfileComplete(corporateProfile)) {
        throw Object.assign(
          new Error("Completa tu perfil empresarial (nombre, apellido y tipo de sangre) antes de activar este chip."),
          { status: 400 }
        );
      }

      // 3. Find pending corporate order item for this user
      const pendingItem = await tx.corporateOrderEmployeeItem.findFirst({
        where: {
          organizationMemberId: member.id,
          deliveryStatus: "delivered",
          fulfillmentStatus: { not: "activated" },
          chipId: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!pendingItem) {
        throw Object.assign(
          new Error("No tienes un paquete empresarial entregado pendiente de activación."),
          { status: 400 }
        );
      }

      // 4. Enforce plan chip limit
      const account = await tx.account.findUnique({
        where: { id: state.accountId as string },
      });

      if (!account) {
        throw Object.assign(
          new Error("Cuenta no encontrada."),
          { status: 400 }
        );
      }

      const currentActiveCount = await tx.chip.count({
        where: {
          accountId: account.id,
          status: { in: [...USED_CAPACITY_CHIP_STATUSES] },
        },
      });

      if (currentActiveCount >= account.maxChipsAllocated) {
        throw Object.assign(
          new Error(`Has alcanzado el límite de ${account.maxChipsAllocated} chip(s) en tu plan actual. Adquiere chips adicionales para activar más.`),
          { status: 400 }
        );
      }

      // 5. Atomically consume token
      const tokenConsume = await tx.chipClaimToken.updateMany({
        where: {
          id: claimToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (tokenConsume.count !== 1) {
        throw Object.assign(
          new Error("Código ya usado o expirado."),
          { status: 400 }
        );
      }

      // 6. Activate the chip
      const serviceEndDate = new Date(now);
      serviceEndDate.setMonth(serviceEndDate.getMonth() + state.serviceDurationMonths);

      const chipActivate = await tx.chip.updateMany({
        where: {
          id: claimToken.chipId,
          status: { in: [...ACTIVATABLE_CHIP_STATUSES] },
        },
        data: {
          status: CHIP_STATUS.ACTIVATED,
          ownerUserId: userId,
          accountId: account.id,
          assignedProfileId: corporateProfile.id,
          activatedAt: now,
          serviceStartDate: now,
          serviceEndDate: serviceEndDate,
          serviceStatus: CHIP_SERVICE_STATUS.ACTIVE,
        },
      });

      if (chipActivate.count !== 1) {
        throw Object.assign(
          new Error("Este chip ya no puede activarse."),
          { status: 400 }
        );
      }

      // 7. Link chip to corporate order item
      await tx.corporateOrderEmployeeItem.update({
        where: { id: pendingItem.id },
        data: {
          chipId: claimToken.chipId,
          fulfillmentStatus: "activated",
          activatedAt: now,
        },
      });

      // 8. Audit log
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: "chip",
          entityId: chip.id,
          action: "activate",
          newValuesJson: JSON.stringify({
            shortCode: chip.shortCode,
            activationCodeSuffix: activationCode.slice(-4),
            context: "corporate",
            corporateProfileId: corporateProfile.id,
            organizationMemberId: member.id,
            corporateOrderEmployeeItemId: pendingItem.id,
          }),
        },
      });

      return {
        internalLabel: chip.internalLabel || null,
        shortCode: chip.shortCode,
        chipId: chip.id,
        activationCodeSuffix: activationCode.slice(-4),
        corporateProfileId: corporateProfile.id,
        organizationMemberId: member.id,
        corporateOrderEmployeeItemId: pendingItem.id,
      };
    });

    // Invalidate cache after successful activation
    await AccountStateService.invalidateCache(userId);

    void (async () => {
      if (!activationSyncData) return;
      const activationResult = await markFinishedGoodUnitActivated({
        internalLabel: activationSyncData.internalLabel,
        shortCode: activationSyncData.shortCode,
        activationReferenceType: "corporate_chip_activation",
        activationReferenceId: activationSyncData.chipId,
        metadataJson: {
          chipId: activationSyncData.chipId,
          chipShortCode: activationSyncData.shortCode,
          activationCodeSuffix: activationSyncData.activationCodeSuffix,
          flow: "corporate_chip_activation",
          corporateProfileId: activationSyncData.corporateProfileId,
          organizationMemberId: activationSyncData.organizationMemberId,
          corporateOrderEmployeeItemId: activationSyncData.corporateOrderEmployeeItemId,
        },
      });

      if (!activationResult.ok) {
        console.warn("[corporate-chip/activate] Finished good unit sync skipped:", activationResult.reason);
      }
    })().catch((error) => {
      console.warn("[corporate-chip/activate] Finished good unit sync failed:", error);
    });

    return NextResponse.json({
      success: true,
      message: "Chip empresarial activado correctamente.",
    });
  } catch (error: unknown) {
    console.error("[corporate-chip/activate] Error:", error);
    const message = error instanceof Error ? error.message : "Error al activar el chip empresarial";
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

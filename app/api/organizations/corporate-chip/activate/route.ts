import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { markFinishedGoodUnitActivatedWithClient } from "@/lib/operations/activate-finished-good-unit";
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

  // Account state determines ownership/capacity only. Lifetime service has no
  // time-based commercial expiry gate.
  const state = await AccountStateService.getAccountState(userId);

  try {
    await prisma.$transaction(async (tx) => {
      if (!state.accountId) throw Object.assign(new Error("Cuenta no encontrada"), { status: 400 });
      await tx.account.update({ where: { id: state.accountId }, data: { updatedAt: new Date() } });
      const now = new Date();

      const claimToken = await tx.chipClaimToken.findFirst({
        where: { ...activationCodeLookupWhere(activationCode), status: "active" },
        include: { chip: true },
      });

      if (!claimToken) {
        throw Object.assign(new Error("Código de activación inválido."), { status: 404 });
      }
      if (claimToken.usedAt) {
        throw Object.assign(new Error("Este código ya fue utilizado."), { status: 409 });
      }
      // Claim-token expiry protects the one-time credential only; it is not a
      // lifetime-service limit.
      if (claimToken.expiresAt && new Date() > claimToken.expiresAt) {
        throw Object.assign(new Error("Este código ha expirado."), { status: 410 });
      }

      const chip = claimToken.chip;
      if (!ACTIVATABLE_CHIP_STATUSES.includes(chip.status as (typeof ACTIVATABLE_CHIP_STATUSES)[number])) {
        throw Object.assign(new Error("Este chip no está disponible para activación."), { status: 409 });
      }

      const userProfile = await tx.profile.findUnique({ where: { userId } });
      if (!userProfile) {
        throw Object.assign(new Error("No se encontró tu perfil de usuario."), { status: 400 });
      }

      const member = await tx.organizationMember.findFirst({
        where: {
          profileId: userProfile.id,
          corporateStatus: "paid_active",
        },
        include: { profile: true },
      });

      if (!member) {
        throw Object.assign(new Error("No tienes un vínculo empresarial activo."), { status: 403 });
      }
      if (!member.corporateProfileId) {
        throw Object.assign(new Error("No se encontró tu perfil empresarial."), { status: 400 });
      }

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

      const corporateProfile = await tx.profile.findUnique({ where: { id: member.corporateProfileId } });
      if (!corporateProfile || corporateProfile.profileType !== "corporate") {
        throw Object.assign(new Error("El perfil vinculado no es un perfil empresarial válido."), { status: 400 });
      }
      if (corporateProfile.accountId !== userProfile.accountId) {
        throw Object.assign(new Error("Este chip corporativo no pertenece a tu cuenta."), { status: 403 });
      }
      if (!AccountStateService.isMedicalProfileComplete(corporateProfile)) {
        throw Object.assign(
          new Error("Completa tu perfil empresarial (nombre, apellido y tipo de sangre) antes de activar este chip."),
          { status: 400 }
        );
      }

      const pendingItem = await tx.corporateOrderEmployeeItem.findFirst({
        where: {
          organizationMemberId: member.id,
          deliveryStatus: "delivered",
          fulfillmentStatus: { not: "activated" },
          chipId: null,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!pendingItem) {
        throw Object.assign(
          new Error("No tienes un paquete empresarial entregado pendiente de activación."),
          { status: 400 }
        );
      }

      const account = await tx.account.findUnique({ where: { id: state.accountId as string } });
      if (!account) {
        throw Object.assign(new Error("Cuenta no encontrada."), { status: 400 });
      }

      // Corporate purchase capacity remains contractual even though each
      // activated identifier has no time-based service expiry.
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

      const tokenConsume = await tx.chipClaimToken.updateMany({
        where: {
          id: claimToken.id,
          usedAt: null,
          status: "active",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: { usedAt: now },
      });
      if (tokenConsume.count !== 1) {
        throw Object.assign(new Error("Código ya usado o expirado."), { status: 400 });
      }

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
          serviceEndDate: null,
          serviceStatus: CHIP_SERVICE_STATUS.ACTIVE,
        },
      });
      if (chipActivate.count !== 1) {
        throw Object.assign(new Error("Este chip ya no puede activarse."), { status: 400 });
      }

      await tx.corporateOrderEmployeeItem.update({
        where: { id: pendingItem.id, chipId: null, deliveryStatus: "delivered", fulfillmentStatus: { not: "activated" } },
        data: {
          chipId: claimToken.chipId,
          fulfillmentStatus: "activated",
          activatedAt: now,
        },
      });

      const physicalUnitActivation = await markFinishedGoodUnitActivatedWithClient(tx, {
        internalLabel: chip.internalLabel || null,
        shortCode: chip.shortCode,
        activationReferenceType: "corporate_chip_activation",
        activationReferenceId: chip.id,
        activatedAt: now,
        metadataJson: {
          chipId: chip.id,
          chipShortCode: chip.shortCode,
          activationCodeSuffix: activationCode.slice(-4),
          flow: "corporate_chip_activation",
          corporateProfileId: corporateProfile.id,
          organizationMemberId: member.id,
          corporateOrderEmployeeItemId: pendingItem.id,
        },
      });

      if (!physicalUnitActivation.ok) {
        throw Object.assign(
          new Error("La unidad física no está disponible para activación."),
          { status: 409, code: physicalUnitActivation.reason }
        );
      }

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
            serviceEndDate: null,
            lifetimeService: true,
          }),
        },
      });
    });

    await AccountStateService.invalidateCache(userId);

    return NextResponse.json({
      success: true,
      message: "Chip empresarial activado correctamente.",
    });
  } catch (error: unknown) {
    console.error("[corporate-chip/activate] Error:", error);
    const candidateStatus = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    const status = candidateStatus >= 400 && candidateStatus < 500 ? candidateStatus : 500;
    const message = status < 500 && error instanceof Error
      ? error.message
      : "No se pudo activar el chip empresarial.";
    return NextResponse.json({ error: message }, { status });
  }
}

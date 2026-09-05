import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import {
  ACTIVATABLE_CHIP_STATUSES,
  CHIP_SERVICE_STATUS,
  CHIP_STATUS,
  USED_CAPACITY_CHIP_STATUSES,
} from "@/domains/chips/chip-lifecycle.constants";
import { chipActivationSchema } from "@/lib/validations";
import { activationCodeLookupWhere } from "@/domains/chips/activation-code.service";

type CorporateItemWithMember = {
  organizationMember: {
    corporateProfileId: string | null;
    corporateStatus: string | null;
  } | null;
} | null;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Rate limit: 5 activation attempts per minute per user
  const limiter = await rateLimit("chip-activate", userId, {
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
  const parsedBody = chipActivationSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.errors[0]?.message || "Código de activación inválido" },
      { status: 400 }
    );
  }

  const { activationCode, profileId } = parsedBody.data;

  // Find the claim token
  const claimToken = await prisma.chipClaimToken.findFirst({
    where: { ...activationCodeLookupWhere(activationCode), status: "active" },
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

  if (claimToken.expiresAt && new Date() > claimToken.expiresAt) {
    return NextResponse.json(
      { error: "Este código ha expirado" },
      { status: 410 }
    );
  }

  const chip = claimToken.chip;

  const finishedGoodUnit = await prisma.operationFinishedGoodUnit.findFirst({
    where: {
      activationStatus: "not_activated",
      status: { in: ["dispatched", "delivered"] },
      OR: [
        { chipId: chip.id },
        ...(chip.internalLabel ? [{ internalLabel: chip.internalLabel }] : []),
      ],
    },
    select: {
      id: true,
      status: true,
      activationStatus: true,
      reservedOrderId: true,
    },
  });

  if (!finishedGoodUnit) {
    return NextResponse.json(
      {
        error: "Este producto todavía no está listo para activación. Debe estar entregado o en despacho.",
      },
      { status: 409 }
    );
  }

  if (!ACTIVATABLE_CHIP_STATUSES.includes(chip.status as (typeof ACTIVATABLE_CHIP_STATUSES)[number])) {
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
      if (!state.accountId) throw Object.assign(new Error("Cuenta no encontrada"), { status: 400 });
      await tx.account.update({ where: { id: state.accountId }, data: { updatedAt: new Date() } });
      const now = new Date();

      // Atomically consume token (single-use guard)
      const tokenConsume = await tx.chipClaimToken.updateMany({
        where: {
          id: claimToken.id,
          usedAt: null,
          status: "active",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: {
          usedAt: now,
        },
      });

      if (tokenConsume.count !== 1) {
        throw new Error("TOKEN_ALREADY_USED_OR_EXPIRED");
      }

      // Re-read account state within transaction (not from cache) to ensure atomicity
      const account = await tx.account.findUnique({
        where: { id: state.accountId as string }
      });

      if (!account) {
        throw new Error("Cuenta no encontrada");
      }

      const currentActiveCount = await tx.chip.count({
        where: { accountId: account.id, status: { in: [...USED_CAPACITY_CHIP_STATUSES] } }
      });

      // Enforce plan chip limit
      if (currentActiveCount >= account.maxChipsAllocated) {
        throw Object.assign(new Error(`Has alcanzado el límite de ${account.maxChipsAllocated} chip(s) en tu plan actual. Adquiere chips adicionales para activar más.`), { status: 409 });
      }
      const targetAccountId = account.id;

      // Detect if this is a corporate chip by checking CorporateOrderEmployeeItem
      const corporateItem = await tx.corporateOrderEmployeeItem.findFirst({
        where: { chipId: claimToken.chipId },
        include: {
          organizationMember: {
            include: { profile: { include: { user: true } } },
          },
        },
      }) as CorporateItemWithMember;

      let assignedProfileId: string;

      if (corporateItem) {
        // === CORPORATE ACTIVATION FLOW ===
        const member = corporateItem.organizationMember;

        if (!member) {
          throw Object.assign(
            new Error("El chip corporativo no está vinculado a un miembro de la organización."),
            { status: 400 }
          );
        }

        if (member.corporateStatus !== "paid_active") {
          throw Object.assign(
            new Error("Tu beneficio empresarial no está activo."),
            { status: 403 }
          );
        }

        // Use corporateProfileId from the member
        const corpProfileId = member.corporateProfileId as string | null;

        if (!corpProfileId) {
          throw Object.assign(
            new Error("Tu perfil empresarial no está configurado. Contacta a tu empresa."),
            { status: 400 }
          );
        }

        // Fetch the corporate profile directly
        const corpProfile = await tx.profile.findUnique({
          where: { id: corpProfileId },
        });

        if (!corpProfile || corpProfile.profileType !== "corporate") {
          throw Object.assign(
            new Error("El perfil vinculado no es un perfil empresarial válido."),
            { status: 400 }
          );
        }

        // Verify the corporate profile belongs to this user's account
        const userProfile = await tx.profile.findUnique({
          where: { userId },
          select: { accountId: true },
        });

        if (!userProfile) {
          throw Object.assign(
            new Error("No se encontró tu perfil de usuario."),
            { status: 400 }
          );
        }

        if (corpProfile.accountId !== userProfile.accountId) {
          throw Object.assign(
            new Error("Este chip corporativo no pertenece a tu cuenta."),
            { status: 403 }
          );
        }

        if (!AccountStateService.isMedicalProfileComplete(corpProfile)) {
          throw Object.assign(
            new Error("Completa tu perfil empresarial (nombre, apellido y tipo de sangre) antes de activar este chip."),
            { status: 400 }
          );
        }

        assignedProfileId = corpProfileId;
      } else {
        // === NORMAL ACTIVATION FLOW ===
        let profile;

        if (profileId) {
          // Use the selected profile if provided
          profile = await tx.profile.findFirst({
            where: { id: profileId, accountId: targetAccountId },
          });

          if (!profile) {
            throw Object.assign(
              new Error("Perfil médico inválido para esta activación."),
              { status: 400 }
            );
          }

          // Block activation against corporate profiles
          if (profile.profileType === "corporate") {
            throw Object.assign(
              new Error("Los perfiles empresariales se activan desde el módulo Empresa."),
              { status: 400 }
            );
          }
        } else {
          // Fallback: use own profile by userId
          profile = await tx.profile.findFirst({
            where: { userId }
          });
        }

        if (!profile || !AccountStateService.isMedicalProfileComplete(profile)) {
          throw Object.assign(
            new Error("Debes completar tu perfil médico (nombre, apellido y tipo de sangre) antes de activar un chip"),
            { status: 400 }
          );
        }

        assignedProfileId = profile.id;
      }

      // Activate the chip within transaction (conditional to prevent races)
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
          accountId: targetAccountId,
          assignedProfileId,
          activatedAt: now,
          serviceStartDate: now,
          serviceEndDate: serviceEndDate,
          serviceStatus: CHIP_SERVICE_STATUS.ACTIVE
        },
      });

      if (chipActivate.count !== 1) {
        throw new Error("CHIP_ALREADY_ACTIVE_OR_INVALID");
      }

      // Keep the physical unit and the public chip in the same atomic activation.
      // Activating a delivered product must never confirm or collect its payment.
      const unitActivate = await tx.operationFinishedGoodUnit.updateMany({
        where: {
          id: finishedGoodUnit.id,
          activationStatus: "not_activated",
          status: { in: ["dispatched", "delivered"] },
        },
        data: {
          status: "activated",
          activationStatus: "activated",
          activatedAt: now,
          activationReferenceType: "chip_activation",
          activationReferenceId: chip.id,
        },
      });

      if (unitActivate.count !== 1) {
        throw new Error("FINISHED_GOOD_UNIT_NOT_ELIGIBLE");
      }

      await tx.operationFinishedGoodUnitEvent.create({
        data: {
          unitId: finishedGoodUnit.id,
          eventType: "ACTIVATED",
          referenceType: "chip_activation",
          referenceId: chip.id,
          metadataJson: {
            chipId: chip.id,
            chipShortCode: chip.shortCode,
            activationCodeSuffix: activationCode.slice(-4),
            flow: "chip_activation",
          },
        },
      });

      // [Fase5-Corporate] Mark corporate order items as activated if this chip was assigned to them
      if (corporateItem) {
        await tx.corporateOrderEmployeeItem.updateMany({
          where: { chipId: claimToken.chipId },
          data: { fulfillmentStatus: "activated", activatedAt: now },
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
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED_OR_EXPIRED") {
      return NextResponse.json({ error: "Código ya usado o expirado." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "CHIP_ALREADY_ACTIVE_OR_INVALID") {
      return NextResponse.json({ error: "Este chip ya no puede activarse." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "FINISHED_GOOD_UNIT_NOT_ELIGIBLE") {
      return NextResponse.json(
        { error: "La unidad física ya no está disponible para activación." },
        { status: 409 }
      );
    }
    const candidateStatus = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    const status = candidateStatus >= 400 && candidateStatus < 500 ? candidateStatus : 500;
    const message = status < 500 && error instanceof Error
      ? error.message
      : "No se pudo activar el chip.";
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

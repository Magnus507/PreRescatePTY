import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { revealActivationCode } from "@/domains/chips/activation-code.service";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chipId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { chipId } = await params;

  const chip = await prisma.chip.findUnique({
    where: { id: chipId },
    include: {
      owner: {
        select: { email: true, phone: true, createdAt: true },
      },
      assignedProfile: {
        select: {
          firstName: true,
          lastName: true,
          birthDate: true,
          displayNamePublic: true,
          photoUrl: true,
          bloodType: true,
          allergies: true,
          chronicConditions: true,
          medications: true,
          additionalNotes: true,
          phone: true,
          contacts: {
            where: { active: true },
            orderBy: { priorityOrder: "asc" },
            select: {
               relationship: true,
               priorityOrder: true,
               contact: {
                  select: {
                     fullName: true,
                     phone: true,
                     email: true,
                  }
               }
            }
          },
        },
      },
      claimTokens: {
        select: { activationCode: true, usedAt: true, expiresAt: true },
      },
      scanEvents: {
        orderBy: { scannedAt: "desc" },
        take: 10,
        select: {
          id: true,
          scannedAt: true,
          sourceType: true,
          ipAddress: true,
          city: true,
          country: true,
          notificationStatus: true,
        },
      },
      _count: {
        select: { scanEvents: true, notifications: true },
      },
    },
  });

  if (!chip) {
    return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
  }

  // AUDIT & PRIVACY: Notify user of administrative access to sensitive medical data
  if (chip.ownerUserId) {
    const session = await getServerSession(authOptions);
    const adminEmail = session?.user?.email || "Administrador";

    await prisma.appNotification.create({
      data: {
        userId: chip.ownerUserId,
        title: "Acceso Administrativo",
        message: `Transparencia de Datos: Un administrador (${adminEmail}) ha consultado la información detallada de tu chip ${chip.shortCode}.`,
        type: "info"
      }
    });
  }

  return NextResponse.json({
    chip: {
      ...chip,
      claimTokens: chip.claimTokens.map((token) => ({
        ...token,
        activationCode: revealActivationCode(token.activationCode),
      })),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chipId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { chipId } = await params;
  const body = await req.json();
  const { status, serviceStatus, accountId, isPhysical, delete: shouldDelete } = body;

  try {
    // Get chip metadata before mutation (for cache invalidation and notification)
    const originalChip = await prisma.chip.findUnique({
      where: { id: chipId },
      select: {
        accountId: true,
        ownerUserId: true,
        shortCode: true,
        status: true,
        serviceStatus: true,
        assignedProfileId: true,
        isPhysical: true,
      }
    });
    if (!originalChip) {
      return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
    }
    const { ownerUserId, shortCode, status: oldStatus } = originalChip;

    if (shouldDelete) {
        // HARDENED DELETE: Verify chip is safe to delete before any mutation
        const chipForDeletion = await prisma.chip.findUnique({
          where: { id: chipId },
          select: {
            id: true,
            status: true,
            ownerUserId: true,
            assignedProfileId: true,
            serviceStartDate: true,
            serviceEndDate: true,
            activatedAt: true,
            pointOfSaleId: true,
            consignedAt: true,
            _count: {
              select: {
                claimTokens: true,
                scanEvents: true,
                notifications: true,
              },
            },
          },
        });

        if (!chipForDeletion) {
          return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
        }

        // Build list of reasons why this chip cannot be deleted
        const reasons: string[] = [];

        if (chipForDeletion.status !== "inventory") {
          reasons.push("El estado del chip no es 'inventario'");
        }
        if (chipForDeletion.ownerUserId) {
          reasons.push("Tiene un propietario asignado");
        }
        if (chipForDeletion.assignedProfileId) {
          reasons.push("Tiene un perfil clínico asignado");
        }
        if (chipForDeletion.serviceStartDate) {
          reasons.push("Tiene fecha de inicio de servicio");
        }
        if (chipForDeletion.serviceEndDate) {
          reasons.push("Tiene fecha de vencimiento de servicio");
        }
        if (chipForDeletion.activatedAt) {
          reasons.push("Ha sido activado");
        }
        if (chipForDeletion.pointOfSaleId) {
          reasons.push("Está consignado en un punto de venta");
        }
        if (chipForDeletion.consignedAt) {
          reasons.push("Tiene registro de consignación");
        }
        if (chipForDeletion._count.claimTokens > 0) {
          reasons.push("Tiene códigos de activación asociados");
        }
        if (chipForDeletion._count.scanEvents > 0) {
          reasons.push("Tiene historial de escaneos");
        }
        if (chipForDeletion._count.notifications > 0) {
          reasons.push("Tiene historial de notificaciones");
        }

        if (reasons.length > 0) {
          return NextResponse.json(
            {
              error: "CHIP_NOT_SAFE_TO_DELETE",
              message: "Este chip no puede eliminarse porque tiene asignaciones, relaciones o historial asociado.",
              reasons,
            },
            { status: 409 }
          );
        }

        // Chip is safe to delete: truly virgin inventory record
        await prisma.$transaction(async (tx) => {
          await tx.chip.delete({ where: { id: chipId } });
          await writeAuditLog(tx, {
            accountId: originalChip.accountId,
            actorUserId: auth.session.user.id,
            entityType: "Chip",
            entityId: chipId,
            action: "chip_deleted",
            requestId: getAuditRequestId(req),
            before: originalChip,
          });
        });
        // Invalidate owner's cache after deletion (if any)
        if (ownerUserId) await AccountStateService.invalidateCache(ownerUserId);
      return NextResponse.json({ message: "Chip eliminado permanentemente" });
    }

    const updateData: Partial<{ status: string; serviceStatus: string; accountId: string | null; isPhysical: boolean; assignedProfileId: string | null }> = {};
    if (status) updateData.status = status;
    if (serviceStatus) updateData.serviceStatus = serviceStatus;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (isPhysical !== undefined) updateData.isPhysical = isPhysical;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const releasesQuota = (status === "damaged" || status === "lost") && oldStatus === "activated";
    if (releasesQuota) {
      updateData.assignedProfileId = null;
      updateData.serviceStatus = "inactive";
    }

    const chip = await prisma.$transaction(async (tx) => {
      const updated = await tx.chip.update({
        where: { id: chipId },
        data: updateData,
      });

      if (releasesQuota && ownerUserId) {
        await tx.appNotification.create({
          data: {
            userId: ownerUserId,
            title: "Cupo Liberado",
            message: `Tu chip (${shortCode}) ha sido marcado como ${status === "damaged" ? "dañado" : "perdido"}. El cupo ha sido liberado para que puedas activar uno nuevo.`,
            type: "info"
          }
        });
      }

      await writeAuditLog(tx, {
        accountId: updated.accountId,
        actorUserId: auth.session.user.id,
        entityType: "Chip",
        entityId: chipId,
        action: "chip_updated",
        requestId: getAuditRequestId(req),
        before: originalChip,
        after: {
          accountId: updated.accountId,
          ownerUserId: updated.ownerUserId,
          shortCode: updated.shortCode,
          status: updated.status,
          serviceStatus: updated.serviceStatus,
          assignedProfileId: updated.assignedProfileId,
          isPhysical: updated.isPhysical,
        },
      });
      return updated;
    });

    // Invalidate cache after update
    if (ownerUserId) await AccountStateService.invalidateCache(ownerUserId);

    return NextResponse.json({ chip });
  } catch (err: unknown) {
    console.error("[admin/chips/:id] Update failed", err);
    return NextResponse.json({ error: "No se pudo actualizar el chip." }, { status: 500 });
  }
}

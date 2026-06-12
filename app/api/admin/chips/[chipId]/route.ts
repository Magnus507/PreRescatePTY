import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";

type AppNotificationCreateArgs = {
  data: {
    userId: string;
    title: string;
    message: string;
    type: string;
  };
};

type PrismaWithAppNotification = {
  appNotification: {
    create: (args: AppNotificationCreateArgs) => Promise<unknown>;
  };
};

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chipId: string }> }
) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
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

  return NextResponse.json({ chip });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chipId: string }> }
) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { chipId } = await params;
  const body = await req.json();
  const { status, serviceStatus, accountId, isPhysical, delete: shouldDelete } = body;

  try {
    // Get chip metadata before mutation (for cache invalidation and notification)
    const originalChip = await prisma.chip.findUnique({
      where: { id: chipId },
      select: { ownerUserId: true, shortCode: true, status: true, assignedProfileId: true }
    });
    const { ownerUserId, shortCode, status: oldStatus } = originalChip || {};

    if (shouldDelete) {
        // Handle dependencies before deleting the chip to avoid foreign key errors
        await prisma.$transaction([
          prisma.chipClaimToken.deleteMany({ where: { chipId } }),
          prisma.scanEvent.deleteMany({ where: { chipId } }),
          prisma.notification.deleteMany({ where: { chipId } }),
          prisma.chip.delete({ where: { id: chipId } })
        ]);
        // Invalidate owner's cache after deletion
        if (ownerUserId) await AccountStateService.invalidateCache(ownerUserId);
      return NextResponse.json({ message: "Chip eliminado permanentemente" });
    }

    const updateData: Partial<{ status: string; serviceStatus: string; accountId: string | null; isPhysical: boolean; assignedProfileId: string | null }> = {};
    if (status) updateData.status = status;
    if (serviceStatus) updateData.serviceStatus = serviceStatus;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (isPhysical !== undefined) updateData.isPhysical = isPhysical;

    // cleanup logic: if marked as damaged/lost from an active state, liberate quota
    if ((status === "damaged" || status === "lost") && oldStatus === "activated") {
        updateData.assignedProfileId = null;
        updateData.serviceStatus = "inactive";
        
        if (ownerUserId) {
            await (prisma as unknown as PrismaWithAppNotification).appNotification.create({
                data: {
                    userId: ownerUserId,
                    title: "Cupo Liberado",
                    message: `Tu chip (${shortCode}) ha sido marcado como ${status === 'damaged' ? 'dañado' : 'perdido'}. El cupo ha sido liberado para que puedas activar uno nuevo.`,
                    type: "info"
                }
            });
        }
    }

    const chip = await prisma.chip.update({
      where: { id: chipId },
      data: updateData,
    });

    // Invalidate cache after update
    if (ownerUserId) await AccountStateService.invalidateCache(ownerUserId);

    return NextResponse.json({ chip });
  } catch (err: unknown) {
    console.error(err);
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: e.message || "Error al actualizar chip" }, { status: 500 });
  }
}

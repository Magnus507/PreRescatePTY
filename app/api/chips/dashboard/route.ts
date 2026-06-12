import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const state = await AccountStateService.getAccountState(userId);

  if (!state.accountId) {
    return NextResponse.json({ chips: [], state });
  }

  let chips;
  try {
    chips = await prisma.chip.findMany({
      where: { accountId: state.accountId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { scanEvents: true } },
        assignedProfile: {
          select: { id: true, firstName: true, lastName: true, userId: true, profileType: true },
        },
        corporateOrderItems: {
          select: { id: true },
        },
        orderItems: {
          where: {
            order: {
              paymentStatus: { not: "rejected" },
              orderStatus: { not: "cancelled" },
            },
          },
          select: {
            id: true,
            productType: true,
            quantity: true,
            totalPrice: true,
            createdAt: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                orderStatus: true,
                paymentStatus: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (queryError) {
    console.error("CHIP_DASHBOARD_QUERY_ERROR", queryError);
    // Fallback: query without orderItems to ensure chips still load
    chips = await prisma.chip.findMany({
      where: { accountId: state.accountId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { scanEvents: true } },
        assignedProfile: {
          select: { id: true, firstName: true, lastName: true, userId: true, profileType: true },
        },
        corporateOrderItems: {
          select: { id: true },
        },
      },
    });
  }

  // Filtrar chips para excluir chips corporativos
  const personalChips = (chips || []).filter((chip) => {
    const isCorporateProfile = chip.assignedProfile?.profileType === "corporate";
    const hasCorporateOrderItems = chip.corporateOrderItems && chip.corporateOrderItems.length > 0;

    // Excluir si es perfil corporate O tiene items de orden corporativa
    return !isCorporateProfile && !hasCorporateOrderItems;
  });

  return NextResponse.json({ chips: personalChips });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { chipId, action } = body;

  if (!chipId || !action) {
    return NextResponse.json({ error: "chipId y action requeridos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountId: true } });
  
  if (!user || !user.accountId) {
    return NextResponse.json({ error: "Cuenta no configurada" }, { status: 400 });
  }

  const chip = await prisma.chip.findFirst({
    where: { id: chipId, accountId: user.accountId },
  });

  if (!chip) {
    return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
  }

  // Assign chip to a profile within the same account
  if (action === "assign") {
    const { profileId } = body;

    if (profileId) {
      const profile = await prisma.profile.findFirst({
        where: { id: profileId, accountId: user.accountId },
        select: { id: true, userId: true },
      });
      if (!profile) {
        return NextResponse.json({ error: "Perfil no encontrado en esta cuenta" }, { status: 400 });
      }
      await prisma.chip.update({
        where: { id: chipId },
        data: {
          assignedProfileId: profile.id,
          ownerUserId: profile.userId ?? chip.ownerUserId,
        },
      });
    } else {
      // Unassign
      await prisma.chip.update({
        where: { id: chipId },
        data: { assignedProfileId: null },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        entityType: "chip",
        entityId: chipId,
        action: "assign",
        oldValuesJson: JSON.stringify({ assignedProfileId: chip.assignedProfileId }),
        newValuesJson: JSON.stringify({ assignedProfileId: profileId ?? null }),
      },
    });

    // Invalidate cache after chip assignment
    await AccountStateService.invalidateCache(userId);

    return NextResponse.json({ message: "Asignación actualizada" });
  }

  let newStatus = chip.status;
  let updateData: Partial<{ status: string; ownerUserId?: string | null }> = {};
  
  if (action === "suspend" && chip.status === "activated") {
    newStatus = "suspended";
    updateData = { status: newStatus };
  } else if (action === "reactivate" && (chip.status === "suspended" || chip.status === "inventory")) {
    newStatus = "activated";
    updateData = { status: newStatus };
    if (chip.status === "inventory") {
      updateData.ownerUserId = userId; // Recuperar la propiedad del chip al reactivarlo de inventory
    }
  } else {
    return NextResponse.json({ error: "Acción no permitida" }, { status: 400 });
  }

  await prisma.chip.update({
    where: { id: chipId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      entityType: "chip",
      entityId: chipId,
      action,
      oldValuesJson: JSON.stringify({ status: chip.status }),
      newValuesJson: JSON.stringify({ status: newStatus }),
    },
  });

  // Invalidate cache after chip status change
  await AccountStateService.invalidateCache(userId);

  return NextResponse.json({ message: "Chip actualizado", status: newStatus });
}

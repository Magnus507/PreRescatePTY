import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chipId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const session = auth.session;

  const { chipId } = await params;

  const chip = await prisma.chip.findUnique({
    where: { id: chipId },
  });

  if (!chip) {
    return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
  }

  if (chip.status !== "activated") {
    return NextResponse.json(
      { error: "Solo se pueden reactivar chips que estén activados" },
      { status: 400 }
    );
  }

  // Reactivate: set serviceStatus to "active", extend service for 2 more years from now
  const newStartDate = new Date();
  const newEndDate = new Date();
  newEndDate.setFullYear(newEndDate.getFullYear() + 2);

  const updatedChip = await prisma.chip.update({
    where: { id: chipId },
    data: {
      serviceStatus: "active",
      serviceStartDate: newStartDate,
      serviceEndDate: newEndDate,
    },
  });

  // Audit log
  const adminEmail = session.user.email || "admin";
  const adminId = (session.user as { id?: string }).id || "admin";

  await prisma.auditLog.create({
    data: {
      actorUserId: adminId,
      entityType: "chip",
      entityId: chipId,
      action: "reactivate",
      oldValuesJson: JSON.stringify({
        serviceStatus: chip.serviceStatus,
        serviceStartDate: chip.serviceStartDate,
        serviceEndDate: chip.serviceEndDate,
      }),
      newValuesJson: JSON.stringify({
        serviceStatus: "active",
        serviceStartDate: newStartDate,
        serviceEndDate: newEndDate,
        reactivatedBy: adminEmail,
      }),
    },
  });

  // Invalidate cache for chip owner after reactivation
  if (updatedChip.ownerUserId) {
    await AccountStateService.invalidateCache(updatedChip.ownerUserId);
  }

  return NextResponse.json({
    message: "Chip reactivado exitosamente",
    chip: {
      id: updatedChip.id,
      serviceStatus: updatedChip.serviceStatus,
      serviceStartDate: updatedChip.serviceStartDate,
      serviceEndDate: updatedChip.serviceEndDate,
    },
  });
}

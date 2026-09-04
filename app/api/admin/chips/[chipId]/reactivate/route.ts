import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chipId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const session = auth.session;

  const { chipId } = await params;
  const requestId = getAuditRequestId(req);

  // Reactivate: set serviceStatus to "active", extend service for 2 more years from now
  const newStartDate = new Date();
  const newEndDate = new Date();
  newEndDate.setFullYear(newEndDate.getFullYear() + 2);

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const chip = await tx.chip.findUnique({ where: { id: chipId } });
      if (!chip) throw new Error("CHIP_NOT_FOUND");
      if (chip.status !== "activated") throw new Error("CHIP_NOT_ACTIVATED");

      const updatedChip = await tx.chip.update({
        where: { id: chipId },
        data: {
          serviceStatus: "active",
          serviceStartDate: newStartDate,
          serviceEndDate: newEndDate,
        },
      });

      await writeAuditLog(tx, {
        accountId: chip.accountId,
        actorUserId: session.user.id || null,
        entityType: "chip",
        entityId: chipId,
        action: "chip.reactivated",
        requestId,
        before: {
          serviceStatus: chip.serviceStatus,
          serviceStartDate: chip.serviceStartDate,
          serviceEndDate: chip.serviceEndDate,
        },
        after: {
          serviceStatus: updatedChip.serviceStatus,
          serviceStartDate: updatedChip.serviceStartDate,
          serviceEndDate: updatedChip.serviceEndDate,
        },
      });

      return updatedChip;
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "CHIP_NOT_FOUND") {
      return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "CHIP_NOT_ACTIVATED") {
      return NextResponse.json(
        { error: "Solo se pueden reactivar chips que estén activados" },
        { status: 400 }
      );
    }
    throw error;
  }

  // Invalidate cache for chip owner after reactivation
  if (result.ownerUserId) {
    await AccountStateService.invalidateCache(result.ownerUserId);
  }

  return NextResponse.json({
    message: "Chip reactivado exitosamente",
    chip: {
      id: result.id,
      serviceStatus: result.serviceStatus,
      serviceStartDate: result.serviceStartDate,
      serviceEndDate: result.serviceEndDate,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUniqueActivationCode } from "@/lib/identifiers";
import { protectActivationCode } from "@/domains/chips/activation-code.service";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chipId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const session = auth.session;

  const { chipId } = await context.params;
  const requestId = getAuditRequestId(req);

  try {
    const current = await prisma.chip.findUnique({
      where: { id: chipId },
      include: {
        claimTokens: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderId: true,
            usedAt: true,
            expiresAt: true,
            activationCode: true,
          },
        },
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
    }

    if (current.status !== "inventory") {
      return NextResponse.json(
        { error: "Solo se puede rehabilitar chips actualmente en inventario." },
        { status: 400 }
      );
    }

    const hasHistory = current.claimTokens.some((t) => t.orderId !== null || t.usedAt !== null);
    if (!hasHistory) {
      return NextResponse.json(
        { error: "El chip no tiene historial de devolución/reversión para rehabilitar." },
        { status: 400 }
      );
    }

    const newActivationCode = await getUniqueActivationCode();
    const newExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10); // 10 años para chips físicos
    const now = new Date();

    const oldValues = {
      status: current.status,
      ownerUserId: current.ownerUserId,
      accountId: current.accountId,
      assignedProfileId: current.assignedProfileId,
      activatedAt: current.activatedAt,
      serviceStartDate: current.serviceStartDate,
      serviceEndDate: current.serviceEndDate,
      serviceStatus: current.serviceStatus,
      tokenIds: current.claimTokens.map((t) => t.id),
    };

    const result = await prisma.$transaction(async (tx) => {
      const tokenIdsToNeutralize = current.claimTokens
        .filter((t) => t.orderId !== null || t.usedAt !== null)
        .map((t) => t.id);

      if (tokenIdsToNeutralize.length > 0) {
        await tx.chipClaimToken.updateMany({
          where: { id: { in: tokenIdsToNeutralize } },
          data: {
            orderId: null,
            expiresAt: now,
          },
        });
      }

      await tx.chip.update({
        where: { id: chipId },
        data: {
          status: "inventory",
          ownerUserId: null,
          accountId: null,
          assignedProfileId: null,
          activatedAt: null,
          serviceStartDate: null,
          serviceEndDate: null,
          serviceStatus: "inactive",
        },
      });

      const newToken = await tx.chipClaimToken.create({
        data: {
          chipId,
          ...protectActivationCode(newActivationCode),
          expiresAt: newExpiresAt,
          orderId: null,
          usedAt: null,
        },
      });

      const newValues = {
        status: "inventory",
        ownerUserId: null,
        accountId: null,
        assignedProfileId: null,
        activatedAt: null,
        serviceStartDate: null,
        serviceEndDate: null,
        serviceStatus: "inactive",
        newTokenId: newToken.id,
      };

      await writeAuditLog(tx, {
        accountId: current.accountId,
        actorUserId: session.user.id || null,
        entityType: "chip",
        entityId: chipId,
        action: "chip.rehabilitated_for_stock",
        requestId,
        before: oldValues,
        after: newValues,
      });

      const chip = await tx.chip.findUnique({
        where: { id: chipId },
        select: {
          id: true,
          shortCode: true,
          internalLabel: true,
          status: true,
          isPhysical: true,
          batchId: true,
          updatedAt: true,
        },
      });

      return { chip, newToken };
    });

    return NextResponse.json({
      message: "Chip rehabilitado para stock",
      chip: result.chip,
      token: {
        activationCode: newActivationCode,
        expiresAt: result.newToken.expiresAt,
      },
    });
  } catch (err: unknown) {
    console.error("[admin/chips/rehabilitate] Internal error", err);
    return NextResponse.json(
      { error: "No se pudo rehabilitar el chip." },
      { status: 500 }
    );
  }
}

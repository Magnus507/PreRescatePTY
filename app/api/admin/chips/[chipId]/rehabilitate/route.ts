import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUniqueActivationCode } from "@/lib/identifiers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ chipId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { chipId } = await context.params;

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
          activationCode: newActivationCode,
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

      await tx.auditLog.create({
        data: {
          accountId: current.accountId,
          actorUserId: session.user.id,
          entityType: "chip",
          entityId: chipId,
          action: "chip_rehabilitated_for_stock",
          oldValuesJson: JSON.stringify(oldValues),
          newValuesJson: JSON.stringify(newValues),
        },
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
        activationCode: result.newToken.activationCode,
        expiresAt: result.newToken.expiresAt,
      },
    });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { error: e.message || "Error rehabilitando chip" },
      { status: 500 }
    );
  }
}

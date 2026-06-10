import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { z } from "zod";
import { generateOrderNumber } from "@/lib/order-number";
import { getUniqueActivationCode } from "@/lib/identifiers";
import { USED_CAPACITY_CHIP_STATUSES } from "@/domains/chips/chip-lifecycle.constants";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";

export const dynamic = "force-dynamic";

const AssignDirectSchema = z.object({
  targetUserId: z.string().min(1),
  targetProfileId: z.string().min(1),
  reason: z.enum([
    "replacement",
    "courtesy",
    "warranty",
    "internal_test",
    "same_customer_reassign",
  ]),
  notes: z.string().optional(),
  capacityMode: z.enum(["deny_if_no_capacity", "consume_existing", "grant_exception"]),
  autoActivate: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest, context: { params: Promise<{ chipId: string }> }) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const session = auth.session;

  const { chipId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const parsed = AssignDirectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { targetUserId, targetProfileId, reason, notes, capacityMode, autoActivate } = parsed.data;

  if (autoActivate) {
    return NextResponse.json({ error: "Auto activate aún no está disponible." }, { status: 400 });
  }

  if (capacityMode === "grant_exception" && !notes?.trim()) {
    return NextResponse.json(
      { error: "Debes incluir notas cuando uses grant_exception." },
      { status: 400 }
    );
  }

  const chip = await prisma.chip.findUnique({ where: { id: chipId } });
  if (!chip) {
    return NextResponse.json({ error: "Chip no encontrado" }, { status: 404 });
  }

  if (chip.status !== "inventory") {
    return NextResponse.json(
      { error: "El chip no está disponible para asignación directa." },
      { status: 409 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, accountId: true, email: true },
  });
  if (!targetUser?.accountId) {
    return NextResponse.json({ error: "Usuario destino sin cuenta asociada." }, { status: 400 });
  }

  const targetProfile = await prisma.profile.findUnique({
    where: { id: targetProfileId },
    select: { id: true, accountId: true, userId: true },
  });
  if (!targetProfile) {
    return NextResponse.json({ error: "Perfil destino no encontrado." }, { status: 404 });
  }

  if (targetProfile.accountId !== targetUser.accountId) {
    return NextResponse.json(
      { error: "El perfil destino no pertenece a la cuenta del usuario destino." },
      { status: 400 }
    );
  }

  if (targetProfile.userId && targetProfile.userId !== targetUser.id) {
    return NextResponse.json(
      { error: "El perfil destino no corresponde al usuario indicado." },
      { status: 400 }
    );
  }

  const activeReservedTokenInOtherOrder = await prisma.chipClaimToken.findFirst({
    where: {
      chipId,
      usedAt: null,
      expiresAt: { gt: new Date() },
      orderId: { not: null },
    },
    select: { id: true },
  });

  if (activeReservedTokenInOtherOrder) {
    return NextResponse.json(
      { error: "El chip tiene una reserva activa para otra orden." },
      { status: 409 }
    );
  }

  const account = await prisma.account.findUnique({
    where: { id: targetUser.accountId },
    select: { id: true, maxChipsAllocated: true, maxProfilesAllocated: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Cuenta destino no encontrada." }, { status: 404 });
  }

  const usedCapacity = await prisma.chip.count({
    where: {
      accountId: account.id,
      status: { in: [...USED_CAPACITY_CHIP_STATUSES] },
    },
  });

  const availableCapacity = account.maxChipsAllocated - usedCapacity;

  if (capacityMode !== "grant_exception" && availableCapacity < 1) {
    return NextResponse.json({ error: "La cuenta no tiene cupo disponible." }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000 * 10); // 10 años para chips físicos
  const activationCode = await getUniqueActivationCode();
  const orderNumber = await generateOrderNumber("manual");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: targetUser.id,
          amount: 0,
          currency: "USD",
          provider: "manual",
          paymentMethod: "manual",
          paymentStatus: "paid",
          orderStatus: "completed",
          adminReviewStatus: "approved",
          adminReviewedAt: now,
          adminReviewedById: session.user.id,
          adminReviewNotes: notes || `assign_direct:${reason}`,
          customerName: targetUser.email || "Asignación directa",
          customerEmail: targetUser.email || null,
          items: {
            create: [
              {
                productType: "ASSIGN_DIRECT",
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
              },
            ],
          },
        },
        select: { id: true, orderNumber: true },
      });

      const beforeCapacity = {
        maxChipsAllocated: account.maxChipsAllocated,
        maxProfilesAllocated: account.maxProfilesAllocated,
      };

      let capacityAfter = beforeCapacity;
      if (capacityMode === "grant_exception") {
        const updatedAccount = await tx.account.update({
          where: { id: account.id },
          data: {
            maxChipsAllocated: { increment: 1 },
            maxProfilesAllocated: { increment: 1 },
          },
          select: { maxChipsAllocated: true, maxProfilesAllocated: true },
        });
        capacityAfter = updatedAccount;
      }

      const tokenResult = await OrderFulfillmentService.assignDirectReserveChipAndToken(tx, {
        chipId,
        orderId: order.id,
        activationCode,
        expiresAt,
      });

      await tx.auditLog.create({
        data: {
          accountId: account.id,
          actorUserId: session.user.id,
          entityType: "chip",
          entityId: chipId,
          action: "assign_direct",
          oldValuesJson: JSON.stringify({
            status: chip.status,
            capacity: beforeCapacity,
          }),
          newValuesJson: JSON.stringify({
            targetUserId,
            targetProfileId,
            reason,
            notes: notes || null,
            capacityMode,
            orderId: order.id,
            tokenId: tokenResult.tokenId,
            status: "sold",
            activationCodeSuffix: activationCode.slice(-4),
            capacity: capacityAfter,
          }),
        },
      });

      const updatedChip = await tx.chip.findUnique({
        where: { id: chipId },
        select: { id: true, shortCode: true, status: true },
      });

      return {
        order,
        chip: updatedChip,
        tokenId: tokenResult.tokenId,
        capacity: capacityAfter,
      };
    });

    return NextResponse.json({
      message: "Chip asignado directamente",
      chip: result.chip,
      order: result.order,
      token: {
        activationCode,
        expiresAt,
      },
      capacity: {
        maxChipsAllocated: result.capacity.maxChipsAllocated,
        maxProfilesAllocated: result.capacity.maxProfilesAllocated,
      },
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status) || 500
        : 500;
    const message = error instanceof Error ? error.message : "Error en asignación directa";
    return NextResponse.json({ error: message }, { status });
  }
}

import type { Prisma } from "@prisma/client";

type OrderItemLike = {
  quantity?: number | null;
  profileId?: string | null;
  chipId?: string | null;
};

type PackageLike = {
  maxProfiles?: number | null;
};

type OrderApprovalLike = {
  paymentStatus?: string | null;
  adminReviewStatus?: string | null;
};

type AccountCapacityLike = {
  maxChipsAllocated: number;
  maxProfilesAllocated: number;
};

type CapacityIncrement = {
  chipsToAdd: number;
  profilesToAdd: number;
};

export type AssignedChipInput = {
  chipId: string;
};

export type FulfillmentInput = {
  orderId: string;
  assignedChipIds?: string[];
};

export type FulfillmentResult = {
  purchasedChips: number;
  purchasedProfiles: number;
  wasAlreadyApproved: boolean;
  normalizedAssignedChipIds: string[];
};

type ReserveAssignedChipsInput = {
  orderId: string;
  assignedChipIds: string[];
  purchasedChips: number;
  tokenExpiresAt: Date;
};

type ReserveAssignedChipsResult = {
  reservedChipIds: string[];
};

type AssignDirectTokenInput = {
  chipId: string;
  orderId: string;
  activationCode: string;
  expiresAt: Date;
};

type AssignDirectTokenResult = {
  tokenId: string;
};

/**
 * Fase C4 (baseline): servicio preparatorio para consolidar fulfillment.
 *
 * Futuro source of truth para:
 * - reservar chips
 * - crear/vincular tokens
 * - incrementar capacidad
 * - completar fulfillment de órdenes
 *
 * En esta fase NO ejecuta writes ni transacciones; solo helpers puros.
 */
export class OrderFulfillmentService {
  static calculatePurchasedChips(orderItems: OrderItemLike[]): number {
    // Exclude personalized accessories (items with profileId or chipId) — they don't count as new chips
    return orderItems
      .filter((item) => !item.profileId && !item.chipId)
      .reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);
  }

  static calculatePurchasedProfiles(pkg: PackageLike): number {
    return Math.max(0, pkg.maxProfiles || 0);
  }

  static wasOrderAlreadyApproved(order: OrderApprovalLike): boolean {
    return order.paymentStatus === "paid" || order.adminReviewStatus === "approved";
  }

  static normalizeAssignedChipIds(input?: string[] | null): string[] {
    return Array.from(new Set((input || []).filter(Boolean)));
  }

  static calculateCapacityIncrement(
    orderItems: OrderItemLike[],
    pkg: PackageLike
  ): CapacityIncrement {
    return {
      chipsToAdd: this.calculatePurchasedChips(orderItems),
      profilesToAdd: this.calculatePurchasedProfiles(pkg),
    };
  }

  static applyCapacityIfFirstApproval(
    currentAccount: AccountCapacityLike,
    increment: CapacityIncrement,
    wasAlreadyApproved: boolean
  ): AccountCapacityLike {
    if (wasAlreadyApproved) {
      return {
        maxChipsAllocated: currentAccount.maxChipsAllocated,
        maxProfilesAllocated: currentAccount.maxProfilesAllocated,
      };
    }

    return {
      maxChipsAllocated: currentAccount.maxChipsAllocated + increment.chipsToAdd,
      maxProfilesAllocated: currentAccount.maxProfilesAllocated + increment.profilesToAdd,
    };
  }

  static async reserveAssignedChipsForOrder(
    tx: Prisma.TransactionClient,
    input: ReserveAssignedChipsInput
  ): Promise<ReserveAssignedChipsResult> {
    const { orderId, assignedChipIds, purchasedChips, tokenExpiresAt } = input;

    if (assignedChipIds.length === 0) {
      return { reservedChipIds: [] };
    }

    if (assignedChipIds.length > purchasedChips) {
      throw Object.assign(new Error("No puedes asignar más chips que los incluidos en la orden."), { status: 400 });
    }

    const reservedChipIds: string[] = [];

    for (const chipId of assignedChipIds) {
      const chip = await tx.chip.findUnique({
        where: { id: chipId },
        include: {
          claimTokens: {
            where: { usedAt: null },
            select: { id: true, orderId: true },
          },
        },
      });

      if (!chip) {
        throw Object.assign(new Error("El chip ya no está disponible en inventario."), { status: 409 });
      }

      const conflictingToken = chip.claimTokens.find((t) => t.orderId && t.orderId !== orderId);
      if (conflictingToken) {
        throw Object.assign(new Error("Este chip ya está asignado a otra orden."), { status: 409 });
      }

      const tokenForThisOrder = chip.claimTokens.find((t) => t.orderId === orderId);

      if (chip.status === "inventory") {
        const reserved = await tx.chip.updateMany({
          where: { id: chip.id, status: "inventory" },
          data: { status: "sold" },
        });

        if (reserved.count !== 1) {
          throw Object.assign(new Error("El chip ya no está disponible en inventario."), { status: 409 });
        }
      } else if (chip.status === "sold") {
        if (!tokenForThisOrder) {
          throw Object.assign(new Error("Este chip ya está asignado a otra orden."), { status: 409 });
        }
      } else {
        throw Object.assign(new Error("El chip ya no está disponible en inventario."), { status: 409 });
      }

      if (tokenForThisOrder) {
        await tx.chipClaimToken.update({
          where: { id: tokenForThisOrder.id },
          data: { expiresAt: tokenExpiresAt },
        });
      } else {
        const reusableToken = chip.claimTokens.find((t) => t.orderId === null);
        if (reusableToken) {
          await tx.chipClaimToken.update({
            where: { id: reusableToken.id },
            data: {
              orderId,
              expiresAt: tokenExpiresAt,
            },
          });
        } else {
          await tx.chipClaimToken.create({
            data: {
              chipId: chip.id,
              orderId,
              activationCode: `ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              expiresAt: tokenExpiresAt,
            },
          });
        }
      }

      reservedChipIds.push(chip.id);
    }

    return { reservedChipIds };
  }

  static async assignDirectReserveChipAndToken(
    tx: Prisma.TransactionClient,
    input: AssignDirectTokenInput
  ): Promise<AssignDirectTokenResult> {
    const { chipId, orderId, activationCode, expiresAt } = input;

    const chip = await tx.chip.findUnique({ where: { id: chipId } });
    if (!chip || chip.status !== "inventory") {
      throw Object.assign(new Error("El chip no está disponible para asignación directa."), { status: 409 });
    }

    const reservedByOtherOrder = await tx.chipClaimToken.findFirst({
      where: {
        chipId,
        usedAt: null,
        expiresAt: { gt: new Date() },
        orderId: { not: null },
      },
      select: { id: true },
    });

    if (reservedByOtherOrder) {
      throw Object.assign(new Error("El chip tiene una reserva activa en otra orden."), { status: 409 });
    }

    await tx.chipClaimToken.updateMany({
      where: {
        chipId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(),
      },
    });

    const moved = await tx.chip.updateMany({
      where: { id: chipId, status: "inventory" },
      data: {
        status: "sold",
        ownerUserId: null,
        accountId: null,
        assignedProfileId: null,
      },
    });

    if (moved.count !== 1) {
      throw Object.assign(new Error("El chip ya no está disponible para asignación directa."), { status: 409 });
    }

    const token = await tx.chipClaimToken.create({
      data: {
        chipId,
        orderId,
        activationCode,
        usedAt: null,
        expiresAt,
      },
      select: { id: true },
    });

    return { tokenId: token.id };
  }
}

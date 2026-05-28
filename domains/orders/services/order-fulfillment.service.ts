type OrderItemLike = {
  quantity?: number | null;
};

type PackageLike = {
  maxProfiles?: number | null;
};

type OrderApprovalLike = {
  paymentStatus?: string | null;
  adminReviewStatus?: string | null;
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
    return orderItems.reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);
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
}

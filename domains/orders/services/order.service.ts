import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAdminApproveManual, canAdminRejectManual, canCustomerCancelManual, canSubmitManualProof } from "@/lib/order-status";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type CreateManualOrderInput = Prisma.OrderCreateInput;

export type SubmitPaymentProofInput = {
  orderId: string;
  userId: string;
  paymentProofUrl?: string | null;
  manualPaymentReference?: string | null;
  normalizePaymentProofUrl?: (value: string) => string | null;
};

export type CancelCustomerOrderInput = {
  orderId: string;
  userId: string;
};

export type ApproveManualOrderInput = {
  orderId: string;
  adminId: string;
  adminReviewNotes?: string | null;
};

export type RejectManualOrderInput = {
  orderId: string;
  adminId: string;
  adminReviewNotes?: string | null;
};

export class OrderService {
  static async createManualOrder(input: CreateManualOrderInput, db: DbClient = prisma) {
    return db.order.create({ data: input });
  }

  static async submitPaymentProof(input: SubmitPaymentProofInput, db: DbClient = prisma) {
    const order = await db.order.findUnique({ where: { id: input.orderId } });
    if (!order || order.userId !== input.userId) return null;
    if (order.provider !== "manual") return null;
    if (!canSubmitManualProof(order)) return null;

    const normalizedProofUrl = input.paymentProofUrl
      ? (input.normalizePaymentProofUrl?.(input.paymentProofUrl) ?? input.paymentProofUrl)
      : null;

    if (input.paymentProofUrl && !normalizedProofUrl) return null;

    const updateData: Prisma.OrderUpdateInput = {
      paymentStatus: "under_review",
      orderStatus: "processing",
      adminReviewStatus: "pending",
    };

    if (normalizedProofUrl) updateData.paymentProofUrl = normalizedProofUrl;
    if (input.manualPaymentReference) updateData.manualPaymentReference = input.manualPaymentReference;

    return db.order.update({ where: { id: input.orderId }, data: updateData });
  }

  static async cancelCustomerOrder(input: CancelCustomerOrderInput, db: DbClient = prisma) {
    const order = await db.order.findUnique({ where: { id: input.orderId } });
    if (!order || order.userId !== input.userId) return null;
    if (!canCustomerCancelManual(order)) return null;

    return db.order.update({
      where: { id: input.orderId },
      data: {
        orderStatus: "cancelled",
        paymentStatus: "cancelled",
      },
    });
  }

  static async approveManualOrder(input: ApproveManualOrderInput, db: DbClient = prisma) {
    const order = await db.order.findUnique({ where: { id: input.orderId } });
    if (!order || order.provider !== "manual") return null;
    if (!canAdminApproveManual(order)) return null;

    return db.order.update({
      where: { id: input.orderId },
      data: {
        paymentStatus: "paid",
        orderStatus: "completed",
        adminReviewStatus: "approved",
        adminReviewedAt: new Date(),
        adminReviewedById: input.adminId,
        adminReviewNotes: input.adminReviewNotes ?? null,
      },
    });
  }

  static async rejectManualOrder(input: RejectManualOrderInput, db: DbClient = prisma) {
    const order = await db.order.findUnique({ where: { id: input.orderId } });
    if (!order || order.provider !== "manual") return null;
    if (!canAdminRejectManual(order)) return null;

    return db.order.update({
      where: { id: input.orderId },
      data: {
        paymentStatus: "rejected",
        orderStatus: "cancelled",
        adminReviewStatus: "rejected",
        adminReviewedAt: new Date(),
        adminReviewedById: input.adminId,
        adminReviewNotes: input.adminReviewNotes ?? null,
      },
    });
  }
}

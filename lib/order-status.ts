export type PaymentStatus = "pending" | "under_review" | "paid" | "rejected" | "cancelled";
export type OrderStatus = "pending" | "processing" | "shipped" | "completed" | "cancelled";
export type AdminReviewStatus = "pending" | "approved" | "rejected";
export type OrderProvider = "manual" | "stripe" | "legacy" | "admin";

type OrderLike = {
  provider?: OrderProvider | string | null;
  paymentStatus?: PaymentStatus | string | null;
  orderStatus?: OrderStatus | string | null;
  adminReviewStatus?: AdminReviewStatus | string | null;
};

const MANUAL_FINAL_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "paid",
  "rejected",
  "cancelled",
]);

const MANUAL_FINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "completed",
  "cancelled",
]);

const MANUAL_FINAL_REVIEW_STATUSES: ReadonlySet<AdminReviewStatus> = new Set([
  "approved",
  "rejected",
]);

export function isManualOrderFinal(order: OrderLike): boolean {
  if (order.provider !== "manual") return false;
  return (
    MANUAL_FINAL_PAYMENT_STATUSES.has(order.paymentStatus as PaymentStatus) ||
    MANUAL_FINAL_ORDER_STATUSES.has(order.orderStatus as OrderStatus) ||
    MANUAL_FINAL_REVIEW_STATUSES.has(order.adminReviewStatus as AdminReviewStatus)
  );
}

export function canSubmitManualProof(order: OrderLike): boolean {
  if (order.provider !== "manual") return false;
  const paymentStatus = order.paymentStatus as PaymentStatus | undefined;
  return !isManualOrderFinal(order) && (paymentStatus === "pending" || paymentStatus === "under_review");
}

export function canAdminApproveManual(order: OrderLike): boolean {
  const paymentStatus = order.paymentStatus as PaymentStatus | undefined;
  const adminReviewStatus = order.adminReviewStatus as AdminReviewStatus | undefined;
  return (
    order.provider === "manual" &&
    paymentStatus === "under_review" &&
    adminReviewStatus !== "approved" &&
    adminReviewStatus !== "rejected"
  );
}

export function canAdminRejectManual(order: OrderLike): boolean {
  return canAdminApproveManual(order);
}

export function getOrderStatusLabel(orderStatus?: string | null, paymentStatus?: string | null): string {
  if (paymentStatus === "rejected") return "Pago Rechazado";
  if (paymentStatus === "under_review") return "Pago en Revisión";
  if (paymentStatus === "paid") return "Pago Aprobado";
  if (orderStatus === "pending") return "Esperando Pago";
  if (orderStatus === "processing") return "Trabajando en tu pedido";
  if (orderStatus === "shipped") return "En camino";
  if (orderStatus === "completed") return "Completado";
  if (orderStatus === "cancelled") return "Cancelado";
  return "Desconocido";
}

export function canCustomerCancelManual(order: OrderLike): boolean {
  return (
    order.provider === "manual" &&
    (order.paymentStatus === "pending" || order.paymentStatus === "under_review") &&
    order.orderStatus !== "completed" &&
    order.orderStatus !== "shipped" &&
    order.orderStatus !== "cancelled"
  );
}
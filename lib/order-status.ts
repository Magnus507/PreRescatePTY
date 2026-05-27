type OrderLike = {
  provider?: string | null;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  adminReviewStatus?: string | null;
};

export function isManualOrderFinal(order: OrderLike): boolean {
  if (order.provider !== "manual") return false;
  return (
    order.paymentStatus === "paid" ||
    order.paymentStatus === "rejected" ||
    order.paymentStatus === "cancelled" ||
    order.orderStatus === "completed" ||
    order.orderStatus === "cancelled" ||
    order.adminReviewStatus === "approved" ||
    order.adminReviewStatus === "rejected"
  );
}

export function canSubmitManualProof(order: OrderLike): boolean {
  if (order.provider !== "manual") return false;
  return !isManualOrderFinal(order) && (order.paymentStatus === "pending" || order.paymentStatus === "under_review");
}

export function canAdminApproveManual(order: OrderLike): boolean {
  return (
    order.provider === "manual" &&
    order.paymentStatus === "under_review" &&
    order.adminReviewStatus !== "approved" &&
    order.adminReviewStatus !== "rejected"
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
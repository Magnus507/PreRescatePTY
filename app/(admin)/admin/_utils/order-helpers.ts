/**
 * Order display helpers for the admin panel.
 */

export function formatShippingAddress(order: {
  shippingCity?: string | null;
  shippingAddress?: string | null;
  shippingNotes?: string | null;
}): string {
  const parts = [order.shippingCity, order.shippingAddress, order.shippingNotes]
    .map((part) => (part || "").trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) return "Dirección no proporcionada";
  return parts.join(" · ");
}

export function getPaymentMethodLabel(method?: string | null): string {
  if (!method) return "Método no identificado";
  const map: Record<string, string> = {
    YAPPY: "Yappy",
    BANK_TRANSFER: "Transferencia bancaria",
    STRIPE: "Tarjeta",
    CARD: "Tarjeta",
    MANUAL: "Manual",
    CASH: "Efectivo",
    CHECK: "Cheque",
  };
  return map[method.toUpperCase()] || method.replace(/_/g, " ");
}

export function getPaymentStatusLabel(status?: string | null): string {
  if (!status) return "Desconocido";
  const map: Record<string, string> = {
    pending: "Pendiente",
    under_review: "En revisión",
    paid: "Pagado",
    rejected: "Rechazado",
    cancelled: "Cancelado",
    failed: "Fallido",
  };
  return map[status.toLowerCase()] || status;
}

export function getOrderStatusLabel(status?: string | null): string {
  if (!status) return "Desconocido";
  const map: Record<string, string> = {
    pending: "Pendiente",
    processing: "Procesando",
    shipped: "Enviado",
    completed: "Finalizado",
    cancelled: "Cancelada",
  };
  return map[status.toLowerCase()] || status;
}
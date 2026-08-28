export type OrderOperationalSnapshot = {
  orderStatus?: string | null;
  paymentStatus?: string | null;
  corporateDeliveryStatus?: string | null;
  dispatch?: {
    id?: string | null;
    status?: string | null;
  } | null;
};

const CANCELLED_ORDER_STATUSES = new Set(["cancelled", "canceled"]);
const DELIVERED_ORDER_STATUSES = new Set(["completed", "delivered"]);
const DELIVERED_DISPATCH_STATUSES = new Set(["completed", "delivered"]);

export function normalizeOperationalStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function isOrderOperationallyCancelled(order: OrderOperationalSnapshot) {
  return (
    CANCELLED_ORDER_STATUSES.has(normalizeOperationalStatus(order.orderStatus)) ||
    normalizeOperationalStatus(order.paymentStatus) === "rejected"
  );
}

export function isOrderOperationallyDelivered(order: OrderOperationalSnapshot) {
  if (isOrderOperationallyCancelled(order)) return false;

  if (DELIVERED_ORDER_STATUSES.has(normalizeOperationalStatus(order.orderStatus))) {
    return true;
  }

  if (DELIVERED_DISPATCH_STATUSES.has(normalizeOperationalStatus(order.dispatch?.status))) {
    return true;
  }

  return DELIVERED_DISPATCH_STATUSES.has(
    normalizeOperationalStatus(order.corporateDeliveryStatus)
  );
}

export function isOrderTransferredToDispatch(order: OrderOperationalSnapshot) {
  if (isOrderOperationallyCancelled(order) || isOrderOperationallyDelivered(order)) {
    return false;
  }

  return Boolean(order.dispatch?.id);
}

export function isOrderOwnedByPedidos(order: OrderOperationalSnapshot) {
  return (
    !isOrderOperationallyCancelled(order) &&
    !isOrderOperationallyDelivered(order) &&
    !isOrderTransferredToDispatch(order)
  );
}

export function isOrderVisibleInPedidosHistory(order: OrderOperationalSnapshot) {
  return isOrderOperationallyDelivered(order) || isOrderTransferredToDispatch(order);
}

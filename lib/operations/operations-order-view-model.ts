export type OperationsOrderItem = {
  productType: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
    displayNamePublic?: string | null;
    profileType: string;
  } | null;
  chip?: {
    id: string;
    shortCode: string;
    serialPublic: string;
    status: string;
  } | null;
};

export type OperationsOrderInput = {
  id: string;
  orderNumber: string;
  provider: string;
  providerReference: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentProofUrl: string | null;
  manualPaymentReference: string | null;
  adminReviewStatus: string | null;
  adminReviewNotes: string | null;
  orderStatus: string;
  orderType: string;
  amount: number;
  currency?: string | null;
  createdAt: Date;
  updatedAt: Date;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingNotes?: string | null;
  customerDocument?: string | null;
  items: OperationsOrderItem[];
};

export type OperationsOrderViewModel = {
  id: string;
  sourceOrderId?: string;
  operationOrderId?: string;
  displayOrderCode: string;
  operationsReferenceCode: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  channel: string;
  deliveryReference?: string | null;
  orderStatus: string;
  orderStatusLabel: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  paymentProofUrl?: string | null;
  paymentProofAvailable: boolean;
  paymentMethod?: string | null;
  paymentSubmittedAt?: string | null;
  paymentRejectedReason?: string | null;
  commercialItemName?: string | null;
  commercialQuantity?: number | null;
  commercialUnitPrice?: number | null;
  commercialTotal?: number | null;
  operationalProductName?: string | null;
  operationalProductCode?: string | null;
  operationalQuantity?: number | null;
  total: number;
  currency: string;
  reservedUnits: Array<{
    id: string;
    internalLabel?: string | null;
    shortCode?: string | null;
    qaStatus?: string | null;
    inventoryStatus?: string | null;
    activationStatus?: string | null;
  }>;
  productionOrder?: {
    id: string;
    code: string;
    status: string;
  } | null;
  dispatch?: {
    id: string;
    code: string;
    status: string;
  } | null;
  canApprovePayment: boolean;
  canRejectPayment: boolean;
  canAcceptOrder: boolean;
  canRejectOrder: boolean;
  canArchiveOrder: boolean;
  canReserveInternalLabel: boolean;
  canSendToProduction: boolean;
  canCreateDispatch: boolean;
  blockedReasons: string[];
};

function getPaymentLabel(paymentStatus: string, paymentProofAvailable: boolean) {
  if (paymentStatus === "rejected") return "Pago rechazado";
  if (paymentStatus === "paid") return "Pago aprobado";
  if (paymentProofAvailable || paymentStatus === "under_review") return "Pago en revisión";
  return "Pago pendiente";
}

function getOrderStatusLabel(orderStatus: string) {
  switch (orderStatus) {
    case "pending":
      return "Pendiente";
    case "processing":
      return "En revisión";
    case "shipped":
      return "Enviado";
    case "completed":
      return "Completado";
    case "cancelled":
      return "Archivado";
    default:
      return orderStatus;
  }
}

function getComboMultiplier(label: string | null | undefined) {
  const normalized = (label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return 1;
  if (normalized.includes("combo_duo") || normalized.includes("combo duo")) return 2;
  if (normalized.includes("combo_familiar") || normalized.includes("combo familiar")) return 3;
  if (normalized.includes("combo_hogar_full") || normalized.includes("combo hogar full")) return 5;
  if (normalized.includes("combo_empresa") || normalized.includes("combo empresa")) return 20;
  if (normalized.includes("combo_estandar") || normalized.includes("combo estandar")) return 1;
  return 1;
}

function getComboPricing(label: string | null | undefined) {
  const normalized = (label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return null;
  if (normalized.includes("combo duo")) return { price: 45, unitsPerCombo: 2, commercialQuantity: 1 };
  if (normalized.includes("combo familiar")) return { price: 65, unitsPerCombo: 3, commercialQuantity: 1 };
  if (normalized.includes("combo hogar full")) return { price: 95, unitsPerCombo: 5, commercialQuantity: 1 };
  if (normalized.includes("combo empresa")) return { price: 250, unitsPerCombo: 20, commercialQuantity: 1 };
  if (normalized.includes("combo corporativo")) return { price: 450, unitsPerCombo: 50, commercialQuantity: 1 };
  if (normalized.includes("combo estandar")) return { price: 25, unitsPerCombo: 1, commercialQuantity: 1 };
  return null;
}

function getBlockedReasons(order: OperationsOrderInput, paymentProofAvailable: boolean) {
  const reasons: string[] = [];

  if (order.orderStatus === "cancelled") reasons.push("Pedido archivado");
  if (order.orderStatus === "completed") reasons.push("Pedido finalizado");
  if (!paymentProofAvailable && order.paymentStatus !== "paid") reasons.push("Sin comprobante");
  if (order.paymentStatus === "rejected") reasons.push("Pago rechazado");
  if (order.adminReviewStatus === "rejected") reasons.push("Revisión rechazada");

  return reasons;
}

export function buildOperationsOrderViewModel(order: OperationsOrderInput): OperationsOrderViewModel {
  const displayOrderCode = order.providerReference?.trim()?.startsWith("PR-")
    ? order.providerReference.trim()
    : order.orderNumber.startsWith("OP-")
      ? order.orderNumber.replace(/^OP-(CLI|EMP)-/, "")
      : order.orderNumber;
  const operationsReferenceCode = order.orderNumber.startsWith("OP-")
    ? order.orderNumber
    : `OP-CLI-${displayOrderCode}`;
  const paymentProofAvailable = Boolean(order.paymentProofUrl || order.manualPaymentReference);
  const paymentStatusLabel = getPaymentLabel(order.paymentStatus, paymentProofAvailable);
  const firstItem = order.items[0] || null;
  const commercialItemName = firstItem?.productType || null;
  const comboPricing = getComboPricing(commercialItemName);
  const fallbackQuantity = firstItem?.quantity || 0;
  const commercialQuantity = comboPricing?.commercialQuantity ?? fallbackQuantity;
  const commercialUnitPrice = comboPricing?.price ?? firstItem?.unitPrice ?? 0;
  const commercialTotal = comboPricing?.price ? comboPricing.price * commercialQuantity : firstItem?.totalPrice ?? 0;
  const comboMultiplier = comboPricing?.unitsPerCombo ?? getComboMultiplier(commercialItemName);
  const operationalProductCode = commercialItemName?.toUpperCase().startsWith("COMBO_")
    ? "PRP-FG-STICKER"
    : commercialItemName?.toUpperCase().includes("STICKER")
      ? "PRP-FG-STICKER"
      : null;
  const operationalProductName = operationalProductCode === "PRP-FG-STICKER"
    ? "Sticker PreRescatePTY"
    : commercialItemName;
  const operationalQuantity = commercialQuantity * comboMultiplier;
  const canApprovePayment = paymentProofAvailable && order.adminReviewStatus !== "approved" && order.adminReviewStatus !== "rejected";
  const canRejectPayment = paymentProofAvailable && order.adminReviewStatus !== "approved" && order.adminReviewStatus !== "rejected";
  const canArchiveOrder = order.orderStatus !== "cancelled" && order.orderStatus !== "completed";
  const canAcceptOrder = order.orderStatus === "pending" || order.orderStatus === "processing";
  const canRejectOrder = order.orderStatus === "pending" || order.orderStatus === "processing";
  const canReserveInternalLabel =
    canAcceptOrder && (order.paymentStatus === "paid" || order.adminReviewStatus === "approved" || paymentProofAvailable);
  const canSendToProduction = canReserveInternalLabel && order.orderStatus !== "cancelled" && order.orderStatus !== "completed";
  const canCreateDispatch = canSendToProduction && paymentStatusLabel !== "Pago pendiente";
  const blockedReasons = getBlockedReasons(order, paymentProofAvailable);

  return {
    id: order.id,
    sourceOrderId: order.id,
    displayOrderCode,
    operationsReferenceCode,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    channel: order.provider,
    deliveryReference: order.providerReference || null,
    orderStatus: order.orderStatus,
    orderStatusLabel: getOrderStatusLabel(order.orderStatus),
    paymentStatus: order.paymentStatus,
    paymentStatusLabel,
    paymentProofUrl: order.paymentProofUrl,
    paymentProofAvailable,
    paymentMethod: order.paymentMethod,
    paymentSubmittedAt: paymentProofAvailable ? order.updatedAt.toISOString() : null,
    paymentRejectedReason: order.adminReviewStatus === "rejected" ? order.adminReviewNotes : null,
    commercialItemName,
    commercialQuantity,
    commercialUnitPrice,
    commercialTotal,
    operationalProductName,
    operationalProductCode,
    operationalQuantity,
    total: order.amount,
    currency: order.currency || "USD",
    reservedUnits: [],
    productionOrder: null,
    dispatch: null,
    canApprovePayment,
    canRejectPayment,
    canAcceptOrder,
    canRejectOrder,
    canArchiveOrder,
    canReserveInternalLabel,
    canSendToProduction,
    canCreateDispatch,
    blockedReasons,
  };
}

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
  user?: {
    email?: string | null;
    phone?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
  dispatch?: {
    id: string;
    code: string;
    status: string;
  } | null;
  reservedUnits?: Array<{
    id: string;
    internalLabel?: string | null;
    shortCode?: string | null;
    status?: string | null;
    qaStatus?: string | null;
    inventoryStatus?: string | null;
    activationStatus?: string | null;
  }>;
  items: OperationsOrderItem[];
};

export type OperationsOrderViewModel = {
  id: string;
  sourceOrderId?: string;
  operationOrderId?: string;
  orderSource: "legacy_order" | "commercial_order";
  orderKind: "customer_order" | "internal_replenishment";
  isCustomerOrder: boolean;
  isInternalOrder: boolean;
  sourceModel: "Order" | "OperationCommercialOrder";
  displayOrderCode: string;
  operationsReferenceCode: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingNotes?: string | null;
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
    status?: string | null;
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
  canSoftDeleteOrder: boolean;
  softDeleteLabel: string;
  softDeleteHelpText: string;
  canPermanentDeleteOrder: boolean;
  permanentDeleteLabel: string;
  deleteRiskLevel: "normal" | "restricted" | "blocked";
  deleteBlockedReason: string | null;
  requiresAction: boolean;
  pendingCategory:
    | "payment_review"
    | "payment_missing"
    | "reservation_needed"
    | "dispatch_needed"
    | "production_active"
    | "blocked"
    | null;
  pendingReasonLabel: string | null;
  pendingPriority: number | null;
  blockedReasons: string[];
};

function getPaymentLabel(paymentStatus: string, paymentProofAvailable: boolean) {
  if (paymentStatus === "rejected") return "Pago rechazado";
  if (paymentStatus === "paid") return "Pago aprobado";
  if (paymentProofAvailable || paymentStatus === "under_review") return "Pago en revisión";
  return "Pago pendiente";
}

function getCustomerFallbackName(order: OperationsOrderInput) {
  const profileName = [order.user?.profile?.firstName, order.user?.profile?.lastName].filter(Boolean).join(" ").trim();
  return profileName || order.customerName || "Sin cliente";
}

function getOrderStatusLabel(orderStatus: string) {
  switch (orderStatus) {
    case "pending":
      return "Pago pendiente";
    case "accepted":
      return "Pago aprobado / pendiente de reserva";
    case "processing":
      return "En despacho / pendiente de preparación";
    case "shipped":
      return "Pedido enviado";
    case "completed":
      return "Pedido entregado";
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
  if (order.orderStatus === "completed") reasons.push("Pedido entregado");
  if (!paymentProofAvailable && order.paymentStatus !== "paid") reasons.push("Sin comprobante");
  if (order.paymentStatus === "rejected") reasons.push("Pago rechazado");
  if (order.adminReviewStatus === "rejected") reasons.push("Revisión rechazada");

  return reasons;
}

function detectTestOrderSignals(order: OperationsOrderInput) {
  const haystack = [
    order.orderNumber,
    order.providerReference,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.manualPaymentReference,
    order.adminReviewNotes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /test|prueba|demo|seed|sandbox|mock|fake/.test(haystack);
}

function isTerminalProductionStatus(status?: string | null) {
  return ["completed", "failed", "cancelled"].includes((status || "").toLowerCase());
}

function getOrderClassification(order: OperationsOrderInput) {
  const isCommercialOrder = order.orderNumber.startsWith("OP-");
  const fallbackInternal = order.orderNumber.startsWith("INT-");
  const orderKind: "customer_order" | "internal_replenishment" =
    order.orderType === "internal_replenishment" || fallbackInternal ? "internal_replenishment" : "customer_order";

  return {
    orderSource: (isCommercialOrder ? "commercial_order" : "legacy_order") as "legacy_order" | "commercial_order",
    orderKind,
    isCustomerOrder: orderKind === "customer_order",
    isInternalOrder: orderKind === "internal_replenishment",
    sourceModel: isCommercialOrder ? ("OperationCommercialOrder" as const) : ("Order" as const),
  };
}

function getPendingState(order: OperationsOrderInput, paymentProofAvailable: boolean) {
  const paymentStatus = (order.paymentStatus || "").toLowerCase();
  const reservedUnits = order.reservedUnits || [];
  const hasReservedUnits = reservedUnits.length > 0;
  const isInternal = order.orderType === "internal_replenishment" || order.orderNumber.startsWith("INT-");
  const isTerminal = order.orderStatus === "completed" || order.orderStatus === "cancelled";

  if (isTerminal) {
    return { requiresAction: false, pendingCategory: null, pendingReasonLabel: null, pendingPriority: null };
  }

  if (isInternal) {
    const productionActive = !isTerminalProductionStatus(order.dispatch?.status) && order.orderStatus !== "completed" && order.orderStatus !== "cancelled";
    if (productionActive) {
      return {
        requiresAction: true,
        pendingCategory: "production_active" as const,
        pendingReasonLabel: "Producción interna en curso",
        pendingPriority: 3,
      };
    }
  }

  if (paymentStatus === "under_review" || paymentStatus === "payment_review" || paymentStatus === "pending_review" || order.adminReviewStatus === "pending") {
    return {
      requiresAction: true,
      pendingCategory: "payment_review" as const,
      pendingReasonLabel: "Revisar comprobante de pago",
      pendingPriority: 1,
    };
  }

  if (paymentStatus === "pending" && !paymentProofAvailable) {
    return {
      requiresAction: true,
      pendingCategory: "payment_missing" as const,
      pendingReasonLabel: "Pago pendiente",
      pendingPriority: 1,
    };
  }

  const canReserve = Boolean(order.paymentStatus === "paid" || order.adminReviewStatus === "approved" || paymentProofAvailable);
  if (!isInternal && canReserve && !hasReservedUnits) {
    return {
      requiresAction: true,
      pendingCategory: "reservation_needed" as const,
      pendingReasonLabel: "Reservar unidad física",
      pendingPriority: 2,
    };
  }

  if (!isInternal && hasReservedUnits && !order.dispatch) {
    return {
      requiresAction: true,
      pendingCategory: "dispatch_needed" as const,
      pendingReasonLabel: "Enviar a despacho",
      pendingPriority: 2,
    };
  }

  return { requiresAction: false, pendingCategory: null, pendingReasonLabel: null, pendingPriority: null };
}

export function buildOperationsOrderViewModel(order: OperationsOrderInput): OperationsOrderViewModel {
  const classification = getOrderClassification(order);
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
  const customerName = order.customerName || getCustomerFallbackName(order);
  const customerEmail = order.customerEmail || order.user?.email || null;
  const customerPhone = order.customerPhone || order.user?.phone || null;
  const firstItem = order.items[0] || null;
  const commercialItemName = firstItem?.productType || null;
  const comboPricing = getComboPricing(commercialItemName);
  const fallbackQuantity = firstItem?.quantity || 0;
  const commercialQuantity = comboPricing?.commercialQuantity ?? fallbackQuantity;
  const commercialUnitPrice = comboPricing?.price ?? firstItem?.unitPrice ?? 0;
  const commercialTotal = comboPricing?.price ? comboPricing.price * commercialQuantity : firstItem?.totalPrice ?? 0;
  const amount = order.amount || commercialTotal;
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
  const isCancelled = order.orderStatus === "cancelled";
  const canApprovePayment = !isCancelled && paymentProofAvailable && order.adminReviewStatus !== "approved" && order.adminReviewStatus !== "rejected";
  const canRejectPayment = !isCancelled && paymentProofAvailable && order.adminReviewStatus !== "approved" && order.adminReviewStatus !== "rejected";
  const canArchiveOrder = order.orderStatus !== "cancelled" && order.orderStatus !== "completed";
  const canAcceptOrder = order.orderStatus === "pending" || order.orderStatus === "processing" || order.orderStatus === "accepted";
  const canRejectOrder = order.orderStatus === "pending" || order.orderStatus === "processing" || order.orderStatus === "accepted";
  const hasReservedUnits = (order.reservedUnits || []).length > 0;
  const isPaymentApproved = order.paymentStatus === "paid" || order.adminReviewStatus === "approved";
  const canReserveInternalLabel =
    order.provider === "manual" &&
    isPaymentApproved &&
    !hasReservedUnits &&
    order.orderStatus !== "cancelled" &&
    order.orderStatus !== "completed";
  const canSendToProduction = canReserveInternalLabel && order.orderStatus !== "cancelled" && order.orderStatus !== "completed";
  const canCreateDispatch = Boolean(order.dispatch) === false && hasReservedUnits && isPaymentApproved && order.orderStatus !== "cancelled" && order.orderStatus !== "completed";
  const blockedReasons = getBlockedReasons(order, paymentProofAvailable);
  const pendingState = getPendingState(order, paymentProofAvailable);
  const testSignals = detectTestOrderSignals(order);
  const isTerminal = order.orderStatus === "cancelled" || order.orderStatus === "completed";
  const canSoftDeleteOrder = !isTerminal || testSignals;
  const softDeleteLabel = "Cancelar / ocultar";
  const softDeleteHelpText = "No borra físicamente. Cancela u oculta el pedido de la vista operativa y registra auditoría.";
  const canPermanentDeleteOrder = testSignals && isTerminal;
  const permanentDeleteLabel = "Eliminar permanentemente";
  const deleteRiskLevel: "normal" | "restricted" | "blocked" = canSoftDeleteOrder
    ? testSignals
      ? "restricted"
      : "normal"
    : "blocked";
  const deleteBlockedReason = !canSoftDeleteOrder
    ? "El pedido ya está finalizado y no puede ocultarse desde Pedidos."
    : null;

  return {
    id: order.id,
    sourceOrderId: order.id,
    orderSource: classification.orderSource,
    orderKind: classification.orderKind,
    isCustomerOrder: classification.isCustomerOrder,
    isInternalOrder: classification.isInternalOrder,
    sourceModel: classification.sourceModel,
    displayOrderCode,
    operationsReferenceCode,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress: order.shippingAddress || null,
    shippingCity: order.shippingCity || null,
    shippingNotes: order.shippingNotes || null,
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
    total: amount,
    currency: order.currency || "USD",
    reservedUnits: [],
    productionOrder: null,
    dispatch: null,
    canApprovePayment,
    canRejectPayment,
    canAcceptOrder,
    canRejectOrder,
    canArchiveOrder,
    canReserveInternalLabel: !isCancelled && canReserveInternalLabel,
    canSendToProduction: !isCancelled && canSendToProduction,
    canCreateDispatch: !isCancelled && canCreateDispatch,
    canSoftDeleteOrder,
    softDeleteLabel,
    softDeleteHelpText,
    canPermanentDeleteOrder,
    permanentDeleteLabel,
    deleteRiskLevel,
    deleteBlockedReason,
    requiresAction: pendingState.requiresAction,
    pendingCategory: pendingState.pendingCategory,
    pendingReasonLabel: pendingState.pendingReasonLabel,
    pendingPriority: pendingState.pendingPriority,
    blockedReasons,
  };
}

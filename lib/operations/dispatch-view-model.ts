import type { OperationDispatch, OperationDispatchItem, OperationDispatchEvent, OperationFinishedGoodUnit } from "@prisma/client";

export type DispatchViewModel = {
  id: string;
  code: string;
  orderId: string;
  orderCode: string;
  status: string;
  statusLabel: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  city?: string | null;
  address?: string | null;
  deliveryReference?: string | null;
  notes?: string | null;
  createdAt: string;
  scheduledAt?: string | null;
  preparedAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  carrierName?: string | null;
  trackingReference?: string | null;
  units: Array<{
    id: string;
    internalLabel: string;
    shortCode?: string | null;
    productCode: string;
    productName: string;
    inventoryStatus: string;
    activationStatus: string;
    picked: boolean;
    pickedAt?: string | null;
  }>;
  items: Array<{
    id: string;
    quantity: number;
  }>;
  allUnitsPicked: boolean;
  canMarkUnitPicked: boolean;
  canMarkPrepared: boolean;
  canMarkSent: boolean;
  canConfirmDelivery: boolean;
  blockedReasons: string[];
};

type DispatchLike = OperationDispatch & {
  items: Array<Pick<OperationDispatchItem, "id" | "quantity" | "unitId" | "internalLabel" | "productCode" | "productName" | "status" | "pickedAt"> & {
    unitRecord?: Pick<OperationFinishedGoodUnit, "id" | "internalLabel" | "productCode" | "productName" | "status" | "qaStatus" | "activationStatus"> | null;
  }>;
  events?: Array<Pick<OperationDispatchEvent, "metadataJson" | "referenceType" | "referenceId" | "createdAt">>;
  sourceOrder?: {
    id: string;
    orderNumber: string;
    providerReference?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    shippingCity?: string | null;
    shippingAddress?: string | null;
    shippingNotes?: string | null;
  } | null;
};

function parseMetadata(event: { metadataJson: string | null }) {
  if (!event.metadataJson) return null;
  try {
    return JSON.parse(event.metadataJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending_pick":
    case "pending_preparation":
    case "draft":
      return "Pendiente de preparación";
    case "prepared":
      return "Preparado";
    case "sent":
    case "shipped":
    case "dispatched":
      return "Enviado";
    case "delivered":
      return "Entregado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export function buildDispatchViewModel(dispatch: DispatchLike): DispatchViewModel {
  const orderedEvents = [...(dispatch.events || [])].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  const parsedEvents = orderedEvents.map((event) => ({ event, meta: parseMetadata(event) }));
  const eventMetas = parsedEvents.map((entry) => entry.meta).filter(Boolean) as Record<string, unknown>[];
  const sourceOrder = dispatch.sourceOrder || null;
  const isCustomerDispatch = dispatch.destinationType === "customer";

  const findMetaString = (...keys: string[]) => {
    for (const meta of eventMetas) {
      for (const key of keys) {
        const value = meta[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
    return null;
  };

  const liveOrderCode = sourceOrder?.providerReference?.trim()?.startsWith("PR-")
    ? sourceOrder.providerReference.trim()
    : sourceOrder?.orderNumber || null;
  const orderId = sourceOrder?.id || findMetaString("customerOrderId", "orderId") || "";
  const orderCode =
    liveOrderCode ||
    findMetaString("orderCode", "customerOrderCode", "commercialOrderCode") ||
    dispatch.destinationReference ||
    dispatch.code;
  const customerName = String(
    sourceOrder?.customerName || findMetaString("customerName") || dispatch.destinationName || (isCustomerDispatch ? "Sin cliente" : "Traslado logístico")
  );
  const customerEmail = sourceOrder?.customerEmail || findMetaString("customerEmail");
  const customerPhone = sourceOrder?.customerPhone || findMetaString("customerPhone");
  const city = sourceOrder?.shippingCity || findMetaString("shippingCity");
  const address = String(
    sourceOrder?.shippingAddress || findMetaString("shippingAddress") || dispatch.destinationAddress || ""
  );
  const deliveryReference = String(
    sourceOrder?.shippingNotes || findMetaString("shippingNotes") || dispatch.notes || dispatch.destinationReference || ""
  );

  // Persisted OperationDispatchItem state is authoritative. Event metadata is
  // only a compatibility fallback for dispatches created before pickedAt/status
  // became the canonical current-state fields.
  const legacyPickState = new Map<string, { picked: boolean; pickedAt: string | null }>();
  for (const { event, meta } of parsedEvents) {
    const unitId = typeof meta?.unitId === "string" ? meta.unitId : null;
    if (!unitId || legacyPickState.has(unitId)) continue;
    const picked = Boolean(meta?.picked);
    legacyPickState.set(unitId, {
      picked,
      pickedAt: picked
        ? typeof meta?.pickedAt === "string"
          ? meta.pickedAt
          : event.createdAt.toISOString()
        : null,
    });
  }

  const traceableItems = dispatch.items.filter((item) => Boolean(item.unitId || item.unitRecord));
  const units = traceableItems.map((item) => {
    const persistedPicked =
      Boolean(item.pickedAt) || ["picked", "packed", "dispatched", "delivered"].includes(item.status);
    const legacy = item.unitId ? legacyPickState.get(item.unitId) : undefined;
    const picked = persistedPicked || (!item.pickedAt && item.status === "pending_pick" && Boolean(legacy?.picked));
    const pickedAt = item.pickedAt?.toISOString() || (picked ? legacy?.pickedAt || null : null);

    return {
      id: item.unitId || item.id,
      internalLabel: item.internalLabel || item.unitRecord?.internalLabel || "Sin internalLabel",
      shortCode: null,
      productCode: item.productCode || item.unitRecord?.productCode || "",
      productName: item.productName || item.unitRecord?.productName || "",
      inventoryStatus: item.unitRecord?.status || item.status || "reserved",
      activationStatus: item.unitRecord?.activationStatus || "not_activated",
      picked,
      pickedAt,
    };
  });

  const allUnitsPicked = units.length === 0 || units.every((unit) => unit.picked);
  const canMarkUnitPicked = ["draft", "pending_pick", "pending_preparation"].includes(dispatch.status) && units.length > 0;
  const canMarkPrepared = ["draft", "pending_pick", "pending_preparation"].includes(dispatch.status) && allUnitsPicked;
  const canMarkSent = dispatch.status === "prepared";
  const canConfirmDelivery = ["sent", "shipped", "dispatched"].includes(dispatch.status);
  const blockedReasons: string[] = [];

  if (isCustomerDispatch) {
    if (!orderId) blockedReasons.push("Pedido origen no resuelto");
    if (!customerName || customerName === "Sin cliente") blockedReasons.push("Cliente no resuelto");
    if (!address) blockedReasons.push("Dirección no resuelta");
    if (units.length === 0) blockedReasons.push("Sin unidades físicas asignadas");
  }

  return {
    id: dispatch.id,
    code: dispatch.code,
    orderId: orderId || dispatch.id,
    orderCode,
    status: dispatch.status,
    statusLabel: getStatusLabel(dispatch.status),
    customerName,
    customerEmail,
    customerPhone,
    city,
    address: address || null,
    deliveryReference,
    notes: dispatch.notes,
    createdAt: dispatch.createdAt.toISOString(),
    scheduledAt: dispatch.scheduledAt ? dispatch.scheduledAt.toISOString() : null,
    preparedAt: findMetaString("preparedAt"),
    sentAt: dispatch.sentAt ? dispatch.sentAt.toISOString() : null,
    deliveredAt: dispatch.deliveredAt ? dispatch.deliveredAt.toISOString() : null,
    carrierName: dispatch.carrierName,
    trackingReference: dispatch.trackingReference,
    units,
    items: dispatch.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    })),
    allUnitsPicked,
    canMarkUnitPicked,
    canMarkPrepared,
    canMarkSent,
    canConfirmDelivery,
    blockedReasons,
  };
}

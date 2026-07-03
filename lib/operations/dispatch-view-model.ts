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
  items: Array<OperationDispatchItem & {
    unitRecord?: OperationFinishedGoodUnit | null;
  }>;
  events?: OperationDispatchEvent[];
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
      return "Pedido preparado";
    case "sent":
    case "shipped":
    case "dispatched":
      return "Pedido enviado";
    case "delivered":
      return "Pedido entregado";
    default:
      return status;
  }
}

export function buildDispatchViewModel(dispatch: DispatchLike): DispatchViewModel {
  const eventMetas = dispatch.events?.map(parseMetadata).filter(Boolean) || [];
  const firstEventMeta = eventMetas[0] || null;
  const pickedMap = new Map<string, string | null>();
  for (const meta of eventMetas) {
    const unitId = typeof meta?.unitId === "string" ? meta.unitId : null;
    if (!unitId) continue;
    const picked = Boolean(meta?.picked);
    pickedMap.set(unitId, picked ? (typeof meta?.pickedAt === "string" ? meta.pickedAt : new Date().toISOString()) : null);
  }
  const orderId = String(firstEventMeta?.orderId || firstEventMeta?.commercialOrderId || firstEventMeta?.referenceId || "");
  const orderCode = String(firstEventMeta?.orderCode || firstEventMeta?.commercialOrderCode || dispatch.destinationReference || dispatch.code);
  const customerName = String(firstEventMeta?.customerName || dispatch.destinationName || "Sin nombre");
  const customerEmail = firstEventMeta?.customerEmail as string | undefined;
  const customerPhone = firstEventMeta?.customerPhone as string | undefined;
  const city = firstEventMeta?.shippingCity as string | undefined;
  const address = String(firstEventMeta?.shippingAddress || dispatch.destinationAddress || "");
  const deliveryReference = String(firstEventMeta?.shippingNotes || dispatch.destinationReference || "");
  const units = dispatch.items.map((item) => {
    const pickedAt = item.unitId ? pickedMap.get(item.unitId) ?? null : null;
    const picked = Boolean(pickedAt) || item.status === "picked" || item.status === "packed" || item.status === "dispatched" || item.status === "delivered";
    return {
      id: item.unitId || item.id,
      internalLabel: item.internalLabel || item.unitRecord?.internalLabel || "Sin internalLabel",
      shortCode: null,
      productCode: item.productCode || item.unitRecord?.productCode || "",
      productName: item.productName || item.unitRecord?.productName || "",
      inventoryStatus: item.unitRecord?.status || item.status || "reserved",
      activationStatus: item.unitRecord?.activationStatus || "not_activated",
      picked,
      pickedAt: pickedAt || (item.pickedAt ? item.pickedAt.toISOString() : null),
    };
  });
  const allUnitsPicked = units.length > 0 && units.every((unit) => unit.picked);
  const canMarkUnitPicked = ["draft", "pending_pick", "pending_preparation", "prepared"].includes(dispatch.status);
  const canMarkPrepared = ["draft", "pending_pick", "pending_preparation"].includes(dispatch.status) && allUnitsPicked;
  const canMarkSent = dispatch.status === "prepared";
  const canConfirmDelivery = ["sent", "shipped", "dispatched"].includes(dispatch.status);
  const blockedReasons: string[] = [];
  if (!orderId) blockedReasons.push("Pedido origen no resuelto");
  if (!customerName || customerName === "Sin nombre") blockedReasons.push("Cliente no resuelto");
  if (!address) blockedReasons.push("Dirección no resuelta");

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
    preparedAt: firstEventMeta?.preparedAt ? String(firstEventMeta.preparedAt) : null,
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

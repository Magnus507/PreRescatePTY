import { z } from "zod";

export const COMMERCIAL_ORDER_STATUSES = [
  "draft",
  "confirmed",
  "cancelled",
] as const;

export const COMMERCIAL_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "refunded",
] as const;

export const COMMERCIAL_FULFILLMENT_STATUSES = [
  "pending",
  "reserved",
  "requested",
] as const;

export const COMMERCIAL_CUSTOMER_TYPES = [
  "customer",
  "enterprise",
  "internal",
  "organization",
  "point_of_sale",
  "other",
] as const;

export const COMMERCIAL_ORDER_EVENT_TYPES = [
  "CREATED",
  "CONFIRMED",
  "PAYMENT_PENDING",
  "PAID",
  "RESERVED",
  "FULFILLMENT_REQUESTED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type CommercialOrderEventType = (typeof COMMERCIAL_ORDER_EVENT_TYPES)[number];

export function isValidCommercialOrderEventType(
  value: string
): value is CommercialOrderEventType {
  return COMMERCIAL_ORDER_EVENT_TYPES.includes(value as CommercialOrderEventType);
}

const CommercialOrderItemSchema = z.object({
  finishedGoodId: z.string().trim().min(1, "finishedGoodId es requerido").optional().nullable(),
  productCode: z.string().trim().max(80, "productCode es demasiado largo").optional().nullable(),
  productName: z.string().trim().min(1, "productName es requerido").max(180, "productName es demasiado largo"),
  quantity: z.coerce.number().positive("quantity debe ser positivo"),
  unitPrice: z.coerce.number().min(0, "unitPrice no puede ser negativo"),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo").optional(),
  notes: z.string().trim().max(1000, "notes es demasiado largo").optional().nullable(),
});

export const CreateCommercialOrderSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  status: z.enum(COMMERCIAL_ORDER_STATUSES).optional(),
  customerType: z.enum(COMMERCIAL_CUSTOMER_TYPES).optional(),
  customerName: z.string().trim().max(180, "customerName es demasiado largo").optional().nullable(),
  customerEmail: z.string().trim().email("customerEmail invalido").max(180, "customerEmail es demasiado largo").optional().nullable(),
  customerPhone: z.string().trim().max(60, "customerPhone es demasiado largo").optional().nullable(),
  customerReference: z.string().trim().max(180, "customerReference es demasiado largo").optional().nullable(),
  salesChannel: z.string().trim().min(1, "salesChannel es requerido").max(80, "salesChannel es demasiado largo").optional(),
  paymentStatus: z.enum(COMMERCIAL_PAYMENT_STATUSES).optional(),
  fulfillmentStatus: z.enum(COMMERCIAL_FULFILLMENT_STATUSES).optional(),
  currency: z.string().trim().min(1, "currency es requerido").max(12, "currency es demasiado largo").optional(),
  dispatchId: z.string().trim().min(1, "dispatchId es requerido").optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
  items: z.array(CommercialOrderItemSchema).min(1, "items no puede estar vacio"),
});

export const CreateCommercialOrderEventSchema = z.object({
  eventType: z.string().trim().refine(isValidCommercialOrderEventType, {
    message: "eventType invalido",
  }),
  amount: z.coerce.number().min(0, "amount no puede ser negativo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  referenceType: z.string().trim().max(80, "referenceType es demasiado largo").optional().nullable(),
  referenceId: z.string().trim().max(160, "referenceId es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
});

export function calculateCommercialOrderTotal(
  items: Array<{ quantity: number; unitPrice: number }>
) {
  return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

export function resolveCommercialOrderItemKey(item: {
  finishedGoodId: string | null;
  productCode: string | null;
  finishedGood?: { code: string; productType: string } | null;
}) {
  return item.finishedGood?.code || item.productCode || item.finishedGoodId || "";
}

export function getCommercialOrderItemProductType(item: {
  finishedGood?: { productType: string } | null;
  productCode: string | null;
}) {
  return item.finishedGood?.productType || item.productCode || "";
}

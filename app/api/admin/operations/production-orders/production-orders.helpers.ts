import { z } from "zod";

export const PRODUCTION_ORDER_STATUSES = [
  "draft",
  "planned",
  "started",
  "paused",
  "completed",
  "cancelled",
] as const;

export const PRODUCTION_EVENT_TYPES = [
  "CREATED",
  "PLANNED",
  "STARTED",
  "MATERIAL_ISSUED",
  "PRODUCED",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "DIGITAL_PREPARATION_CREATED",
  "DIGITAL_ITEM_ASSIGNED",
  "NFC_PROGRAMMED",
  "QR_PREPARED",
  "DIGITAL_PREPARATION_COMPLETED",
] as const;

export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number];
export type ProductionEventType = (typeof PRODUCTION_EVENT_TYPES)[number];

export function isValidProductionOrderStatus(
  value: string
): value is ProductionOrderStatus {
  return PRODUCTION_ORDER_STATUSES.includes(value as ProductionOrderStatus);
}

export function isValidProductionEventType(
  value: string
): value is ProductionEventType {
  return PRODUCTION_EVENT_TYPES.includes(value as ProductionEventType);
}

const CreateProductionOrderItemSchema = z.object({
  materialId: z.string().trim().min(1, "materialId es requerido"),
  plannedQuantity: z.coerce
    .number()
    .finite("plannedQuantity debe ser numerico")
    .positive("plannedQuantity debe ser positivo"),
  consumedQuantity: z.coerce
    .number()
    .finite("consumedQuantity debe ser numerico")
    .min(0, "consumedQuantity no puede ser negativo")
    .optional(),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo"),
});

export const CreateProductionOrderSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  title: z.string().trim().min(1, "title es requerido").max(180, "title es demasiado largo"),
  status: z
    .string()
    .trim()
    .refine(isValidProductionOrderStatus, { message: "status invalido" })
    .optional(),
  plannedQuantity: z.coerce
    .number()
    .finite("plannedQuantity debe ser numerico")
    .positive("plannedQuantity debe ser positivo"),
  producedQuantity: z.coerce
    .number()
    .finite("producedQuantity debe ser numerico")
    .min(0, "producedQuantity no puede ser negativo")
    .optional(),
  productType: z.string().trim().max(120, "productType es demasiado largo").optional(),
  outputType: z.string().trim().max(120, "outputType es demasiado largo").optional(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
  items: z.array(CreateProductionOrderItemSchema).optional(),
}).superRefine((value, ctx) => {
  if (!value.productType && !value.outputType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["outputType"],
      message: "outputType es requerido",
    });
  }
});

export const CreateProductionEventSchema = z.object({
  eventType: z.string().trim().refine(isValidProductionEventType, {
    message: "eventType invalido",
  }),
  quantity: z.coerce
    .number()
    .finite("quantity debe ser numerico")
    .positive("quantity debe ser positivo")
    .optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

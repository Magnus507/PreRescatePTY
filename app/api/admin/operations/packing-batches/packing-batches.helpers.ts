import { z } from "zod";

export const PACKING_BATCH_STATUSES = [
  "draft",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const PACKING_EVENT_TYPES = [
  "CREATED",
  "STARTED",
  "PACKED",
  "REJECTED",
  "LABEL_PRINTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type PackingBatchStatus = (typeof PACKING_BATCH_STATUSES)[number];
export type PackingEventType = (typeof PACKING_EVENT_TYPES)[number];

export function isValidPackingEventType(value: string): value is PackingEventType {
  return PACKING_EVENT_TYPES.includes(value as PackingEventType);
}

export const CreatePackingBatchSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  productionOrderId: z.string().trim().min(1, "productionOrderId es requerido").optional().nullable(),
  qcInspectionId: z.string().trim().min(1, "qcInspectionId es requerido").optional().nullable(),
  packageType: z.string().trim().min(1, "packageType es requerido").max(80, "packageType es demasiado largo").optional(),
  plannedQuantity: z.coerce.number().int("plannedQuantity debe ser entero").min(0, "plannedQuantity no puede ser negativo").optional(),
  labelCode: z.string().trim().max(120, "labelCode es demasiado largo").optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
});

export const CreatePackingEventSchema = z.object({
  eventType: z.string().trim().refine(isValidPackingEventType, {
    message: "eventType invalido",
  }),
  quantity: z.coerce.number().int("quantity debe ser entero").positive("quantity debe ser positivo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
}).superRefine((value, ctx) => {
  if ((value.eventType === "PACKED" || value.eventType === "REJECTED") && !value.quantity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantity"],
      message: `${value.eventType} requiere quantity positivo`,
    });
  }
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

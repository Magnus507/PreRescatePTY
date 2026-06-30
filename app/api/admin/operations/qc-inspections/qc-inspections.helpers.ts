import { z } from "zod";

export const QC_INSPECTION_STATUSES = [
  "pending",
  "in_progress",
  "rework_required",
  "completed",
  "cancelled",
] as const;

export const QC_EVENT_TYPES = [
  "CREATED",
  "STARTED",
  "PASSED",
  "FAILED",
  "REWORK_REQUIRED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type QcInspectionStatus = (typeof QC_INSPECTION_STATUSES)[number];
export type QcEventType = (typeof QC_EVENT_TYPES)[number];

export function isValidQcEventType(value: string): value is QcEventType {
  return QC_EVENT_TYPES.includes(value as QcEventType);
}

export const CreateQcInspectionSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  productionOrderId: z.string().trim().min(1, "productionOrderId es requerido").optional().nullable(),
  inspectionType: z.string().trim().min(1, "inspectionType es requerido").max(80, "inspectionType es demasiado largo").optional(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
});

export const CreateQcInspectionEventSchema = z.object({
  eventType: z.string().trim().refine(isValidQcEventType, {
    message: "eventType invalido",
  }),
  quantity: z.coerce.number().int("quantity debe ser entero").positive("quantity debe ser positivo").optional(),
  passedQuantity: z.coerce.number().int("passedQuantity debe ser entero").positive("passedQuantity debe ser positivo").optional(),
  failedQuantity: z.coerce.number().int("failedQuantity debe ser entero").positive("failedQuantity debe ser positivo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.eventType === "PASSED" && !value.quantity && !value.passedQuantity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantity"],
      message: "PASSED requiere quantity o passedQuantity positivo",
    });
  }

  if (value.eventType === "FAILED" && !value.quantity && !value.failedQuantity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantity"],
      message: "FAILED requiere quantity o failedQuantity positivo",
    });
  }
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

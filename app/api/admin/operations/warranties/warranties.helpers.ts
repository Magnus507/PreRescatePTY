import { z } from "zod";

export const WARRANTY_STATUSES = [
  "active",
  "suspended",
  "expired",
  "cancelled",
] as const;

export const WARRANTY_COVERAGE_STATUSES = [
  "valid",
  "expired",
  "claim_open",
  "claim_closed",
] as const;

export const WARRANTY_EVENT_TYPES = [
  "CREATED",
  "OPENED",
  "ACTIVATED",
  "SUSPENDED",
  "EXPIRED",
  "CLAIM_OPENED",
  "CLAIM_CLOSED",
  "CANCELLED",
] as const;

export type WarrantyEventType = (typeof WARRANTY_EVENT_TYPES)[number];

export function isValidWarrantyEventType(value: string): value is WarrantyEventType {
  return WARRANTY_EVENT_TYPES.includes(value as WarrantyEventType);
}

export const CreateWarrantySchema = z
  .object({
    code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
    status: z.enum(WARRANTY_STATUSES).optional(),
    warrantyType: z.string().trim().min(1, "warrantyType es requerido").max(80, "warrantyType es demasiado largo").optional(),
    coverageStatus: z.enum(WARRANTY_COVERAGE_STATUSES).optional(),
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    customerName: z.string().trim().max(180, "customerName es demasiado largo").optional().nullable(),
    customerEmail: z.string().trim().email("customerEmail invalido").max(180, "customerEmail es demasiado largo").optional().nullable(),
    customerPhone: z.string().trim().max(60, "customerPhone es demasiado largo").optional().nullable(),
    serialReference: z.string().trim().max(180, "serialReference es demasiado largo").optional().nullable(),
    unitId: z.string().trim().min(1, "unitId es requerido").optional().nullable(),
    internalLabel: z.string().trim().max(160, "internalLabel es demasiado largo").optional().nullable(),
    productCode: z.string().trim().max(80, "productCode es demasiado largo").optional().nullable(),
    productName: z.string().trim().max(160, "productName es demasiado largo").optional().nullable(),
    reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
    commercialOrderId: z.string().trim().min(1, "commercialOrderId es requerido").optional().nullable(),
    commercialOrderItemId: z.string().trim().min(1, "commercialOrderItemId es requerido").optional().nullable(),
    finishedGoodId: z.string().trim().min(1, "finishedGoodId es requerido").optional().nullable(),
    dispatchId: z.string().trim().min(1, "dispatchId es requerido").optional().nullable(),
    notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate debe ser posterior a startDate",
      });
    }
  });

export const CreateWarrantyEventSchema = z.object({
  eventType: z.string().trim().refine(isValidWarrantyEventType, {
    message: "eventType invalido",
  }),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  referenceType: z.string().trim().max(80, "referenceType es demasiado largo").optional().nullable(),
  referenceId: z.string().trim().max(160, "referenceId es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

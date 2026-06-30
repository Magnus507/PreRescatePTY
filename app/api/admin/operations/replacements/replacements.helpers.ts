import { z } from "zod";

export const REPLACEMENT_STATUSES = [
  "draft",
  "approved",
  "rejected",
  "prepared",
  "completed",
  "cancelled",
] as const;

export const REPLACEMENT_EVENT_TYPES = [
  "CREATED",
  "APPROVED",
  "REJECTED",
  "REPLACEMENT_PREPARED",
  "DISPATCH_CREATED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ReplacementEventType = (typeof REPLACEMENT_EVENT_TYPES)[number];

export function isValidReplacementEventType(value: string): value is ReplacementEventType {
  return REPLACEMENT_EVENT_TYPES.includes(value as ReplacementEventType);
}

export const CreateReplacementSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  status: z.enum(REPLACEMENT_STATUSES).optional(),
  replacementType: z.string().trim().min(1, "replacementType es requerido").max(80, "replacementType es demasiado largo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  customerName: z.string().trim().max(180, "customerName es demasiado largo").optional().nullable(),
  customerEmail: z.string().trim().email("customerEmail invalido").max(180, "customerEmail es demasiado largo").optional().nullable(),
  customerPhone: z.string().trim().max(60, "customerPhone es demasiado largo").optional().nullable(),
  warrantyId: z.string().trim().min(1, "warrantyId es requerido").optional().nullable(),
  commercialOrderId: z.string().trim().min(1, "commercialOrderId es requerido").optional().nullable(),
  originalFinishedGoodId: z.string().trim().min(1, "originalFinishedGoodId es requerido").optional().nullable(),
  replacementFinishedGoodId: z.string().trim().min(1, "replacementFinishedGoodId es requerido").optional().nullable(),
  originalDispatchId: z.string().trim().min(1, "originalDispatchId es requerido").optional().nullable(),
  replacementDispatchId: z.string().trim().min(1, "replacementDispatchId es requerido").optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
});

export const CreateReplacementEventSchema = z.object({
  eventType: z.string().trim().refine(isValidReplacementEventType, {
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

import { z } from "zod";

export const RETURN_STATUSES = [
  "draft",
  "received",
  "inspected",
  "discarded",
  "completed",
  "cancelled",
] as const;

export const RETURN_EVENT_TYPES = [
  "CREATED",
  "RECEIVED",
  "INSPECTED",
  "ACCEPTED",
  "REJECTED",
  "RETURNED_TO_INVENTORY",
  "DISCARDED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ReturnEventType = (typeof RETURN_EVENT_TYPES)[number];

export function isValidReturnEventType(value: string): value is ReturnEventType {
  return RETURN_EVENT_TYPES.includes(value as ReturnEventType);
}

export const CreateReturnSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  status: z.enum(RETURN_STATUSES).optional(),
  returnType: z.string().trim().min(1, "returnType es requerido").max(80, "returnType es demasiado largo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  resolution: z.string().trim().max(1000, "resolution es demasiado largo").optional().nullable(),
  customerName: z.string().trim().max(180, "customerName es demasiado largo").optional().nullable(),
  customerEmail: z.string().trim().email("customerEmail invalido").max(180, "customerEmail es demasiado largo").optional().nullable(),
  customerPhone: z.string().trim().max(60, "customerPhone es demasiado largo").optional().nullable(),
  warrantyId: z.string().trim().min(1, "warrantyId es requerido").optional().nullable(),
  replacementId: z.string().trim().min(1, "replacementId es requerido").optional().nullable(),
  commercialOrderId: z.string().trim().min(1, "commercialOrderId es requerido").optional().nullable(),
  finishedGoodId: z.string().trim().min(1, "finishedGoodId es requerido").optional().nullable(),
  originalDispatchId: z.string().trim().min(1, "originalDispatchId es requerido").optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
});

export const CreateReturnEventSchema = z.object({
  eventType: z.string().trim().refine(isValidReturnEventType, {
    message: "eventType invalido",
  }),
  quantity: z.coerce.number().int("quantity debe ser entero").positive("quantity debe ser positivo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  referenceType: z.string().trim().max(80, "referenceType es demasiado largo").optional().nullable(),
  referenceId: z.string().trim().max(160, "referenceId es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

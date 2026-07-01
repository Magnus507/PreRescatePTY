import { z } from "zod";

export const FINISHED_GOOD_STATUSES = ["active", "inactive", "reserved"] as const;

export const FINISHED_GOOD_EVENT_TYPES = [
  "RECEIPT",
  "RESERVATION",
  "RELEASE",
  "ISSUE",
  "ADJUSTMENT",
  "RETURN",
] as const;

export type FinishedGoodEventType = (typeof FINISHED_GOOD_EVENT_TYPES)[number];

export function isValidFinishedGoodEventType(value: string): value is FinishedGoodEventType {
  return FINISHED_GOOD_EVENT_TYPES.includes(value as FinishedGoodEventType);
}

export function calculateFinishedGoodBalance(
  events: Array<{ eventType: string; quantity: number }>
) {
  return events.reduce((balance, event) => {
    if (
      event.eventType === "RECEIPT" ||
      event.eventType === "RELEASE" ||
      event.eventType === "RETURN" ||
      event.eventType === "ADJUSTMENT"
    ) {
      return balance + event.quantity;
    }

    if (event.eventType === "RESERVATION" || event.eventType === "ISSUE") {
      return balance - event.quantity;
    }

    return balance;
  }, 0);
}

export const CreateFinishedGoodSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  name: z.string().trim().min(1, "name es requerido").max(160, "name es demasiado largo"),
  productType: z.string().trim().min(1, "productType es requerido").max(80, "productType es demasiado largo"),
  status: z.enum(FINISHED_GOOD_STATUSES).optional(),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo").optional(),
  packingBatchId: z.string().trim().min(1, "packingBatchId es requerido").optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
  initialQuantity: z.coerce.number().positive("initialQuantity debe ser positivo").optional(),
});

export const UpdateFinishedGoodSchema = z.object({
  name: z.string().trim().min(1, "name es requerido").max(160, "name es demasiado largo").optional(),
  productType: z.string().trim().min(1, "productType es requerido").max(80, "productType es demasiado largo").optional(),
  status: z.enum(FINISHED_GOOD_STATUSES).optional(),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo").optional(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
});

export const CreateFinishedGoodEventSchema = z.object({
  eventType: z.string().trim().refine(isValidFinishedGoodEventType, {
    message: "eventType invalido",
  }),
  quantity: z.coerce.number(),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  referenceType: z.string().trim().max(80, "referenceType es demasiado largo").optional().nullable(),
  referenceId: z.string().trim().max(160, "referenceId es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.eventType === "ADJUSTMENT") {
    if (value.quantity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "ADJUSTMENT requiere quantity distinto de 0",
      });
    }
    return;
  }

  if (value.quantity <= 0) {
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

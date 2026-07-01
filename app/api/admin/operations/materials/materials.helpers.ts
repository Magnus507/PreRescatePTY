import { z } from "zod";

export const MATERIAL_EVENT_TYPES = [
  "RECEIPT",
  "ISSUE",
  "ADJUSTMENT",
  "RESERVATION",
  "RELEASE",
] as const;

export type MaterialEventType = (typeof MATERIAL_EVENT_TYPES)[number];

export type MaterialEventForBalance = {
  eventType: string;
  quantity: number;
};

export function isValidMaterialEventType(value: string): value is MaterialEventType {
  return MATERIAL_EVENT_TYPES.includes(value as MaterialEventType);
}

export function calculateMaterialBalance(events: MaterialEventForBalance[]): number {
  return events.reduce((balance, event) => {
    if (event.eventType === "RECEIPT" || event.eventType === "RELEASE") {
      return balance + event.quantity;
    }

    if (event.eventType === "ISSUE" || event.eventType === "RESERVATION") {
      return balance - event.quantity;
    }

    if (event.eventType === "ADJUSTMENT") {
      return balance + event.quantity;
    }

    return balance;
  }, 0);
}

export const CreateMaterialSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  name: z.string().trim().min(1, "name es requerido").max(180, "name es demasiado largo"),
  category: z.string().trim().min(1, "category es requerido").max(120, "category es demasiado largo"),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo"),
  description: z.string().trim().max(1000, "description es demasiado largo").optional().nullable(),
  supplierName: z.string().trim().max(180, "supplierName es demasiado largo").optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
  status: z.string().trim().max(40, "status es demasiado largo").optional(),
});

export const UpdateMaterialSchema = z.object({
  name: z.string().trim().min(1, "name es requerido").max(180, "name es demasiado largo").optional(),
  category: z.string().trim().min(1, "category es requerido").max(120, "category es demasiado largo").optional(),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo").optional(),
  description: z.string().trim().max(1000, "description es demasiado largo").optional().nullable(),
  supplierName: z.string().trim().max(180, "supplierName es demasiado largo").optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
  status: z.string().trim().min(1, "status es requerido").max(40, "status es demasiado largo").optional(),
});

export const CreateMaterialEventSchema = z.object({
  eventType: z.string().trim().refine(isValidMaterialEventType, {
    message: "eventType invalido",
  }),
  quantity: z.coerce.number().finite("quantity debe ser numerico"),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo"),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  referenceType: z.string().trim().max(80, "referenceType es demasiado largo").optional().nullable(),
  referenceId: z.string().trim().max(180, "referenceId es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.eventType === "ADJUSTMENT") {
    if (value.quantity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "quantity no puede ser 0",
      });
    }
    return;
  }

  if (value.quantity <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quantity"],
      message: "quantity debe ser positivo",
    });
  }
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

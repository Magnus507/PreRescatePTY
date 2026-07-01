import { z } from "zod";

export const DISPATCH_STATUSES = [
  "draft",
  "pending_pick",
  "picked",
  "packed",
  "reserved",
  "released",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export const DISPATCH_DESTINATION_TYPES = [
  "customer",
  "point_of_sale",
  "external_warehouse",
  "internal_delivery",
  "other",
] as const;

export const DISPATCH_EVENT_TYPES = [
  "CREATED",
  "PICKED",
  "PACKED",
  "RESERVED",
  "RELEASED",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type DispatchEventType = (typeof DISPATCH_EVENT_TYPES)[number];

export function isValidDispatchEventType(value: string): value is DispatchEventType {
  return DISPATCH_EVENT_TYPES.includes(value as DispatchEventType);
}

const DispatchItemSchema = z.object({
  finishedGoodId: z.string().trim().min(1, "finishedGoodId es requerido"),
  quantity: z.coerce.number().positive("quantity debe ser positivo"),
  unit: z.string().trim().min(1, "unit es requerido").max(40, "unit es demasiado largo"),
  notes: z.string().trim().max(1000, "notes es demasiado largo").optional().nullable(),
});

export const CreateDispatchSchema = z.object({
  code: z.string().trim().min(1, "code es requerido").max(80, "code es demasiado largo"),
  destinationType: z.enum(DISPATCH_DESTINATION_TYPES).optional(),
  destinationName: z.string().trim().max(160, "destinationName es demasiado largo").optional().nullable(),
  destinationReference: z.string().trim().max(160, "destinationReference es demasiado largo").optional().nullable(),
  destinationAddress: z.string().trim().max(1000, "destinationAddress es demasiado largo").optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000, "notes es demasiado largo").optional().nullable(),
  items: z.array(DispatchItemSchema).min(1, "items no puede estar vacio"),
});

export const CreateDispatchEventSchema = z.object({
  eventType: z.string().trim().refine(isValidDispatchEventType, {
    message: "eventType invalido",
  }),
  quantity: z.coerce.number().positive("quantity debe ser positivo").optional(),
  reason: z.string().trim().max(1000, "reason es demasiado largo").optional().nullable(),
  referenceType: z.string().trim().max(80, "referenceType es demasiado largo").optional().nullable(),
  referenceId: z.string().trim().max(160, "referenceId es demasiado largo").optional().nullable(),
  metadataJson: z.string().trim().max(5000, "metadataJson es demasiado largo").optional().nullable(),
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

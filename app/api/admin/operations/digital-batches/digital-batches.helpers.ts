import { z } from "zod";

export const DIGITAL_BATCH_STATUSES = [
  "draft",
  "generated",
  "partially_consumed",
  "consumed",
  "cancelled",
] as const;

export const DIGITAL_BATCH_ITEM_STATUSES = [
  "available",
  "consumed",
  "sent_to_print",
  "printed",
  "assembled",
  "cancelled",
] as const;

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

export const CreateDigitalBatchSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().max(160).optional().nullable(),
  productType: z.enum(["sticker_normal", "sticker_empresarial"]),
  finishedGoodCode: z.enum(["PRP-FG-STICKER", "PRP-FG-STICKER-EMP"]),
  prefix: z.string().trim().min(1).max(40),
  startNumber: z.coerce.number().int().positive(),
  endNumber: z.coerce.number().int().positive(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const UpdateDigitalBatchSchema = z.object({
  name: z.string().trim().max(160).optional().nullable(),
  productType: z.enum(["sticker_normal", "sticker_empresarial"]).optional(),
  finishedGoodCode: z.enum(["PRP-FG-STICKER", "PRP-FG-STICKER-EMP"]).optional(),
  prefix: z.string().trim().min(1).max(40).optional(),
  startNumber: z.coerce.number().int().positive().optional(),
  endNumber: z.coerce.number().int().positive().optional(),
  status: z.enum(DIGITAL_BATCH_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const DigitalBatchActionSchema = z.object({
  action: z.enum(["generate_items", "mark_consumed"]),
});

export function buildInternalLabel(prefix: string, sequenceNumber: number) {
  return `${prefix}-${String(sequenceNumber).padStart(4, "0")}`;
}

export function buildInternalUrl(path: string, internalLabel: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}/${encodeURIComponent(internalLabel)}`;
}

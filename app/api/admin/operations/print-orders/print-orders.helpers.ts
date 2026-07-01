import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const PRINT_ORDER_STATUSES = ["draft", "sent", "partially_received", "received", "cancelled"] as const;
export const PRINT_ORDER_ITEM_STATUSES = ["pending", "sent", "received", "cancelled"] as const;

export const CreatePrintOrderSchema = z.object({
  code: z.string().trim().min(1).max(80),
  supplierName: z.string().trim().min(1).max(160),
  supplierReference: z.string().trim().max(160).optional().nullable(),
  productType: z.enum(["sticker_normal", "sticker_empresarial"]),
  finishedGoodCode: z.enum(["PRP-FG-STICKER", "PRP-FG-STICKER-EMP"]),
  digitalBatchId: z.string().trim().min(1),
  rangeStartLabel: z.string().trim().min(1).max(80),
  rangeEndLabel: z.string().trim().min(1).max(80),
  includesSticker: z.boolean().optional(),
  includesActivationCard: z.boolean().optional(),
  includesPresentation: z.boolean().optional(),
  includesPackaging: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const UpdatePrintOrderSchema = z.object({
  supplierName: z.string().trim().min(1).max(160).optional(),
  supplierReference: z.string().trim().max(160).optional().nullable(),
  status: z.enum(PRINT_ORDER_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const PrintOrderActionSchema = z.object({
  action: z.enum(["mark_sent", "mark_received"]),
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

export async function getPrintOrderWithCounts(id: string) {
  const printOrder = await prisma.operationPrintOrder.findUnique({
    where: { id },
    include: {
      digitalBatch: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          digitalBatchItem: true,
        },
      },
    },
  });

  if (!printOrder) return null;

  return {
    ...printOrder,
    sentItems: printOrder.items.filter((item) => item.status === "sent").length,
    receivedItems: printOrder.items.filter((item) => item.status === "received").length,
  };
}

export async function validateDigitalBatchRange(digitalBatchId: string, rangeStartLabel: string, rangeEndLabel: string) {
  const batch = await prisma.operationDigitalBatch.findUnique({
    where: { id: digitalBatchId },
    include: {
      items: {
        orderBy: { sequenceNumber: "asc" },
      },
    },
  });

  if (!batch) {
    throw new Error("DIGITAL_BATCH_NOT_FOUND");
  }

  const startIndex = batch.items.findIndex((item) => item.internalLabel === rangeStartLabel);
  const endIndex = batch.items.findIndex((item) => item.internalLabel === rangeEndLabel);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("RANGE_OUT_OF_BATCH");
  }

  if (endIndex < startIndex) {
    throw new Error("INVALID_RANGE");
  }

  return { batch, startIndex, endIndex };
}

export function getDigitalBatchItemsInRange(batch: { items: Array<{ id: string; internalLabel: string; status: string }> }, startIndex: number, endIndex: number) {
  return batch.items.slice(startIndex, endIndex + 1);
}

export function assertItemsAvailableForPrint(items: Array<{ internalLabel: string; status: string }>) {
  const blocked = items.filter((item) => !["available", "generated"].includes(item.status));
  if (blocked.length > 0) {
    throw new Error("ITEMS_NOT_AVAILABLE");
  }
}

export function buildPrintOrderPayload(params: {
  code: string;
  supplierName: string;
  supplierReference?: string | null;
  productType: string;
  finishedGoodCode: string;
  digitalBatchId: string;
  rangeStartLabel: string;
  rangeEndLabel: string;
  quantity: number;
  includesSticker: boolean;
  includesActivationCard: boolean;
  includesPresentation: boolean;
  includesPackaging: boolean;
  notes?: string | null;
}) {
  return {
    code: params.code,
    supplierName: params.supplierName,
    supplierReference: params.supplierReference || null,
    productType: params.productType,
    finishedGoodCode: params.finishedGoodCode,
    digitalBatchId: params.digitalBatchId,
    rangeStartLabel: params.rangeStartLabel,
    rangeEndLabel: params.rangeEndLabel,
    quantity: params.quantity,
    includesSticker: params.includesSticker,
    includesActivationCard: params.includesActivationCard,
    includesPresentation: params.includesPresentation,
    includesPackaging: params.includesPackaging,
    status: "draft",
    notes: params.notes || null,
  };
}

export function markItemsSentToPrint() {
  return {
    status: "sent",
    sentAt: new Date(),
  } as const;
}

export function markItemsReceivedFromPrint() {
  return {
    status: "received",
    receivedAt: new Date(),
  } as const;
}

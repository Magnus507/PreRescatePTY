import { z } from "zod";

export const CreateFinishedGoodUnitSchema = z.object({
  digitalBatchItemId: z.string().trim().min(1),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const FinishedGoodUnitActionSchema = z.object({
  action: z.enum(["qa_pass", "qa_fail", "reserve", "release", "discard", "cancel"]),
  reason: z.string().trim().max(1000).optional().nullable(),
  referenceType: z.string().trim().max(80).optional().nullable(),
  referenceId: z.string().trim().max(160).optional().nullable(),
});

export function getFirstValidationMessage(error: z.ZodError): string {
  return error.errors[0]?.message || "Datos invalidos";
}

export function getProductMetadata(productType: string) {
  if (productType === "sticker_empresarial") {
    return {
      productCode: "PRP-FG-STICKER-EMP",
      productName: "Sticker PreRescatePTY Empresarial",
    };
  }

  return {
    productCode: "PRP-FG-STICKER",
    productName: "Sticker PreRescatePTY",
  };
}

export function buildFinishedGoodUnitStatusCounts(units: Array<{ status: string; qaStatus: string | null; activationStatus: string }>) {
  return units.reduce(
    (acc, unit) => {
      if (unit.qaStatus === "pending") acc.qaPendingCount += 1;
      if (unit.status === "available") acc.availableCount += 1;
      if (unit.status === "reserved") acc.reservedCount += 1;
      if (unit.status === "delivered") acc.deliveredCount += 1;
      if (unit.activationStatus === "not_activated") acc.notActivatedCount += 1;
      return acc;
    },
    {
      qaPendingCount: 0,
      availableCount: 0,
      reservedCount: 0,
      deliveredCount: 0,
      notActivatedCount: 0,
    }
  );
}

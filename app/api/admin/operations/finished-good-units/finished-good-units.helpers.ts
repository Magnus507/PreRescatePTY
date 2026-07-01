import { z } from "zod";

export const CreateFinishedGoodUnitSchema = z.object({
  digitalBatchItemId: z.string().trim().min(1),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const FinishedGoodUnitActionSchema = z.object({
  action: z.enum(["qa_pass", "qa_fail", "send_to_rework", "reserve", "release", "discard", "cancel"]),
  reason: z.string().trim().max(1000).optional().nullable(),
  referenceType: z.string().trim().max(80).optional().nullable(),
  referenceId: z.string().trim().max(160).optional().nullable(),
  metadataJson: z.union([z.record(z.any()), z.null()]).optional(),
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
      if (isDeliveredPendingActivation(unit)) acc.deliveredPendingActivationCount += 1;
      return acc;
    },
    {
      qaPendingCount: 0,
      availableCount: 0,
      reservedCount: 0,
      deliveredCount: 0,
      notActivatedCount: 0,
      deliveredPendingActivationCount: 0,
    }
  );
}

export function isDeliveredPendingActivation(unit: { status: string; activationStatus: string; deliveredAt?: Date | string | null }) {
  return unit.status === "delivered" && unit.activationStatus === "not_activated";
}

export const QA_REQUIRED_CHECKS = [
  "nfcWorks",
  "qrWorks",
  "internalLabelCorrect",
  "stickerCorrect",
  "activationCardCorrect",
  "packagingCorrect",
  "sealedPackage",
  "productTypeCorrect",
] as const;

export type QARequiredCheck = (typeof QA_REQUIRED_CHECKS)[number];

export function normalizeQaChecklist(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }

  return metadataJson as Record<string, unknown>;
}

export function hasCompleteQaChecklist(metadataJson: unknown) {
  const checklist = normalizeQaChecklist(metadataJson);
  if (!checklist) return false;
  return QA_REQUIRED_CHECKS.every((key) => checklist[key] === true);
}

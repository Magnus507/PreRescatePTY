import { z } from "zod";

export const CreateFinishedGoodUnitSchema = z.object({
  digitalBatchItemId: z.string().trim().min(1),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const FinishedGoodUnitActionSchema = z.object({
  action: z.enum(["qa_pass", "qa_fail"]),
  reason: z.string().trim().max(1000).optional().nullable(),
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

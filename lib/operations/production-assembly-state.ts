import type { OperationDigitalBatchItem, OperationPrintOrder } from "@prisma/client";

export interface ProductionAssemblyState {
  nfcProgrammed: boolean;
  qrPrepared: boolean;
  chipStickerAssembled: boolean;
  packagingLabeled: boolean;
  readyForQc: boolean;
}

function isPackagedState(status: string | null | undefined) {
  return status === "packaged" || status === "completed";
}

function isAssembledState(status: string | null | undefined) {
  return status === "assembled" || isPackagedState(status);
}

export function buildProductionAssemblyState(
  preparationItem: Pick<OperationDigitalBatchItem, "status" | "nfcProgrammed" | "qrPrepared" | "internalLabel" | "shortCode">,
  options?: { printOrder?: Pick<OperationPrintOrder, "status"> | null }
): ProductionAssemblyState {
  const nfcProgrammed = Boolean(preparationItem.nfcProgrammed);
  const qrPrepared = Boolean(preparationItem.qrPrepared);
  const chipStickerAssembled = isAssembledState(preparationItem.status);
  const packagingLabeled = isPackagedState(preparationItem.status);
  const hasIdentity = Boolean(preparationItem.internalLabel && preparationItem.shortCode);
  const printReceived = options?.printOrder?.status === "received" || options?.printOrder?.status === "printed";

  return {
    nfcProgrammed,
    qrPrepared,
    chipStickerAssembled,
    packagingLabeled,
    readyForQc:
      nfcProgrammed &&
      qrPrepared &&
      chipStickerAssembled &&
      packagingLabeled &&
      hasIdentity &&
      printReceived,
  };
}

export function getProductionAssemblyMissingParts(state: ProductionAssemblyState) {
  const missing: string[] = [];
  if (!state.nfcProgrammed) missing.push("falta NFC");
  if (!state.qrPrepared) missing.push("falta QR");
  if (!state.chipStickerAssembled) missing.push("falta ensamblaje");
  if (!state.packagingLabeled) missing.push("falta empaque etiquetado");
  return missing;
}

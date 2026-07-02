import type { QARequiredCheck } from "@/app/api/admin/operations/finished-good-units/finished-good-units.helpers";

export type ProductionQcChecklist = Record<QARequiredCheck, true>;

export function buildProductionQcChecklist(): ProductionQcChecklist {
  return {
    nfcWorks: true,
    qrWorks: true,
    internalLabelCorrect: true,
    stickerCorrect: true,
    activationCardCorrect: true,
    packagingCorrect: true,
    sealedPackage: true,
    productTypeCorrect: true,
  };
}

export function getProductionQcChecklistLabels() {
  return [
    { key: "nfcWorks", label: "NFC funciona" },
    { key: "qrWorks", label: "QR funciona" },
    { key: "internalLabelCorrect", label: "Etiqueta interna correcta" },
    { key: "stickerCorrect", label: "Sticker correcto" },
    { key: "activationCardCorrect", label: "Tarjeta de activación correcta" },
    { key: "packagingCorrect", label: "Empaque correcto" },
    { key: "sealedPackage", label: "Empaque sellado" },
    { key: "productTypeCorrect", label: "Tipo de producto correcto" },
  ] as const;
}

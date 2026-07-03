import { prisma } from "@/lib/prisma";

export type CommercialItemMappingInput = {
  productType: string;
  quantity: number;
  providerReference?: string | null;
  productName?: string | null;
};

export type CommercialProductMappingResult = {
  operationalProductCode: string;
  operationalProductName: string;
  operationalQuantity: number;
  sourceLabel: string;
  operationalMappingStatus: "mapped" | "unmapped";
};

function normalizeType(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

async function resolvePackageQuantity(providerReference: string | null | undefined) {
  if (!providerReference) return null;
  const pkg = await prisma.package.findUnique({
    where: { id: providerReference },
    select: { id: true, name: true, maxChips: true },
  });
  return pkg ? { name: pkg.name, maxChips: pkg.maxChips } : null;
}

function resolveQuantityFromName(productName: string | null | undefined) {
  const normalized = normalizeType(productName || "");

  if (normalized.includes("DUO")) return 2;
  if (normalized.includes("FAMILIAR")) return 3;
  if (normalized.includes("HOGAR_FULL") || normalized.includes("HOGARFULL")) return 5;
  if (normalized.includes("EMPRESA")) return 20;
  if (normalized.includes("ESTANDAR") || normalized.includes("STANDARD")) return 1;

  return null;
}

export async function mapCommercialItemToOperationalRequirement(
  input: CommercialItemMappingInput
): Promise<CommercialProductMappingResult> {
  const normalizedType = normalizeType(input.productType);
  const sourceLabel = input.productName?.trim() || input.productType;

  if (normalizedType.startsWith("COMBO_")) {
    const pkg = await resolvePackageQuantity(input.providerReference);
    const quantityFromName = resolveQuantityFromName(sourceLabel);
    const mappedQuantity = Math.max(1, Number(input.quantity || 1)) * Math.max(1, pkg?.maxChips || quantityFromName || 1);

    return {
      operationalProductCode: "PRP-FG-STICKER",
      operationalProductName: "Sticker PreRescatePTY",
      operationalQuantity: mappedQuantity,
      sourceLabel: pkg ? `${sourceLabel} → ${pkg.name}` : `${sourceLabel} → stock operativo pendiente de mapeo`,
      operationalMappingStatus: pkg || quantityFromName ? "mapped" : "unmapped",
    };
  }

  if (normalizedType === "CHIP_EXTRA") {
    return {
      operationalProductCode: "PRP-FG-STICKER",
      operationalProductName: "Sticker PreRescatePTY",
      operationalQuantity: Math.max(1, Number(input.quantity || 1)),
      sourceLabel,
      operationalMappingStatus: "mapped",
    };
  }

  return {
    operationalProductCode: "PRP-FG-STICKER",
    operationalProductName: "Sticker PreRescatePTY",
    operationalQuantity: Math.max(1, Number(input.quantity || 1)),
    sourceLabel,
    operationalMappingStatus: "mapped",
  };
}

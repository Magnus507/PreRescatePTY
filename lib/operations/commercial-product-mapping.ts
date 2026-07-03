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

export async function mapCommercialItemToOperationalRequirement(
  input: CommercialItemMappingInput
): Promise<CommercialProductMappingResult> {
  const normalizedType = normalizeType(input.productType);
  const sourceLabel = input.productName?.trim() || input.productType;

  if (normalizedType.startsWith("COMBO_")) {
    const pkg = await resolvePackageQuantity(input.providerReference);
    if (!pkg) {
      throw new Error(`No se pudo resolver el combo operativo para ${sourceLabel}`);
    }

    return {
      operationalProductCode: "PRP-FG-STICKER",
      operationalProductName: "Sticker PreRescatePTY",
      operationalQuantity: Math.max(1, Number(input.quantity || 1)) * Math.max(1, pkg.maxChips),
      sourceLabel: `${sourceLabel} → ${pkg.name}`,
    };
  }

  if (normalizedType === "CHIP_EXTRA") {
    return {
      operationalProductCode: "PRP-FG-STICKER",
      operationalProductName: "Sticker PreRescatePTY",
      operationalQuantity: Math.max(1, Number(input.quantity || 1)),
      sourceLabel,
    };
  }

  return {
    operationalProductCode: "PRP-FG-STICKER",
    operationalProductName: "Sticker PreRescatePTY",
    operationalQuantity: Math.max(1, Number(input.quantity || 1)),
    sourceLabel,
  };
}

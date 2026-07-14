import { prisma } from "@/lib/prisma";

export type CommercialItemMappingInput = {
  productType: string;
  quantity: number;
  providerReference?: string | null;
  productName?: string | null;
};

export type CommercialProductMappingResult = {
  commercialQuantity: number;
  operationalProductCode: string;
  operationalProductName: string;
  operationalQuantity: number;
  unitPrice: number;
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

async function resolveOperationalProductMetadata(productType: string, productName: string | null | undefined) {
  const candidates = [productType.trim(), productName?.trim() || ""].filter(Boolean);

  for (const candidate of candidates) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ productType: candidate }, { name: candidate }],
      },
      include: {
        operationalMapping: {
          include: {
            finishedGood: {
              select: { id: true, code: true, name: true, productType: true, status: true },
            },
          },
        },
      },
    });

    const mapping = product?.operationalMapping;
    if (!product || !mapping || !mapping.isPublished || !mapping.finishedGoodId || !mapping.productCode || !mapping.finishedGood) {
      continue;
    }

    if (mapping.finishedGood.status === "inactive") {
      continue;
    }

    return {
      operationalProductCode: mapping.productCode,
      operationalProductName: mapping.finishedGood.name || product.name,
      sourceLabel: product.name || candidate,
      operationalMappingStatus: "mapped" as const,
    };
  }

  return null;
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

function resolveCommercialComboPrice(productName: string | null | undefined) {
  const normalized = normalizeType(productName || "");
  if (normalized.includes("DUO")) return 45;
  if (normalized.includes("FAMILIAR")) return 65;
  if (normalized.includes("HOGAR_FULL") || normalized.includes("HOGARFULL")) return 95;
  if (normalized.includes("EMPRESA")) return 250;
  if (normalized.includes("CORPORATIVO")) return 450;
  if (normalized.includes("ESTANDAR") || normalized.includes("STANDARD")) return 25;
  return null;
}

function resolveCommercialQuantityForCombo(
  inputQuantity: number,
  packageQuantity: number | null,
  comboName: string | null | undefined
) {
  const normalizedCombo = normalizeType(comboName || "");
  if (!packageQuantity) return Math.max(1, Number(inputQuantity || 1));
  if (normalizedCombo.includes("DUO") && inputQuantity === packageQuantity) return 1;
  if (normalizedCombo.includes("FAMILIAR") && inputQuantity === packageQuantity) return 1;
  if (normalizedCombo.includes("HOGAR_FULL") && inputQuantity === packageQuantity) return 1;
  if (normalizedCombo.includes("EMPRESA") && inputQuantity === packageQuantity) return 1;
  if (normalizedCombo.includes("CORPORATIVO") && inputQuantity === packageQuantity) return 1;
  if (normalizedCombo.includes("ESTANDAR") && inputQuantity === packageQuantity) return 1;
  return Math.max(1, Number(inputQuantity || 1));
}

export async function mapCommercialItemToOperationalRequirement(
  input: CommercialItemMappingInput
): Promise<CommercialProductMappingResult> {
  const normalizedType = normalizeType(input.productType);
  const sourceLabel = input.productName?.trim() || input.productType;

  if (normalizedType.startsWith("COMBO_")) {
    const pkg = await resolvePackageQuantity(input.providerReference);
    const quantityFromName = resolveQuantityFromName(sourceLabel);
    const commercialQuantity = resolveCommercialQuantityForCombo(
      Math.max(1, Number(input.quantity || 1)),
      pkg?.maxChips || quantityFromName || null,
      sourceLabel
    );
    const unitsPerCombo = Math.max(1, pkg?.maxChips || quantityFromName || 1);
    const operationalQuantity = commercialQuantity * unitsPerCombo;
    const unitPrice = resolveCommercialComboPrice(sourceLabel) ?? 0;

    return {
      commercialQuantity,
      operationalProductCode: "PRP-FG-STICKER",
      operationalProductName: "Sticker PreRescatePTY",
      operationalQuantity,
      unitPrice,
      sourceLabel: pkg ? `${sourceLabel} → ${pkg.name}` : `${sourceLabel} → stock operativo pendiente de mapeo`,
      operationalMappingStatus: pkg || quantityFromName ? "mapped" : "unmapped",
    };
  }

  if (normalizedType === "CHIP_EXTRA") {
    return {
      commercialQuantity: Math.max(1, Number(input.quantity || 1)),
      operationalProductCode: "PRP-FG-STICKER",
      operationalProductName: "Sticker PreRescatePTY",
      operationalQuantity: Math.max(1, Number(input.quantity || 1)),
      unitPrice: 0,
      sourceLabel,
      operationalMappingStatus: "mapped",
    };
  }

  const resolved = await resolveOperationalProductMetadata(input.productType, input.productName);
  if (resolved) {
    return {
      commercialQuantity: Math.max(1, Number(input.quantity || 1)),
      operationalProductCode: resolved.operationalProductCode,
      operationalProductName: resolved.operationalProductName,
      operationalQuantity: Math.max(1, Number(input.quantity || 1)),
      unitPrice: 0,
      sourceLabel: resolved.sourceLabel,
      operationalMappingStatus: resolved.operationalMappingStatus,
    };
  }

  return {
    commercialQuantity: Math.max(1, Number(input.quantity || 1)),
    operationalProductCode: input.productType.trim(),
    operationalProductName: input.productName?.trim() || input.productType.trim(),
    operationalQuantity: Math.max(1, Number(input.quantity || 1)),
    unitPrice: 0,
    sourceLabel,
    operationalMappingStatus: "unmapped",
  };
}

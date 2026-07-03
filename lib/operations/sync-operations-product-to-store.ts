import { prisma } from "@/lib/prisma";

export type SyncOperationsProductToStoreInput = {
  operationsProductCode: string;
  operationsProductName: string;
  productType: string;
  defaultPrice?: number | null;
  category?: string | null;
  visible?: boolean;
};

export type SyncOperationsProductToStoreResult = {
  storeProductId: string;
  operationsProductCode: string;
  created: boolean;
  updated: boolean;
  alreadyPublished: boolean;
};

function buildHiddenMarker(code: string) {
  return `\n[operationsProductCode:${code}]`;
}

function parseHiddenMarker(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/\[operationsProductCode:([^\]]+)\]/);
  return match?.[1] || null;
}

export async function syncOperationsProductToStore(
  input: SyncOperationsProductToStoreInput
): Promise<SyncOperationsProductToStoreResult> {
  const operationsProductCode = input.operationsProductCode.trim();
  const operationsProductName = input.operationsProductName.trim();
  const productType = input.productType.trim();
  const marker = buildHiddenMarker(operationsProductCode);

  const existingByMarker = await prisma.product.findFirst({
    where: { description: { contains: marker } },
  });

  const existingByCode = await prisma.product.findFirst({
    where: {
      OR: [
        { productType: operationsProductCode },
        { name: operationsProductName },
      ],
    },
  });

  const existing = existingByMarker || existingByCode;
  const descriptionBase = existing?.description?.replace(/\n\[operationsProductCode:[^\]]+\]/g, "").trim() || "";
  const nextDescription = `${descriptionBase}${marker}`.trim();
  const visible = input.visible ?? true;

  if (existing) {
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: existing.name || operationsProductName,
        description: nextDescription,
        category: input.category || existing.category || "general",
        price: input.defaultPrice !== undefined && input.defaultPrice !== null ? input.defaultPrice : existing.price,
        productType: productType || operationsProductCode,
        isActive: visible ?? existing.isActive,
      },
    });

    return {
      storeProductId: updated.id,
      operationsProductCode,
      created: false,
      updated: true,
      alreadyPublished: Boolean(parseHiddenMarker(existing.description || updated.description)),
    };
  }

  const created = await prisma.product.create({
    data: {
      name: operationsProductName,
      description: nextDescription || null,
      price: input.defaultPrice ?? 0,
      category: input.category || "general",
      stock: 0,
      image: null,
      productType: productType || operationsProductCode,
      estimatedProductionTime: null,
      requiresPersonalization: false,
      isActive: visible,
    },
  });

  return {
    storeProductId: created.id,
    operationsProductCode,
    created: true,
    updated: false,
    alreadyPublished: false,
  };
}

export function extractOperationsProductCode(product: {
  description: string | null;
  productType: string;
  name: string;
}) {
  return (
    parseHiddenMarker(product.description) ||
    (product.productType.startsWith("PRP-") ? product.productType : null) ||
    (product.name === "Sticker PreRescatePTY" ? "PRP-FG-STICKER" : null) ||
    (product.name === "Sticker PreRescatePTY Empresarial" ? "PRP-FG-STICKER-EMP" : null)
  );
}

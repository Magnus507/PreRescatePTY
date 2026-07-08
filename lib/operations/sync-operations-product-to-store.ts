import { prisma } from "@/lib/prisma";

export type SyncOperationsProductToStoreInput = {
  operationsProductCode: string;
  operationsProductName: string;
  productType: string;
  defaultPrice?: number | null;
  category?: string | null;
  isActive: boolean;
  description?: string | null;
  image?: string | null;
};

export type SyncOperationsProductToStoreResult = {
  storeProductId: string;
  operationsProductCode: string;
  created: boolean;
  updated: boolean;
  alreadyPublished: boolean;
  isActive: boolean;
  markerPresent: boolean;
  matchStrategy: "marker" | "productType" | "name" | "fallback" | "none";
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
    orderBy: { updatedAt: "desc" },
  });

  const existingByProductType = await prisma.product.findFirst({
    where: { productType: operationsProductCode },
    orderBy: { updatedAt: "desc" },
  });

  const existingByName = await prisma.product.findFirst({
    where: { name: operationsProductName },
    orderBy: { updatedAt: "desc" },
  });

  const existing =
    existingByMarker ||
    existingByProductType ||
    existingByName ||
    null;
  const matchStrategy: "marker" | "productType" | "name" | "fallback" | "none" = existingByMarker
    ? "marker"
    : existingByProductType
      ? "productType"
      : existingByName
        ? "name"
        : "fallback";
  const descriptionBase = existing?.description?.replace(/\n\[operationsProductCode:[^\]]+\]/g, "").trim() || "";
  const customDescription = input.description?.trim() || "";
  const nextDescription = `${customDescription || descriptionBase}${marker}`.trim();
  const nextIsActive = input.isActive;

  if (existing) {
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: existing.name || operationsProductName,
        description: nextDescription,
        category: input.category || existing.category || "general",
        price: input.defaultPrice !== undefined && input.defaultPrice !== null ? input.defaultPrice : existing.price,
        productType: productType || operationsProductCode,
        isActive: nextIsActive,
        image: input.image !== undefined ? input.image : existing.image,
      },
    });

    return {
      storeProductId: updated.id,
      operationsProductCode,
      created: false,
      updated: true,
      alreadyPublished: Boolean(parseHiddenMarker(existing.description || updated.description)),
      isActive: updated.isActive,
      markerPresent: Boolean(parseHiddenMarker(updated.description)),
      matchStrategy,
    };
  }

  const created = await prisma.product.create({
    data: {
      name: operationsProductName,
      description: nextDescription || null,
      price: input.defaultPrice ?? 0,
      category: input.category || "general",
      stock: 0,
      productType: productType || operationsProductCode,
      estimatedProductionTime: null,
      requiresPersonalization: false,
      isActive: nextIsActive,
      image: input.image ?? null,
    },
  });

  return {
    storeProductId: created.id,
    operationsProductCode,
    created: true,
    updated: false,
    alreadyPublished: false,
    isActive: created.isActive,
    markerPresent: Boolean(parseHiddenMarker(created.description)),
    matchStrategy,
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

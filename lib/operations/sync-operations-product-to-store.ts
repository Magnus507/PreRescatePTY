import { prisma } from "@/lib/prisma";
import type {
  ActivationFlow,
  DeviceType,
  PurchaseFlow,
  StoreSection,
} from "@/lib/products/product-operational-mapping";

export type SyncOperationsProductToStoreInput = {
  finishedGoodId?: string | null;
  operationsProductCode: string;
  operationsProductName: string;
  productType: string;
  defaultPrice?: number | null;
  category?: string | null;
  isActive: boolean;
  description?: string | null;
  image?: string | null;
  deviceType?: DeviceType;
  storeSection?: StoreSection;
  purchaseFlow?: PurchaseFlow;
  activationFlow?: ActivationFlow;
  requiresCompanyContext?: boolean;
  requiresApproval?: boolean;
  requiresPersonalization?: boolean;
  sortOrder?: number;
  badgeLabel?: string | null;
  badgeColor?: string | null;
};

export type SyncOperationsProductToStoreResult = {
  storeProductId: string;
  operationalMappingId: string;
  operationsProductCode: string;
  created: boolean;
  updated: boolean;
  alreadyPublished: boolean;
  isActive: boolean;
  markerPresent: boolean;
  matchStrategy: "mapping" | "marker" | "productType" | "name" | "fallback" | "none";
};

function buildHiddenMarker(code: string) {
  return `\n[operationsProductCode:${code}]`;
}

function parseHiddenMarker(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/\[operationsProductCode:([^\]]+)\]/);
  return match?.[1] || null;
}

function inferMappingDefaults(input: SyncOperationsProductToStoreInput): {
  deviceType: DeviceType;
  storeSection: StoreSection;
  purchaseFlow: PurchaseFlow;
  activationFlow: ActivationFlow;
  requiresCompanyContext: boolean;
  requiresApproval: boolean;
  requiresPersonalization: boolean;
} {
  const text = `${input.operationsProductName} ${input.operationsProductCode} ${input.productType}`.toLowerCase();
  const isBusiness = /emp|business|corporat|empresa/.test(text);

  return {
    deviceType: input.deviceType || (isBusiness ? "business" : "personal"),
    storeSection: input.storeSection || (isBusiness ? "business_devices" : "personal_devices"),
    purchaseFlow: input.purchaseFlow || (isBusiness ? "company_request" : "direct_purchase"),
    activationFlow: input.activationFlow || (isBusiness ? "business_profile" : "personal_profile"),
    requiresCompanyContext: input.requiresCompanyContext ?? isBusiness,
    requiresApproval: input.requiresApproval ?? isBusiness,
    requiresPersonalization: input.requiresPersonalization ?? false,
  };
}

export async function syncOperationsProductToStore(
  input: SyncOperationsProductToStoreInput
): Promise<SyncOperationsProductToStoreResult> {
  const operationsProductCode = input.operationsProductCode.trim();
  const operationsProductName = input.operationsProductName.trim();
  const productType = input.productType.trim();
  const marker = buildHiddenMarker(operationsProductCode);
  const mappingDefaults = inferMappingDefaults(input);
  const finishedGoodId = input.finishedGoodId?.trim() || (
    await prisma.operationFinishedGood.findUnique({
      where: { code: operationsProductCode },
      select: { id: true },
    })
  )?.id || null;

  const mappingLookupFilters = [
    ...(finishedGoodId ? [{ finishedGoodId }] : []),
    { productCode: operationsProductCode },
  ];

  const existingMapping = await prisma.productOperationalMapping.findFirst({
    where: {
      OR: mappingLookupFilters,
    },
    include: { product: true },
    orderBy: { updatedAt: "desc" },
  });

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
    existingMapping?.product ||
    existingByMarker ||
    existingByProductType ||
    existingByName ||
    null;
  const matchStrategy: "mapping" | "marker" | "productType" | "name" | "fallback" | "none" = existingMapping
    ? "mapping"
    : existingByMarker
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
        requiresPersonalization: mappingDefaults.requiresPersonalization,
      },
    });
    const mapping = await prisma.productOperationalMapping.upsert({
      where: { productId: updated.id },
      create: {
        productId: updated.id,
        finishedGoodId,
        productCode: operationsProductCode,
        deviceType: mappingDefaults.deviceType,
        storeSection: mappingDefaults.storeSection,
        purchaseFlow: mappingDefaults.purchaseFlow,
        activationFlow: mappingDefaults.activationFlow,
        isPublished: nextIsActive,
        requiresCompanyContext: mappingDefaults.requiresCompanyContext,
        requiresApproval: mappingDefaults.requiresApproval,
        requiresPersonalization: mappingDefaults.requiresPersonalization,
        sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
        badgeLabel: input.badgeLabel ?? null,
        badgeColor: input.badgeColor ?? null,
      },
      update: {
        finishedGoodId,
        productCode: operationsProductCode,
        deviceType: mappingDefaults.deviceType,
        storeSection: mappingDefaults.storeSection,
        purchaseFlow: mappingDefaults.purchaseFlow,
        activationFlow: mappingDefaults.activationFlow,
        isPublished: nextIsActive,
        requiresCompanyContext: mappingDefaults.requiresCompanyContext,
        requiresApproval: mappingDefaults.requiresApproval,
        requiresPersonalization: mappingDefaults.requiresPersonalization,
        sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : undefined,
        badgeLabel: input.badgeLabel ?? undefined,
        badgeColor: input.badgeColor ?? undefined,
      },
    });

    return {
      storeProductId: updated.id,
      operationalMappingId: mapping.id,
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
      requiresPersonalization: mappingDefaults.requiresPersonalization,
      isActive: nextIsActive,
      image: input.image ?? null,
    },
  });
  const mapping = await prisma.productOperationalMapping.create({
    data: {
      productId: created.id,
      finishedGoodId,
      productCode: operationsProductCode,
      deviceType: mappingDefaults.deviceType,
      storeSection: mappingDefaults.storeSection,
      purchaseFlow: mappingDefaults.purchaseFlow,
      activationFlow: mappingDefaults.activationFlow,
      isPublished: nextIsActive,
      requiresCompanyContext: mappingDefaults.requiresCompanyContext,
      requiresApproval: mappingDefaults.requiresApproval,
      requiresPersonalization: mappingDefaults.requiresPersonalization,
      sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      badgeLabel: input.badgeLabel ?? null,
      badgeColor: input.badgeColor ?? null,
    },
  });

  return {
    storeProductId: created.id,
    operationalMappingId: mapping.id,
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
  operationalMapping?: { productCode: string | null } | null;
}) {
  return (
    product.operationalMapping?.productCode ||
    parseHiddenMarker(product.description) ||
    (product.productType.startsWith("PRP-") ? product.productType : null) ||
    (product.name === "Sticker PreRescatePTY" ? "PRP-FG-STICKER" : null) ||
    (product.name === "Sticker PreRescatePTY Empresarial" ? "PRP-FG-STICKER-EMP" : null)
  );
}

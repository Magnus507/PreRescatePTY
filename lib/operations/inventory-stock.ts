import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "./sync-operations-product-to-store";

export type InventoryStockRow = {
  productCode: string;
  productName: string;
  productType: string;
  storeProductId: string | null;
  storeVisible: boolean;
  availableCount: number;
  reservedCount: number;
  qaPendingCount: number;
  qaFailedCount: number;
  dispatchedCount: number;
  deliveredCount: number;
  activatedCount: number;
  totalUnits: number;
  lastUpdatedAt: string | null;
};

export type InventoryUnitDetail = {
  id: string;
  internalLabel: string;
  shortCode: string | null;
  productCode: string;
  productName: string;
  qaStatus: string | null;
  inventoryStatus: string;
  activationStatus: string;
  reservedOrderId: string | null;
  dispatchId: string | null;
  productionOrderId: string | null;
  createdAt: string;
  updatedAt: string;
};

const HIDDEN_INVENTORY_STATUSES = ["discarded", "cancelled"] as const;

function emptyRow(code: string, name: string, productType: string, productId: string | null, visible: boolean): InventoryStockRow {
  return {
    productCode: code,
    productName: name,
    productType,
    storeProductId: productId,
    storeVisible: visible,
    availableCount: 0,
    reservedCount: 0,
    qaPendingCount: 0,
    qaFailedCount: 0,
    dispatchedCount: 0,
    deliveredCount: 0,
    activatedCount: 0,
    totalUnits: 0,
    lastUpdatedAt: null,
  };
}

function emptySummary() {
  return {
    total: 0,
    available: 0,
    reserved: 0,
    qaPending: 0,
    qaFailed: 0,
    dispatched: 0,
    delivered: 0,
    activated: 0,
  };
}

export async function loadInventoryStockRows() {
  const [products, units] = await Promise.all([
    prisma.operationFinishedGood.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, name: true, productType: true, status: true },
    }),
    prisma.operationFinishedGoodUnit.findMany({
      where: { status: { notIn: [...HIDDEN_INVENTORY_STATUSES] } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        productCode: true,
        productName: true,
        productType: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
        reservedOrderId: true,
        dispatchedAt: true,
        deliveredAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const storeProducts = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      productType: true,
      description: true,
      isActive: true,
      operationalMapping: {
        select: { productCode: true, isPublished: true },
      },
    },
  });

  const productLookup = new Map<string, { id: string; name: string; productType: string; description: string | null; isActive: boolean; operationalMapping?: { productCode: string | null; isPublished: boolean } | null }>();
  for (const storeProduct of storeProducts) {
    const code = extractOperationsProductCode(storeProduct);
    if (code) productLookup.set(code, storeProduct);
  }

  const rows = new Map<string, InventoryStockRow>();

  for (const product of products) {
    const matchedStoreProduct = productLookup.get(product.code) || null;
    rows.set(
      product.code,
      emptyRow(product.code, product.name, product.productType, matchedStoreProduct?.id || null, Boolean(matchedStoreProduct?.isActive && matchedStoreProduct.operationalMapping?.isPublished))
    );
  }

  for (const unit of units) {
    const matchedStoreProduct = productLookup.get(unit.productCode);
    const current = rows.get(unit.productCode) || emptyRow(unit.productCode, unit.productName, unit.productType, matchedStoreProduct?.id || null, Boolean(matchedStoreProduct?.isActive && matchedStoreProduct.operationalMapping?.isPublished));
    current.totalUnits += 1;
    current.lastUpdatedAt = unit.updatedAt.toISOString();

    if (unit.status === "available" && unit.qaStatus === "passed" && unit.activationStatus === "not_activated" && !unit.reservedOrderId) current.availableCount += 1;
    if (unit.status === "reserved" || unit.reservedOrderId) current.reservedCount += 1;
    if (unit.status === "qa_pending" || unit.qaStatus === "pending") current.qaPendingCount += 1;
    if (unit.status === "qa_failed" || unit.qaStatus === "failed") current.qaFailedCount += 1;
    if (unit.status === "dispatched") current.dispatchedCount += 1;
    if (unit.status === "delivered") current.deliveredCount += 1;
    if (unit.activationStatus === "activated") current.activatedCount += 1;

    rows.set(unit.productCode, current);
  }

  return Array.from(rows.values()).sort((a, b) => a.productName.localeCompare(b.productName));
}

export async function loadInventoryStockDetail(productCode: string) {
  const rows = await loadInventoryStockRows();
  const row = rows.find((item) => item.productCode === productCode);
  const units = await prisma.operationFinishedGoodUnit.findMany({
    where: {
      productCode,
      status: { notIn: [...HIDDEN_INVENTORY_STATUSES] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productName: true,
      qaStatus: true,
      status: true,
      activationStatus: true,
      reservedOrderId: true,
      dispatchedAt: true,
      deliveredAt: true,
      createdAt: true,
      updatedAt: true,
      dispatchItems: {
        select: { dispatchId: true },
        take: 1,
      },
      digitalBatchItem: {
        select: { shortCode: true, productionOrderId: true },
      },
    },
  });

  const summary = units.reduce((acc, unit) => {
    acc.total += 1;
    if (unit.status === "available" && unit.qaStatus === "passed" && unit.activationStatus === "not_activated" && !unit.reservedOrderId) acc.available += 1;
    if (unit.status === "reserved" || unit.reservedOrderId) acc.reserved += 1;
    if (unit.status === "qa_pending" || unit.qaStatus === "pending") acc.qaPending += 1;
    if (unit.status === "qa_failed" || unit.qaStatus === "failed") acc.qaFailed += 1;
    if (unit.status === "dispatched" || unit.dispatchedAt) acc.dispatched += 1;
    if (unit.status === "delivered" || unit.deliveredAt) acc.delivered += 1;
    if (unit.activationStatus === "activated") acc.activated += 1;
    return acc;
  }, emptySummary());

  return {
    summary: { ...(row || null), ...summary },
    units: units.map((unit) => ({
      id: unit.id,
      internalLabel: unit.internalLabel,
      shortCode: unit.digitalBatchItem?.shortCode || null,
      productCode: unit.productCode,
      productName: unit.productName,
      qaStatus: unit.qaStatus,
      inventoryStatus: unit.status,
      activationStatus: unit.activationStatus,
      reservedOrderId: unit.reservedOrderId,
      dispatchId: unit.dispatchItems[0]?.dispatchId || null,
      productionOrderId: unit.digitalBatchItem?.productionOrderId || null,
      createdAt: unit.createdAt.toISOString(),
      updatedAt: unit.updatedAt.toISOString(),
    })) as InventoryUnitDetail[],
  };
}

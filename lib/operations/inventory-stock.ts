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

export async function loadInventoryStockRows() {
  const [products, units] = await Promise.all([
    prisma.operationFinishedGood.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, code: true, name: true, productType: true, status: true },
    }),
    prisma.operationFinishedGoodUnit.findMany({
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
    select: { id: true, name: true, productType: true, description: true, isActive: true },
  });

  const productLookup = new Map<string, { id: string; name: string; productType: string; description: string | null; isActive: boolean }>();
  for (const storeProduct of storeProducts) {
    const code = extractOperationsProductCode(storeProduct);
    if (code) productLookup.set(code, storeProduct);
  }

  const rows = new Map<string, InventoryStockRow>();

  for (const product of products) {
    const matchedStoreProduct = productLookup.get(product.code) || null;
    rows.set(
      product.code,
      emptyRow(product.code, product.name, product.productType, matchedStoreProduct?.id || null, matchedStoreProduct?.isActive ?? false)
    );
  }

  for (const unit of units) {
    const current = rows.get(unit.productCode) || emptyRow(unit.productCode, unit.productName, unit.productType, productLookup.get(unit.productCode)?.id || null, productLookup.get(unit.productCode)?.isActive ?? false);
    current.totalUnits += 1;
    current.lastUpdatedAt = unit.updatedAt.toISOString();

    if (unit.status === "available" && unit.qaStatus === "passed" && unit.activationStatus === "not_activated" && !unit.reservedOrderId) current.availableCount += 1;
    if (unit.status === "reserved") current.reservedCount += 1;
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
    where: { productCode },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      internalLabel: true,
      qaStatus: true,
      status: true,
      activationStatus: true,
      reservedOrderId: true,
      updatedAt: true,
      digitalBatchItem: {
        select: { shortCode: true, productionOrderId: true },
      },
    },
  });

  return {
    summary: row || null,
    units: units.map((unit) => ({
      id: unit.id,
      internalLabel: unit.internalLabel,
      shortCode: unit.digitalBatchItem?.shortCode || null,
      qaStatus: unit.qaStatus,
      inventoryStatus: unit.status,
      activationStatus: unit.activationStatus,
      reservedOrderId: unit.reservedOrderId,
      productionOrderId: unit.digitalBatchItem?.productionOrderId || null,
      dispatchId: null,
      updatedAt: unit.updatedAt.toISOString(),
    })),
  };
}

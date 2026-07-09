import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";
import {
  getActivationFlowLabel,
  getDeviceTypeBadgeClass,
  getDeviceTypeLabel,
  getPurchaseFlowLabel,
  getStoreSectionLabel,
  isStoreSection,
} from "@/lib/products/product-operational-mapping";

function stripOperationsMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
}

function hasValidPublicOperationalBase(mapping: {
  isPublished: boolean;
  finishedGoodId: string | null;
  productCode: string | null;
  finishedGood?: { status: string } | null;
} | null) {
  if (!mapping?.isPublished) return false;
  if (!mapping.finishedGoodId || !mapping.productCode) return false;
  if (!mapping.finishedGood) return false;
  return mapping.finishedGood.status !== "inactive";
}

export async function GET() {
  try {
    const [products, stockRows] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        include: {
          operationalMapping: {
            include: {
              finishedGood: {
                select: { id: true, code: true, name: true, productType: true, status: true },
              },
            },
          },
        },
      }),
      loadInventoryStockRows(),
    ]);

    const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));

    const catalog = products
      .map((product) => {
        const operationsProductCode = extractOperationsProductCode(product);
        const mapping = product.operationalMapping || null;
        if (!operationsProductCode && !mapping?.isPublished) return null;
        if (mapping && (!mapping.storeSection || !isStoreSection(mapping.storeSection))) return null;
        if (!hasValidPublicOperationalBase(mapping)) return null;

        const stock = operationsProductCode ? stockByCode.get(operationsProductCode) : null;
        const availableStock = stock?.availableCount ?? 0;
        const reservedStock = stock?.reservedCount ?? 0;

        return {
          id: product.id,
          name: product.name,
          description: stripOperationsMarker(product.description),
          price: product.price,
          currency: "USD",
          category: product.category,
          imageUrl: product.image,
          operationsProductCode,
          operationalMapping: mapping
            ? {
                id: mapping.id,
                productId: mapping.productId,
                finishedGoodId: mapping.finishedGoodId,
                productCode: mapping.productCode,
                deviceType: mapping.deviceType,
                deviceTypeLabel: getDeviceTypeLabel(mapping.deviceType),
                deviceTypeBadgeClass: getDeviceTypeBadgeClass(mapping.deviceType),
                storeSection: mapping.storeSection,
                storeSectionLabel: getStoreSectionLabel(mapping.storeSection),
                purchaseFlow: mapping.purchaseFlow,
                purchaseFlowLabel: getPurchaseFlowLabel(mapping.purchaseFlow),
                activationFlow: mapping.activationFlow,
                activationFlowLabel: getActivationFlowLabel(mapping.activationFlow),
                isPublished: mapping.isPublished,
                requiresCompanyContext: mapping.requiresCompanyContext,
                requiresApproval: mapping.requiresApproval,
                requiresPersonalization: mapping.requiresPersonalization,
                sortOrder: mapping.sortOrder,
                badgeLabel: mapping.badgeLabel,
                badgeColor: mapping.badgeColor,
                finishedGood: mapping.finishedGood,
              }
            : null,
          availableStock,
          reservedStock,
          isPublished: Boolean(mapping?.isPublished ?? false),
          isVisible: product.isActive,
          stockSource: stock ? "operations_inventory" : "operations_inventory",
          stock: availableStock,
          productType: product.productType,
          estimatedProductionTime: product.estimatedProductionTime,
          requiresPersonalization: product.requiresPersonalization,
        };
      })
      .filter((item) => Boolean(item));

    return NextResponse.json({ products: catalog });
  } catch (err) {
    console.error("Products GET error:", err);
    return NextResponse.json({ error: "Error al cargar productos" }, { status: 500 });
  }
}

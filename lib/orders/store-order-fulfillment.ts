import { Prisma, PrismaClient } from "@prisma/client";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";
import { isStoreSection } from "@/lib/products/product-operational-mapping";

export type StoreOrderResolvedItem = {
  productId: string;
  productName: string;
  productCode: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
  stockCoveredQty: number;
  backorderQty: number;
  fulfillmentMode: "stock" | "partial_backorder" | "production_backorder";
  productionEstimateDays: number;
  customerMessage: string;
  operationalMappingId: string;
  finishedGoodId: string;
};

export type StoreOrderFulfillmentSummary = {
  hasBackorder: boolean;
  productionEstimateDays: number;
  items: Array<Pick<StoreOrderResolvedItem, "productId" | "productCode" | "quantity" | "availableStock" | "stockCoveredQty" | "backorderQty" | "fulfillmentMode" | "productionEstimateDays" | "customerMessage">>;
};

export type ResolvedStoreProduct = {
  id: string;
  name: string;
  price: number;
  operationalMapping: {
    id: string;
    productCode: string | null;
    storeSection: string;
    deviceType: string;
    purchaseFlow: string;
    requiresCompanyContext: boolean;
    isPublished: boolean;
    finishedGoodId: string | null;
    finishedGood: { id: string; code: string; name: string; status: string } | null;
  };
};

function normalizeQuantity(value: number) {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

function buildCustomerMessage(availableStock: number, requestedQty: number, backorderQty: number) {
  if (availableStock <= 0) {
    return "No tenemos stock disponible ahora. Puedes crear el pedido; producción estimada: 2 semanas.";
  }
  if (backorderQty > 0) {
    return `Tenemos ${availableStock} disponibles. Las ${backorderQty} restantes entran a producción. Tiempo estimado: 2 semanas.`;
  }
  if (requestedQty <= availableStock) {
    return "Disponible para pedido.";
  }
  return "Disponible para pedido.";
}

export async function resolveStoreProductForOrder(
  db: PrismaClient | Prisma.TransactionClient,
  productType: string
): Promise<ResolvedStoreProduct> {
  const product = await db.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { id: productType },
        { name: productType },
      ],
    },
    select: {
      id: true,
      name: true,
      price: true,
      operationalMapping: {
        select: {
          id: true,
          productCode: true,
          storeSection: true,
          deviceType: true,
          purchaseFlow: true,
          requiresCompanyContext: true,
          isPublished: true,
          finishedGoodId: true,
          finishedGood: {
            select: { id: true, code: true, name: true, status: true },
          },
        },
      },
    },
  });

  if (!product) {
    throw new Error("Producto invalido o no disponible");
  }

  const mapping = product.operationalMapping;
  if (!mapping || !mapping.isPublished || !mapping.productCode || !mapping.finishedGoodId || !mapping.finishedGood) {
    throw new Error("El producto seleccionado no tiene una configuración operativa válida.");
  }

  if (!isStoreSection(mapping.storeSection) || mapping.storeSection !== "personal_devices") {
    throw new Error("El producto seleccionado no está disponible para compra personal.");
  }

  if (mapping.finishedGood.status === "inactive") {
    throw new Error("El producto seleccionado no tiene inventario operativo activo.");
  }

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    operationalMapping: {
      id: mapping.id,
      productCode: mapping.productCode,
      storeSection: mapping.storeSection,
      deviceType: mapping.deviceType,
      purchaseFlow: mapping.purchaseFlow,
      requiresCompanyContext: mapping.requiresCompanyContext,
      isPublished: mapping.isPublished,
      finishedGoodId: mapping.finishedGoodId,
      finishedGood: mapping.finishedGood,
    },
  };
}

export async function calculateStoreOrderFulfillment(
  items: Array<{
    productId: string;
    productName: string;
    productCode: string;
    productType: string;
    operationalMappingId: string;
    finishedGoodId: string;
    quantity: number;
    unitPrice: number;
  }>
): Promise<{ resolvedItems: StoreOrderResolvedItem[]; summary: StoreOrderFulfillmentSummary }> {
  const stockRows = await loadInventoryStockRows();
  const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));
  const productionEstimateDays = 14;

  const resolvedItems = items.map((item) => {
    const requestedQty = normalizeQuantity(item.quantity);
    const availableStock = Math.max(0, stockByCode.get(item.productCode)?.availableCount ?? 0);
    const stockCoveredQty = Math.min(requestedQty, availableStock);
    const backorderQty = Math.max(requestedQty - availableStock, 0);
    const fulfillmentMode: StoreOrderResolvedItem["fulfillmentMode"] =
      availableStock <= 0
        ? "production_backorder"
        : backorderQty > 0
          ? "partial_backorder"
          : "stock";

    return {
      ...item,
      quantity: requestedQty,
      availableStock,
      stockCoveredQty,
      backorderQty,
      fulfillmentMode,
      productionEstimateDays,
      customerMessage: buildCustomerMessage(availableStock, requestedQty, backorderQty),
    };
  });

  return {
    resolvedItems,
    summary: {
      hasBackorder: resolvedItems.some((item) => item.backorderQty > 0),
      productionEstimateDays,
      items: resolvedItems.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        quantity: item.quantity,
        availableStock: item.availableStock,
        stockCoveredQty: item.stockCoveredQty,
        backorderQty: item.backorderQty,
        fulfillmentMode: item.fulfillmentMode,
        productionEstimateDays: item.productionEstimateDays,
        customerMessage: item.customerMessage,
      })),
    },
  };
}

export function buildStoreOrderInternalNote(
  summary: StoreOrderFulfillmentSummary
) {
  const fragments = summary.items.map((item) => {
    return `${item.productCode}: disponible=${item.availableStock}, solicitada=${item.quantity}, backorder=${item.backorderQty}, modo=${item.fulfillmentMode}, estimado=${item.productionEstimateDays}d`;
  });

  return [
    `Stock/backorder calculado automáticamente.`,
    `Tiene backorder: ${summary.hasBackorder ? "sí" : "no"}.`,
    `Producción estimada: ${summary.productionEstimateDays} días.`,
    `customerMessage:${summary.hasBackorder ? "Si tu pedido supera el stock disponible, producción estimada: 2 semanas." : "Disponible para pedido."}`,
    ...fragments,
  ].join("\n");
}

export function buildOperationalStoreItemNotes(item: StoreOrderResolvedItem) {
  return [
    `stock:${item.availableStock}`,
    `requested:${item.quantity}`,
    `covered:${item.stockCoveredQty}`,
    `backorder:${item.backorderQty}`,
    `mode:${item.fulfillmentMode}`,
    `estimateDays:${item.productionEstimateDays}`,
  ].join("|");
}

export type CustomerFulfillmentSummary = {
  hasBackorder: boolean;
  productionEstimateDays: number;
  customerMessage: string | null;
};

export function parseCustomerFulfillmentSummaryFromInternalNote(
  note: string | null | undefined
): CustomerFulfillmentSummary | null {
  if (!note) return null;

  const hasBackorderMatch = note.match(/Tiene backorder:\s*(sí|si|no)\./i);
  const productionEstimateMatch = note.match(/Producción estimada:\s*(\d+)\s*días\./i);
  const customerMessageMatch = note.match(/customerMessage:(.+)/i);

  const hasBackorder = hasBackorderMatch ? /^s/i.test(hasBackorderMatch[1]) : false;
  const productionEstimateDays = productionEstimateMatch ? Number(productionEstimateMatch[1]) : 14;
  const customerMessage = customerMessageMatch?.[1]?.trim() || null;

  if (!hasBackorder && !customerMessageMatch && !productionEstimateMatch) {
    return null;
  }

  return {
    hasBackorder,
    productionEstimateDays: Number.isFinite(productionEstimateDays) ? productionEstimateDays : 14,
    customerMessage,
  };
}

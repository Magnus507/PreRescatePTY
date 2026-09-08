import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function buildCustomerProductionCode(orderNumber: string) {
  const safe = orderNumber.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 68);
  return `PROD-${safe}`;
}

export function buildCustomerProductProductionCode(orderNumber: string, productCode: string) {
  const safeOrder = orderNumber.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 48);
  const safeProduct = productCode.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 24);
  return `PROD-${safeOrder}-${safeProduct}`.slice(0, 80);
}

export async function ensureCustomerBackorderProduction(
  db: DbClient,
  input: {
    orderId: string;
    orderNumber: string;
    customerName?: string | null;
    backorderQty: number;
    outputType: string;
    productName: string;
    productCode?: string | null;
    createdById?: string | null;
  }
) {
  const backorderQty = Math.max(0, Math.floor(Number(input.backorderQty) || 0));
  if (backorderQty <= 0) return null;

  const productCode = input.productCode?.trim() || input.outputType.trim();
  if (!productCode) throw new Error("CUSTOMER_PRODUCTION_PRODUCT_CODE_REQUIRED");

  const outputType = input.outputType.trim();
  if (!outputType) throw new Error("CUSTOMER_PRODUCTION_OUTPUT_TYPE_REQUIRED");

  const code = buildCustomerProductProductionCode(input.orderNumber, productCode);
  const existing = await db.operationProductionOrder.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      plannedQuantity: true,
      producedQuantity: true,
      outputType: true,
    },
  });
  if (existing) {
    if (existing.outputType !== outputType) {
      throw new Error("CUSTOMER_PRODUCTION_IDENTITY_CONFLICT");
    }
    return { productionOrder: existing, created: false };
  }

  // Backward compatibility: before product-scoped codes existed, one production
  // used PROD-{orderNumber}. Reuse it only when its exact output identity matches
  // this requested product; never let a legacy production for SKU A satisfy SKU B.
  const legacyCode = buildCustomerProductionCode(input.orderNumber);
  const legacy = await db.operationProductionOrder.findUnique({
    where: { code: legacyCode },
    select: {
      id: true,
      code: true,
      status: true,
      plannedQuantity: true,
      producedQuantity: true,
      outputType: true,
    },
  });
  if (legacy && legacy.outputType === outputType) {
    return { productionOrder: legacy, created: false };
  }

  const productionOrder = await db.operationProductionOrder.create({
    data: {
      code,
      title: `Pedido ${input.orderNumber} · ${input.productName}`.slice(0, 180),
      status: "planned",
      plannedQuantity: backorderQty,
      producedQuantity: 0,
      outputType: outputType.slice(0, 120),
      notes: `Producción por falta de stock para pedido cliente ${input.orderNumber}. Producto: ${productCode}. Cliente: ${input.customerName || "Sin nombre"}.`,
      events: {
        create: {
          eventType: "CREATED",
          quantity: backorderQty,
          reason: "Backorder de pedido cliente enviado a producción",
          metadataJson: JSON.stringify({
            sourceType: "customer_order",
            orderId: input.orderId,
            orderNumber: input.orderNumber,
            backorderQty,
            outputType,
            productCode,
            productName: input.productName,
            productionScope: "order_product",
          }),
          createdById: input.createdById || null,
        },
      },
    },
    select: {
      id: true,
      code: true,
      status: true,
      plannedQuantity: true,
      producedQuantity: true,
      outputType: true,
    },
  });

  return { productionOrder, created: true };
}

export type CustomerBackorderRequirement = {
  productCode: string;
  missingQty: number;
};

/**
 * Creates exactly one idempotent production order per missing operational SKU.
 * The operational projection is the identity source of truth: callers must not
 * infer output identity from the first checkout item, text notes, or aggregate
 * missing quantity.
 */
export async function ensureCustomerBackorderProductions(
  db: DbClient,
  input: {
    commercialOrderId: string;
    orderId: string;
    orderNumber: string;
    customerName?: string | null;
    missingItems: CustomerBackorderRequirement[];
    createdById?: string | null;
  }
) {
  const missingByCode = new Map<string, number>();
  for (const missing of input.missingItems) {
    const productCode = missing.productCode?.trim();
    const missingQty = Math.max(0, Math.floor(Number(missing.missingQty) || 0));
    if (!productCode && missingQty > 0) {
      throw new Error("CUSTOMER_PRODUCTION_PRODUCT_CODE_REQUIRED");
    }
    if (!productCode || missingQty <= 0) continue;
    missingByCode.set(productCode, (missingByCode.get(productCode) || 0) + missingQty);
  }

  if (missingByCode.size === 0) return [];

  const commercialOrder = await db.operationCommercialOrder.findUnique({
    where: { id: input.commercialOrderId },
    select: {
      id: true,
      sourceId: true,
      customerType: true,
      items: {
        select: {
          productCode: true,
          productName: true,
          finishedGoodId: true,
          finishedGood: {
            select: { code: true, name: true, productType: true },
          },
        },
      },
    },
  });

  if (!commercialOrder) throw new Error("COMMERCIAL_ORDER_NOT_FOUND");
  if (commercialOrder.customerType === "internal") {
    throw new Error("INTERNAL_ORDER_NO_CUSTOMER_BACKORDER");
  }
  if (commercialOrder.sourceId && commercialOrder.sourceId !== input.orderId) {
    throw new Error("CUSTOMER_PRODUCTION_ORDER_IDENTITY_CONFLICT");
  }

  const productMetadata = new Map<
    string,
    { productCode: string; productName: string; outputType: string }
  >();

  for (const item of commercialOrder.items) {
    const productCode = item.finishedGood?.code?.trim() || item.productCode?.trim() || "";
    if (!productCode) continue;
    const metadata = {
      productCode,
      productName: item.finishedGood?.name?.trim() || item.productName.trim() || productCode,
      outputType: item.finishedGood?.productType?.trim() || item.productCode?.trim() || productCode,
    };
    const existing = productMetadata.get(productCode);
    if (
      existing &&
      (existing.outputType !== metadata.outputType || existing.productName !== metadata.productName)
    ) {
      throw new Error("CUSTOMER_PRODUCTION_OPERATIONAL_IDENTITY_CONFLICT");
    }
    productMetadata.set(productCode, metadata);
  }

  const results = [];
  for (const [productCode, missingQty] of missingByCode) {
    const metadata = productMetadata.get(productCode);
    if (!metadata) throw new Error("CUSTOMER_PRODUCTION_OPERATIONAL_PRODUCT_NOT_FOUND");

    const production = await ensureCustomerBackorderProduction(db, {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      customerName: input.customerName,
      backorderQty: missingQty,
      outputType: metadata.outputType,
      productCode: metadata.productCode,
      productName: metadata.productName,
      createdById: input.createdById,
    });

    if (production) {
      results.push({
        productCode,
        missingQty,
        ...production,
      });
    }
  }

  return results;
}

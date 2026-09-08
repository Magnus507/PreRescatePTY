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

type SingleCustomerProductionInput = {
  orderId: string;
  orderNumber: string;
  customerName?: string | null;
  backorderQty: number;
  outputType: string;
  productName: string;
  productCode?: string | null;
  createdById?: string | null;
};

async function ensureSingleCustomerBackorderProduction(
  db: DbClient,
  input: SingleCustomerProductionInput
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

  const results: Array<{
    productCode: string;
    missingQty: number;
    productionOrder: {
      id: string;
      code: string;
      status: string;
      plannedQuantity: number;
      producedQuantity: number;
      outputType: string;
    };
    created: boolean;
  }> = [];

  for (const [productCode, missingQty] of missingByCode) {
    const metadata = productMetadata.get(productCode);
    if (!metadata) throw new Error("CUSTOMER_PRODUCTION_OPERATIONAL_PRODUCT_NOT_FOUND");

    const production = await ensureSingleCustomerBackorderProduction(db, {
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

/**
 * Backward-compatible entry point used by older order routes. When an
 * operational projection exists, ignore the caller's aggregate/first-item
 * inference and derive the real current missing demand per SKU instead.
 */
export async function ensureCustomerBackorderProduction(
  db: DbClient,
  input: SingleCustomerProductionInput
) {
  const commercialOrder = await db.operationCommercialOrder.findFirst({
    where: {
      sourceId: input.orderId,
      customerType: { not: "internal" },
    },
    select: {
      id: true,
      sourceId: true,
      items: {
        select: {
          quantity: true,
          productCode: true,
          finishedGoodId: true,
          finishedGood: { select: { code: true } },
        },
      },
    },
  });

  if (!commercialOrder) {
    return ensureSingleCustomerBackorderProduction(db, input);
  }

  const requiredByCode = new Map<string, number>();
  for (const item of commercialOrder.items) {
    const productCode = item.finishedGood?.code?.trim() || item.productCode?.trim() || "";
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (!productCode && quantity > 0) {
      throw new Error("CUSTOMER_PRODUCTION_PRODUCT_CODE_REQUIRED");
    }
    if (!productCode || quantity <= 0) continue;
    requiredByCode.set(productCode, (requiredByCode.get(productCode) || 0) + quantity);
  }

  const reservationOrderId = commercialOrder.sourceId || commercialOrder.id;
  const reservedUnits = await db.operationFinishedGoodUnit.findMany({
    where: {
      reservedOrderId: reservationOrderId,
      status: "reserved",
      dispatchItems: { none: {} },
    },
    select: { productCode: true },
  });
  const reservedByCode = new Map<string, number>();
  for (const unit of reservedUnits) {
    reservedByCode.set(unit.productCode, (reservedByCode.get(unit.productCode) || 0) + 1);
  }

  const missingItems: CustomerBackorderRequirement[] = [];
  for (const [productCode, requiredQty] of requiredByCode) {
    const missingQty = Math.max(0, requiredQty - (reservedByCode.get(productCode) || 0));
    if (missingQty > 0) missingItems.push({ productCode, missingQty });
  }

  const productions = await ensureCustomerBackorderProductions(db, {
    commercialOrderId: commercialOrder.id,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    missingItems,
    createdById: input.createdById,
  });

  if (productions.length === 0) return null;

  const requestedProductCode = input.productCode?.trim() || input.outputType.trim();
  const primary = productions.find((row) => row.productCode === requestedProductCode) || productions[0];

  return {
    productionOrder: primary.productionOrder,
    created: productions.some((row) => row.created),
    productions,
  };
}

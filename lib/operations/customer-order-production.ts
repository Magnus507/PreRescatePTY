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
    if (existing.outputType !== input.outputType) {
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
  if (legacy && legacy.outputType === input.outputType) {
    return { productionOrder: legacy, created: false };
  }

  const productionOrder = await db.operationProductionOrder.create({
    data: {
      code,
      title: `Pedido ${input.orderNumber} · ${input.productName}`.slice(0, 180),
      status: "planned",
      plannedQuantity: backorderQty,
      producedQuantity: 0,
      outputType: input.outputType.slice(0, 120),
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
            outputType: input.outputType,
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

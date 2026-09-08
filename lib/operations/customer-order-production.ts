import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function buildCustomerProductionCode(orderNumber: string) {
  const safe = orderNumber.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 68);
  return `PROD-${safe}`;
}

async function resolveCanonicalFinishedGood(
  db: DbClient,
  input: {
    finishedGoodId?: string | null;
    productCode?: string | null;
    outputType: string;
  }
) {
  if (input.finishedGoodId) {
    const byId = await db.operationFinishedGood.findUnique({
      where: { id: input.finishedGoodId },
      select: { id: true, code: true, name: true, productType: true },
    });
    if (byId) return byId;
  }

  const exactCodes = Array.from(
    new Set([input.productCode, input.outputType].filter((value): value is string => Boolean(value?.trim())))
  );

  if (exactCodes.length > 0) {
    const byCode = await db.operationFinishedGood.findFirst({
      where: { code: { in: exactCodes } },
      orderBy: { createdAt: "asc" },
      select: { id: true, code: true, name: true, productType: true },
    });
    if (byCode) return byCode;
  }

  return db.operationFinishedGood.findFirst({
    where: { productType: input.outputType },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true, productType: true },
  });
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
    finishedGoodId?: string | null;
    commercialOrderId?: string | null;
    createdById?: string | null;
  }
) {
  const backorderQty = Math.max(0, Math.floor(Number(input.backorderQty) || 0));
  if (backorderQty <= 0) return null;

  const code = buildCustomerProductionCode(input.orderNumber);
  const existing = await db.operationProductionOrder.findUnique({
    where: { code },
    select: { id: true, code: true, status: true, plannedQuantity: true },
  });
  if (existing) return { productionOrder: existing, created: false };

  // Customer production must use the finished-good productType as outputType and
  // preserve its canonical SKU separately as productCode. Some legacy callers
  // passed the SKU in outputType; normalize at this boundary so that downstream
  // digital batch, assembly, QC and reservation all share the same identity.
  const canonicalFinishedGood = await resolveCanonicalFinishedGood(db, input);
  const outputType = canonicalFinishedGood?.productType || input.outputType;
  const productCode = canonicalFinishedGood?.code || input.productCode || null;
  const productName = canonicalFinishedGood?.name || input.productName;
  const finishedGoodId = canonicalFinishedGood?.id || input.finishedGoodId || null;

  const productionOrder = await db.operationProductionOrder.create({
    data: {
      code,
      title: `Pedido ${input.orderNumber} · ${productName}`.slice(0, 180),
      status: "planned",
      plannedQuantity: backorderQty,
      producedQuantity: 0,
      outputType: outputType.slice(0, 120),
      notes: `Producción por falta de stock para pedido cliente ${input.orderNumber}. Cliente: ${input.customerName || "Sin nombre"}.`,
      events: {
        create: {
          eventType: "CREATED",
          quantity: backorderQty,
          reason: "Backorder de pedido cliente enviado a producción",
          metadataJson: JSON.stringify({
            sourceType: "customer_order",
            orderId: input.orderId,
            commercialOrderId: input.commercialOrderId || null,
            orderNumber: input.orderNumber,
            backorderQty,
            outputType,
            productCode,
            productName,
            finishedGoodId,
          }),
          createdById: input.createdById || null,
        },
      },
    },
    select: { id: true, code: true, status: true, plannedQuantity: true },
  });

  return { productionOrder, created: true };
}

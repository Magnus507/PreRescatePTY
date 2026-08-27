import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function buildCustomerProductionCode(orderNumber: string) {
  const safe = orderNumber.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 68);
  return `PROD-${safe}`;
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

  const code = buildCustomerProductionCode(input.orderNumber);
  const existing = await db.operationProductionOrder.findUnique({
    where: { code },
    select: { id: true, code: true, status: true, plannedQuantity: true },
  });
  if (existing) return { productionOrder: existing, created: false };

  const productionOrder = await db.operationProductionOrder.create({
    data: {
      code,
      title: `Pedido ${input.orderNumber} · ${input.productName}`.slice(0, 180),
      status: "planned",
      plannedQuantity: backorderQty,
      producedQuantity: 0,
      outputType: input.outputType.slice(0, 120),
      notes: `Producción por falta de stock para pedido cliente ${input.orderNumber}. Cliente: ${input.customerName || "Sin nombre"}.`,
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
            productCode: input.productCode || null,
            productName: input.productName,
          }),
          createdById: input.createdById || null,
        },
      },
    },
    select: { id: true, code: true, status: true, plannedQuantity: true },
  });

  return { productionOrder, created: true };
}

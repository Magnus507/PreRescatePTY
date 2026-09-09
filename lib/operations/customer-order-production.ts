import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

type BackorderRequirement = {
  productCode: string;
  productName: string;
  missingQty: number;
};

type BackorderResolution = {
  commercialOrderId: string | null;
  requirements: BackorderRequirement[];
};

export function buildCustomerProductionCode(orderNumber: string, productionKey?: string | null) {
  const safeOrder = orderNumber.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 68);
  const safeKey = productionKey
    ?.trim()
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 40);
  return safeKey ? `PROD-${safeOrder}-${safeKey}`.slice(0, 120) : `PROD-${safeOrder}`;
}

async function resolveBackorderRequirements(
  db: DbClient,
  orderId: string
): Promise<BackorderResolution> {
  const candidate = await db.operationCommercialOrder.findFirst({
    where: { sourceId: orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!candidate) {
    return { commercialOrderId: null, requirements: [] };
  }

  // All production decisions for the same customer demand must be based on one
  // serialized operational snapshot. When called inside the normal transaction
  // flows this row write locks the commercial order, so concurrent retries cannot
  // both derive/create production from the same shortage independently.
  await db.operationCommercialOrder.updateMany({
    where: { id: candidate.id },
    data: { updatedAt: new Date() },
  });

  const commercialOrder = await db.operationCommercialOrder.findUnique({
    where: { id: candidate.id },
    include: {
      items: {
        include: {
          finishedGood: {
            select: { code: true, name: true },
          },
        },
      },
    },
  });

  if (!commercialOrder) {
    return { commercialOrderId: null, requirements: [] };
  }

  const requiredByCode = new Map<string, { productName: string; requiredQty: number }>();
  for (const item of commercialOrder.items) {
    const productCode = item.finishedGood?.code || item.productCode?.trim() || item.finishedGoodId || "";
    if (!productCode) continue;
    const existing = requiredByCode.get(productCode);
    if (existing) {
      existing.requiredQty += item.quantity;
    } else {
      requiredByCode.set(productCode, {
        productName: item.finishedGood?.name || item.productName || productCode,
        requiredQty: item.quantity,
      });
    }
  }

  const reservedUnits = await db.operationFinishedGoodUnit.findMany({
    where: {
      reservedOrderId: orderId,
      status: "reserved",
      dispatchItems: { none: {} },
    },
    select: { productCode: true },
  });
  const reservedByCode = new Map<string, number>();
  for (const unit of reservedUnits) {
    reservedByCode.set(unit.productCode, (reservedByCode.get(unit.productCode) || 0) + 1);
  }

  const requirements = Array.from(requiredByCode.entries())
    .map(([productCode, requirement]) => ({
      productCode,
      productName: requirement.productName,
      missingQty: Math.max(
        0,
        requirement.requiredQty - (reservedByCode.get(productCode) || 0)
      ),
    }))
    .filter((requirement) => requirement.missingQty > 0);

  return { commercialOrderId: commercialOrder.id, requirements };
}

async function ensureSingleCustomerBackorderProduction(
  db: DbClient,
  input: {
    orderId: string;
    orderNumber: string;
    customerName?: string | null;
    backorderQty: number;
    outputType: string;
    productName: string;
    productCode: string;
    productionKey?: string | null;
    createdById?: string | null;
  }
) {
  const code = buildCustomerProductionCode(input.orderNumber, input.productionKey);
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
      plannedQuantity: input.backorderQty,
      producedQuantity: 0,
      outputType: input.outputType.slice(0, 120),
      notes: `Producción por falta de stock para pedido cliente ${input.orderNumber}. Cliente: ${input.customerName || "Sin nombre"}.`,
      events: {
        create: {
          eventType: "CREATED",
          quantity: input.backorderQty,
          reason: "Backorder de pedido cliente enviado a producción",
          metadataJson: JSON.stringify({
            sourceType: "customer_order",
            orderId: input.orderId,
            orderNumber: input.orderNumber,
            backorderQty: input.backorderQty,
            outputType: input.outputType,
            productCode: input.productCode,
            productName: input.productName,
            productionKey: input.productionKey || null,
          }),
          createdById: input.createdById || null,
        },
      },
    },
    select: { id: true, code: true, status: true, plannedQuantity: true },
  });

  return { productionOrder, created: true };
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
    productionKey?: string | null;
    createdById?: string | null;
  }
) {
  const backorderQty = Math.max(0, Math.floor(Number(input.backorderQty) || 0));
  if (backorderQty <= 0) return null;

  // Resolve the canonical outstanding requirement from the operational order in
  // the same transaction that performs the production decision. A stale UI/note
  // may still say "backorder" after stock was reserved later; when a commercial
  // projection exists, zero live shortage means zero production. The legacy
  // fallback is used only when no operational projection exists at all.
  const resolution = await resolveBackorderRequirements(db, input.orderId);
  if (resolution.commercialOrderId && resolution.requirements.length === 0) {
    return null;
  }

  const effectiveRequirements = resolution.requirements.length > 0
    ? resolution.requirements
    : [{
        productCode: input.productCode?.trim() || input.outputType.trim(),
        productName: input.productName,
        missingQty: backorderQty,
      }];

  const multiSku = effectiveRequirements.length > 1;
  const productions = [];
  for (const requirement of effectiveRequirements) {
    const production = await ensureSingleCustomerBackorderProduction(db, {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      customerName: input.customerName,
      backorderQty: requirement.missingQty,
      outputType: requirement.productCode,
      productCode: requirement.productCode,
      productName: requirement.productName,
      productionKey: multiSku ? requirement.productCode : input.productionKey,
      createdById: input.createdById,
    });
    productions.push(production);
  }

  return {
    productionOrder: productions[0]?.productionOrder || null,
    productionOrders: productions.map((entry) => entry.productionOrder),
    created: productions.some((entry) => entry.created),
  };
}

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  isCommercialOrderEligibleForReservation,
  reserveCommercialOrderStock,
  type CommercialOrderReservationResult,
} from "@/lib/operations/commercial-order-reservation";

type DbClient = PrismaClient | Prisma.TransactionClient;

type CreatedMetadata = {
  sourceType: string | null;
  orderSource: string | null;
  orderId: string | null;
  commercialOrderId: string | null;
  productCode: string | null;
  finishedGoodId: string | null;
};

type CanonicalFinishedGood = {
  id: string;
  code: string;
  name: string;
  productType: string;
};

export type CustomerProductionRoutingContext = {
  kind: "customer" | "internal" | "unlinked";
  productionOrderId: string;
  customerOrderId: string | null;
  commercialOrder: null | {
    id: string;
    sourceId: string | null;
    customerType: string;
    status: string;
    paymentStatus: string;
  };
  canonicalFinishedGood: CanonicalFinishedGood | null;
};

export type CustomerProductionRoutingResult = CustomerProductionRoutingContext & {
  unit: null | {
    id: string;
    productCode: string;
    productName: string;
    productType: string;
    status: string;
    qaStatus: string | null;
    activationStatus: string;
    reservedOrderId: string | null;
  };
  reservation: CommercialOrderReservationResult | null;
  identityReconciled: boolean;
};

function parseMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readCreatedMetadata(
  events: Array<{ eventType: string; metadataJson: string | null }>
): CreatedMetadata {
  for (const event of events) {
    if (event.eventType !== "CREATED") continue;
    const metadata = parseMetadata(event.metadataJson);
    if (!metadata) continue;
    return {
      sourceType: stringValue(metadata.sourceType),
      orderSource: stringValue(metadata.orderSource),
      orderId: stringValue(metadata.orderId),
      commercialOrderId: stringValue(metadata.commercialOrderId),
      productCode: stringValue(metadata.productCode),
      finishedGoodId: stringValue(metadata.finishedGoodId),
    };
  }

  return {
    sourceType: null,
    orderSource: null,
    orderId: null,
    commercialOrderId: null,
    productCode: null,
    finishedGoodId: null,
  };
}

function uniqueFinishedGoods(
  items: Array<{ finishedGood: CanonicalFinishedGood | null }>
) {
  const byId = new Map<string, CanonicalFinishedGood>();
  for (const item of items) {
    if (item.finishedGood) byId.set(item.finishedGood.id, item.finishedGood);
  }
  return Array.from(byId.values());
}

export async function resolveCustomerProductionRoutingContext(
  db: DbClient,
  productionOrderId: string
): Promise<CustomerProductionRoutingContext> {
  const productionOrder = await db.operationProductionOrder.findUnique({
    where: { id: productionOrderId },
    select: {
      id: true,
      code: true,
      notes: true,
      outputType: true,
      events: {
        where: { eventType: "CREATED" },
        orderBy: { createdAt: "asc" },
        select: { eventType: true, metadataJson: true },
      },
    },
  });

  if (!productionOrder) throw new Error("CUSTOMER_PRODUCTION_NOT_FOUND");

  const metadata = readCreatedMetadata(productionOrder.events);
  const legacyCommercialOrderId =
    productionOrder.notes?.match(/\[commercialOrderId:([^\]]+)\]/)?.[1] ||
    productionOrder.notes?.match(/W605H-B-BACKORDER-PRODUCTION:([^\s]+)/)?.[1] ||
    null;
  const internal =
    metadata.orderSource === "internal" ||
    productionOrder.code.startsWith("PROD-INT-") ||
    Boolean(productionOrder.notes?.includes("Pedido interno para fabricar inventario"));

  if (internal) {
    return {
      kind: "internal",
      productionOrderId,
      customerOrderId: null,
      commercialOrder: null,
      canonicalFinishedGood: null,
    };
  }

  const customerOrderId = metadata.sourceType === "customer_order" ? metadata.orderId : null;
  const requestedCommercialOrderId = metadata.commercialOrderId || legacyCommercialOrderId;

  let commercialOrder = requestedCommercialOrderId
    ? await db.operationCommercialOrder.findUnique({
        where: { id: requestedCommercialOrderId },
        select: {
          id: true,
          sourceId: true,
          customerType: true,
          status: true,
          paymentStatus: true,
          items: {
            select: {
              productCode: true,
              finishedGoodId: true,
              finishedGood: {
                select: { id: true, code: true, name: true, productType: true },
              },
            },
          },
        },
      })
    : null;

  if (!commercialOrder && customerOrderId) {
    commercialOrder = await db.operationCommercialOrder.findFirst({
      where: { sourceId: customerOrderId, customerType: { not: "internal" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sourceId: true,
        customerType: true,
        status: true,
        paymentStatus: true,
        items: {
          select: {
            productCode: true,
            finishedGoodId: true,
            finishedGood: {
              select: { id: true, code: true, name: true, productType: true },
            },
          },
        },
      },
    });
  }

  if (commercialOrder?.customerType === "internal") {
    return {
      kind: "internal",
      productionOrderId,
      customerOrderId: null,
      commercialOrder: null,
      canonicalFinishedGood: null,
    };
  }

  const customerIntent = Boolean(customerOrderId || requestedCommercialOrderId || commercialOrder);
  if (!customerIntent) {
    return {
      kind: "unlinked",
      productionOrderId,
      customerOrderId: null,
      commercialOrder: null,
      canonicalFinishedGood: null,
    };
  }

  if (!commercialOrder) throw new Error("CUSTOMER_PRODUCTION_ORDER_NOT_FOUND");

  const candidates = uniqueFinishedGoods(commercialOrder.items);
  const canonicalFinishedGood =
    (metadata.finishedGoodId
      ? candidates.find((item) => item.id === metadata.finishedGoodId)
      : null) ||
    (metadata.productCode
      ? candidates.find((item) => item.code === metadata.productCode)
      : null) ||
    candidates.find(
      (item) =>
        item.code === productionOrder.outputType ||
        item.productType === productionOrder.outputType
    ) ||
    (candidates.length === 1 ? candidates[0] : null);

  if (!canonicalFinishedGood) {
    throw new Error("CUSTOMER_PRODUCTION_PRODUCT_UNRESOLVED");
  }

  return {
    kind: "customer",
    productionOrderId,
    customerOrderId: customerOrderId || commercialOrder.sourceId || null,
    commercialOrder: {
      id: commercialOrder.id,
      sourceId: commercialOrder.sourceId,
      customerType: commercialOrder.customerType,
      status: commercialOrder.status,
      paymentStatus: commercialOrder.paymentStatus,
    },
    canonicalFinishedGood,
  };
}

export async function routeCustomerProductionUnit(
  db: DbClient,
  input: { productionOrderId: string; unitId: string }
): Promise<CustomerProductionRoutingResult> {
  const context = await resolveCustomerProductionRoutingContext(db, input.productionOrderId);
  const unit = await db.operationFinishedGoodUnit.findUnique({
    where: { id: input.unitId },
    select: {
      id: true,
      productCode: true,
      productName: true,
      productType: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
      digitalBatchItem: { select: { productionOrderId: true } },
    },
  });

  if (!unit) throw new Error("CUSTOMER_PRODUCTION_UNIT_NOT_FOUND");
  if (unit.digitalBatchItem?.productionOrderId !== input.productionOrderId) {
    throw new Error("CUSTOMER_PRODUCTION_UNIT_MISMATCH");
  }

  if (context.kind !== "customer") {
    return {
      ...context,
      unit: {
        id: unit.id,
        productCode: unit.productCode,
        productName: unit.productName,
        productType: unit.productType,
        status: unit.status,
        qaStatus: unit.qaStatus,
        activationStatus: unit.activationStatus,
        reservedOrderId: unit.reservedOrderId,
      },
      reservation: null,
      identityReconciled: false,
    };
  }

  if (unit.qaStatus !== "passed") throw new Error("CUSTOMER_PRODUCTION_UNIT_NOT_QA_PASSED");
  if (!context.canonicalFinishedGood || !context.commercialOrder) {
    throw new Error("CUSTOMER_PRODUCTION_CONTEXT_INCOMPLETE");
  }

  const canonical = context.canonicalFinishedGood;
  const identityReconciled =
    unit.productCode !== canonical.code ||
    unit.productName !== canonical.name ||
    unit.productType !== canonical.productType;

  if (identityReconciled) {
    if (
      !["available", "reserved"].includes(unit.status) ||
      unit.activationStatus === "activated"
    ) {
      throw new Error("CUSTOMER_PRODUCTION_IDENTITY_LOCKED");
    }

    await db.operationFinishedGoodUnit.update({
      where: { id: unit.id },
      data: {
        productCode: canonical.code,
        productName: canonical.name,
        productType: canonical.productType,
        events: {
          create: {
            eventType: "PRODUCT_IDENTITY_RECONCILED",
            reason: "Identidad física reconciliada con el producto canónico del pedido cliente",
            referenceType: "production_order",
            referenceId: input.productionOrderId,
            metadataJson: {
              previousProductCode: unit.productCode,
              previousProductType: unit.productType,
              canonicalProductCode: canonical.code,
              canonicalProductType: canonical.productType,
              commercialOrderId: context.commercialOrder.id,
              customerOrderId: context.customerOrderId,
            } as Prisma.InputJsonValue,
          },
        },
      },
    });
  }

  let reservation: CommercialOrderReservationResult | null = null;
  if (isCommercialOrderEligibleForReservation(context.commercialOrder)) {
    reservation = await reserveCommercialOrderStock(db as Prisma.TransactionClient, {
      orderId: context.commercialOrder.id,
      allowPartial: true,
    });
  }

  const refreshedUnit = await db.operationFinishedGoodUnit.findUnique({
    where: { id: unit.id },
    select: {
      id: true,
      productCode: true,
      productName: true,
      productType: true,
      status: true,
      qaStatus: true,
      activationStatus: true,
      reservedOrderId: true,
    },
  });

  return {
    ...context,
    unit: refreshedUnit,
    reservation,
    identityReconciled,
  };
}

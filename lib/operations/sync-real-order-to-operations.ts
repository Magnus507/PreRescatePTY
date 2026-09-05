import { Prisma, PrismaClient } from "@prisma/client";
import { mapCommercialItemToOperationalRequirement } from "@/lib/operations/commercial-product-mapping";
import { addMoney, moneyToNumber, multiplyMoney, parseMoney } from "@/lib/money";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type RealOrderSourceType =
  | "legacy_order"
  | "customer_request"
  | "enterprise_order"
  | "checkout"
  | "organization_order";

export type SyncRealOrderToOperationsInput = {
  sourceType: RealOrderSourceType;
  sourceId: string;
  sourceCode?: string | null;
  orderType: "customer" | "enterprise";
  customerName?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  customerReference?: string | null;
  paymentStatus?: string | null;
  paymentReference?: string | null;
  currency?: string | null;
  notes?: string | null;
  organizationId?: string | null;
  totalAmount?: Prisma.Decimal | Prisma.DecimalJsLike | number | string | null;
  salesChannel?: string | null;
  items: Array<{
    productId?: string | null;
    productCode?: string | null;
    productName: string;
    quantity: number;
    unitPrice: Prisma.Decimal | Prisma.DecimalJsLike | number | string;
    unit?: string | null;
    finishedGoodId?: string | null;
    operationalMappingId?: string | null;
    operationalProductCode?: string | null;
    operationalProductName?: string | null;
    operationalFinishedGoodId?: string | null;
  }>;
};

function buildSourceMarker(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function buildOrderCode(input: SyncRealOrderToOperationsInput) {
  if (input.sourceCode?.trim()) {
    return `OP-${input.orderType === "enterprise" ? "EMP" : "CLI"}-${input.sourceCode.trim()}`;
  }

  return `OP-${input.orderType === "enterprise" ? "EMP" : "CLI"}-${input.sourceId.slice(-8).toUpperCase()}`;
}

function buildCustomerName(input: SyncRealOrderToOperationsInput) {
  if (input.orderType === "enterprise") {
    return input.companyName?.trim() || input.customerName?.trim() || input.contactName?.trim() || null;
  }

  return input.customerName?.trim() || input.contactName?.trim() || null;
}

function buildNotes(input: SyncRealOrderToOperationsInput) {
  const fragments = [];

  if (input.notes?.trim()) {
    fragments.push(input.notes.trim());
  }

  if (input.paymentReference?.trim()) {
    fragments.push(`paymentReference:${input.paymentReference.trim()}`);
  }

  return fragments.join("\n");
}

export async function syncRealOrderToOperations(
  db: DbClient,
  input: SyncRealOrderToOperationsInput
) {
  const code = buildOrderCode(input);
  const customerName = buildCustomerName(input);
  const customerReference = input.customerReference?.trim() || null;
  const notes = buildNotes(input);
  const totalAmount = input.totalAmount !== undefined && input.totalAmount !== null
    ? parseMoney(input.totalAmount)
    : input.items.reduce((sum, item) => addMoney(sum, multiplyMoney(item.unitPrice, item.quantity)), parseMoney(0));

  const existing = await db.operationCommercialOrder.findFirst({
    where: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    select: { id: true },
  });

  const orderData = {
    code,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    status: "draft",
    customerType: input.orderType === "enterprise" ? "enterprise" : "customer",
    customerName,
    customerEmail: input.contactEmail?.trim() || null,
    customerPhone: input.contactPhone?.trim() || null,
    customerReference,
    salesChannel: input.salesChannel?.trim() || input.sourceType,
    paymentStatus: input.paymentStatus?.trim() || "pending",
    fulfillmentStatus: "pending",
    totalAmount,
    currency: input.currency?.trim() || "USD",
    notes,
  } satisfies Prisma.OperationCommercialOrderCreateInput;

  const mappedItems = await Promise.all(input.items.map(async (item) => {
    const directOperationalProductCode = item.operationalProductCode?.trim() || item.productCode?.trim() || null;
    const directOperationalProductName = item.operationalProductName?.trim() || item.productName?.trim() || null;
    const directFinishedGoodId = item.operationalFinishedGoodId?.trim() || item.finishedGoodId?.trim() || null;

    if (directOperationalProductCode && directFinishedGoodId) {
      return {
        finishedGoodId: directFinishedGoodId,
        productCode: directOperationalProductCode,
        productName: directOperationalProductName || item.productName,
        quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
        unitPrice: moneyToNumber(item.unitPrice),
        totalPrice: moneyToNumber(multiplyMoney(item.unitPrice, Math.max(1, Math.floor(Number(item.quantity || 1))))),
        unit: item.unit?.trim() || "unit",
        notes: item.operationalMappingId
          ? `[operationalMappingId:${item.operationalMappingId}]`
          : "[operationalMappingId:unmapped]",
      };
    }

    const mapping = await mapCommercialItemToOperationalRequirement({
      productType: item.productCode || item.productName,
      quantity: item.quantity,
      providerReference: input.customerReference || input.sourceCode || null,
      productName: item.productName,
    });

    return {
      finishedGoodId: item.finishedGoodId?.trim() || null,
      productCode: mapping.operationalProductCode,
      productName: mapping.operationalProductName,
      quantity: mapping.commercialQuantity,
      unitPrice: moneyToNumber(item.unitPrice),
      totalPrice: moneyToNumber(multiplyMoney(item.unitPrice, mapping.commercialQuantity)),
      unit: item.unit?.trim() || "unit",
      notes: mapping.operationalMappingStatus === "unmapped"
        ? `${mapping.sourceLabel} | mapping:unmapped`
        : `${mapping.sourceLabel}`,
    };
  }));

  if (existing) {
    const updated = await db.operationCommercialOrder.update({
      where: { id: existing.id },
      data: {
        ...orderData,
        // Retries synchronize commercial facts, never rewind fulfilment or replace
        // operational item identities after inventory/production work has started.
        status: ["cancelled", "rejected"].includes(input.paymentStatus || "") ? "cancelled" : undefined,
        fulfillmentStatus: undefined,
      },
    });

    return { order: updated, created: false, sourceKey: buildSourceMarker(input.sourceType, input.sourceId) };
  }

  const created = await db.operationCommercialOrder.create({
    data: {
      ...orderData,
      items: {
        create: mappedItems,
      },
    },
  });

  return { order: created, created: true, sourceKey: buildSourceMarker(input.sourceType, input.sourceId) };
}

export function getOperationCustomerReference(input: {
  sourceCode?: string | null;
  sourceId: string;
  paymentReference?: string | null;
}) {
  return input.paymentReference?.trim() || input.sourceCode?.trim() || input.sourceId;
}

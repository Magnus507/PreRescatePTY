import { Prisma, PrismaClient } from "@prisma/client";
import { mapCommercialItemToOperationalRequirement } from "@/lib/operations/commercial-product-mapping";

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
  totalAmount?: number;
  salesChannel?: string | null;
  items: Array<{
    productCode?: string | null;
    productName: string;
    quantity: number;
    unitPrice: number;
    unit?: string | null;
    finishedGoodId?: string | null;
  }>;
};

function buildSourceMarker(sourceType: string, sourceId: string) {
  return `[sourceType:${sourceType}][sourceId:${sourceId}]`;
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
  const marker = buildSourceMarker(input.sourceType, input.sourceId);
  const fragments = [marker];

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
  const sourceMarker = buildSourceMarker(input.sourceType, input.sourceId);
  const customerName = buildCustomerName(input);
  const customerReference = input.customerReference?.trim() || null;
  const notes = buildNotes(input);
  const totalAmount = input.totalAmount ?? input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const existing = await db.operationCommercialOrder.findFirst({
    where: {
      notes: {
        contains: sourceMarker,
      },
    },
    select: { id: true },
  });

  const orderData = {
    code,
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
      quantity: mapping.operationalQuantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      unit: item.unit?.trim() || "unit",
      notes: `${mapping.sourceLabel}`,
    };
  }));

  if (existing) {
    const updated = await db.operationCommercialOrder.update({
      where: { id: existing.id },
        data: {
          ...orderData,
          items: {
            deleteMany: {},
          create: mappedItems,
          },
        },
      });

    return { order: updated, created: false, sourceMarker };
  }

  const created = await db.operationCommercialOrder.create({
    data: {
      ...orderData,
      items: {
        create: mappedItems,
      },
    },
  });

  return { order: created, created: true, sourceMarker };
}

export function getOperationCustomerReference(input: {
  sourceCode?: string | null;
  sourceId: string;
  paymentReference?: string | null;
}) {
  return input.paymentReference?.trim() || input.sourceCode?.trim() || input.sourceId;
}

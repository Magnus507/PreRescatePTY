import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

type Status = "ok" | "warning" | "notFound" | "notApplicable";

type CountEntry = {
  label: string;
  count: number;
  status: Status;
  notes?: string;
};

type SampleEntry = Record<string, unknown>;

type SequenceAudit = {
  name: string;
  source: string;
  status: Status;
  currentValue: number | null;
  lastDetected: string | null;
  notes?: string;
};

const reportPath = path.join(process.cwd(), "tmp", "w601a-system-cleanup-audit.json");

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isLikelyTestText(value: unknown): boolean {
  const text = normalizeText(value);
  if (!text) return false;
  return [
    "test",
    "prueba",
    "demo",
    "dummy",
    "sample",
    "mock",
    "fake",
    "qa",
    "smoke",
    "sandbox",
    "temp",
  ].some((token) => text.includes(token));
}

function safeDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function extractTrailingNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

async function countIfExists(modelName: string, where?: Record<string, unknown>): Promise<number | null> {
  const delegate = (prisma as unknown as Record<string, unknown>)[modelName];
  if (!delegate || typeof delegate !== "object") return null;
  const fn = (delegate as { count?: (args?: { where?: Record<string, unknown> }) => Promise<number> }).count;
  if (!fn) return null;
  return fn.call(delegate, where ? { where } : undefined);
}

async function findManyIfExists<T>(
  modelName: string,
  args: Record<string, unknown>
): Promise<T[] | null> {
  const delegate = (prisma as unknown as Record<string, unknown>)[modelName];
  if (!delegate || typeof delegate !== "object") return null;
  const fn = (delegate as { findMany?: (args: Record<string, unknown>) => Promise<T[]> }).findMany;
  if (!fn) return null;
  return fn.call(delegate, args);
}

async function main() {
  console.log("=== W6.01A System Cleanup Read-Only Audit ===");
  console.log("Auditando datos operativos para limpieza futura.");
  console.log("No se ejecuta ninguna escritura en BD.");

  const now = new Date();

  const orders = await findManyIfExists<any>("order", {
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      orderStatus: true,
      paymentStatus: true,
      adminReviewStatus: true,
      providerReference: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      orderType: true,
      amount: true,
    },
  });

  const ordersTotal = await countIfExists("order");
  const orderStatusRows = await findManyIfExists<any>("order", {
    select: { orderStatus: true, paymentStatus: true, adminReviewStatus: true },
  });

  const internalOrders = await findManyIfExists<any>("operationCommercialOrder", {
    select: {
      id: true,
      code: true,
      customerType: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      createdAt: true,
      dispatchId: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const allInternalOrdersCount = await countIfExists("operationCommercialOrder");
  const productionOrders = await findManyIfExists<any>("operationProductionOrder", {
    select: {
      id: true,
      code: true,
      status: true,
      outputType: true,
      plannedQuantity: true,
      producedQuantity: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const productionOrderCount = await countIfExists("operationProductionOrder");
  const dispatchCount = await countIfExists("operationDispatch");
  const finishedGoodUnitCount = await countIfExists("operationFinishedGoodUnit");
  const digitalBatchCount = await countIfExists("operationDigitalBatch");
  const printOrderCount = await countIfExists("operationPrintOrder");
  const productCount = await countIfExists("product");
  const chipCount = await countIfExists("chip");
  const profileCount = await countIfExists("profile");

  const dispatches = await findManyIfExists<any>("operationDispatch", {
    select: {
      id: true,
      code: true,
      status: true,
      createdAt: true,
      sentAt: true,
      dispatchedAt: true,
      deliveredAt: true,
      commercialOrders: { select: { id: true, code: true } },
      items: { select: { id: true, dispatchId: true, unitId: true, internalLabel: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const units = await findManyIfExists<any>("operationFinishedGoodUnit", {
    select: {
      id: true,
      internalLabel: true,
      productCode: true,
      productName: true,
      productType: true,
      status: true,
      activationStatus: true,
      reservedOrderId: true,
      digitalBatchId: true,
      printOrderId: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { internalLabel: "asc" }],
    take: 25,
  });

  const profiles = await findManyIfExists<any>("profile", {
    select: { id: true, firstName: true, lastName: true, displayNamePublic: true, profileType: true, userId: true, digitalPass: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const ordersByStatus = new Map<string, number>();
  const paymentByStatus = new Map<string, number>();
  const reviewByStatus = new Map<string, number>();
  const testOrderCandidates: SampleEntry[] = [];

  for (const order of orderStatusRows || []) {
    ordersByStatus.set(order.orderStatus ?? "null", (ordersByStatus.get(order.orderStatus ?? "null") || 0) + 1);
    paymentByStatus.set(order.paymentStatus ?? "null", (paymentByStatus.get(order.paymentStatus ?? "null") || 0) + 1);
    reviewByStatus.set(order.adminReviewStatus ?? "null", (reviewByStatus.get(order.adminReviewStatus ?? "null") || 0) + 1);
  }

  for (const order of orders || []) {
    if (
      isLikelyTestText(order.orderNumber) ||
      isLikelyTestText(order.providerReference) ||
      isLikelyTestText(order.customerName) ||
      isLikelyTestText(order.customerEmail) ||
      isLikelyTestText(order.customerPhone)
    ) {
      testOrderCandidates.push(order);
    }
  }

  const internalOrderCandidates: SampleEntry[] = [];
  for (const order of internalOrders || []) {
    if (order.customerType === "internal" || isLikelyTestText(order.code)) {
      internalOrderCandidates.push(order);
    }
  }

  const dispatchOrphans = (dispatches || []).filter((dispatch) => !dispatch.commercialOrders?.length);
  const dispatchRelated = (dispatches || []).filter((dispatch) => dispatch.commercialOrders?.length);

  const unitStatusCounts = new Map<string, number>();
  const productCodeCounts = new Map<string, number>();
  const testUnitCandidates: SampleEntry[] = [];
  const orphanUnitCandidates: SampleEntry[] = [];
  for (const unit of units || []) {
    unitStatusCounts.set(unit.status ?? "null", (unitStatusCounts.get(unit.status ?? "null") || 0) + 1);
    productCodeCounts.set(unit.productCode ?? "null", (productCodeCounts.get(unit.productCode ?? "null") || 0) + 1);
    if (isLikelyTestText(unit.internalLabel) || isLikelyTestText(unit.productCode) || isLikelyTestText(unit.productName)) {
      testUnitCandidates.push(unit);
    }
    if (!unit.digitalBatchId && !unit.printOrderId && !unit.reservedOrderId) {
      orphanUnitCandidates.push(unit);
    }
  }

  const activationSummary = {
    totalProfiles: profileCount,
    profilesWithDigitalPass: profiles?.filter((profile) => Boolean(profile.digitalPass)).length ?? null,
    profilesWithoutDigitalPass: profiles?.filter((profile) => !profile.digitalPass).length ?? null,
    shortCodesExisting: chipCount,
    linksPublicExisting: chipCount,
  };

  const sequenceCandidates: SequenceAudit[] = [];
  const latestOrder = orders?.[0];
  const latestInternal = internalOrders?.[0];
  const latestProduction = productionOrders?.[0];
  const latestDispatch = dispatches?.[0];
  const latestUnit = units?.[0];

  sequenceCandidates.push({
    name: "Pedidos cliente",
    source: "Order.orderNumber",
    status: ordersTotal === null ? "notFound" : "ok",
    currentValue: latestOrder ? extractTrailingNumber(latestOrder.orderNumber) : null,
    lastDetected: latestOrder?.orderNumber ?? null,
    notes: "Se usa cuid por defecto; sin secuencia numérica explícita en el schema.",
  });
  sequenceCandidates.push({
    name: "Pedidos internos / producción",
    source: "OperationCommercialOrder.code",
    status: allInternalOrdersCount === null ? "notFound" : "ok",
    currentValue: latestInternal ? extractTrailingNumber(latestInternal.code) : null,
    lastDetected: latestInternal?.code ?? null,
    notes: "La secuencia operacional de pedidos internos parece derivarse del prefijo del código.",
  });
  sequenceCandidates.push({
    name: "Producción",
    source: "OperationProductionOrder.code",
    status: productionOrderCount === null ? "notFound" : "ok",
    currentValue: latestProduction ? extractTrailingNumber(latestProduction.code) : null,
    lastDetected: latestProduction?.code ?? null,
  });
  sequenceCandidates.push({
    name: "Despachos",
    source: "OperationDispatch.code",
    status: dispatchCount === null ? "notFound" : "ok",
    currentValue: latestDispatch ? extractTrailingNumber(latestDispatch.code) : null,
    lastDetected: latestDispatch?.code ?? null,
  });
  sequenceCandidates.push({
    name: "Inventory labels / internalLabel",
    source: "OperationDigitalBatchItem.internalLabel / OperationFinishedGoodUnit.internalLabel",
    status: finishedGoodUnitCount === null ? "notFound" : "ok",
    currentValue: latestUnit ? extractTrailingNumber(latestUnit.internalLabel) : null,
    lastDetected: latestUnit?.internalLabel ?? null,
  });

  const orderSamples = (orders || []).map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: safeDate(order.createdAt),
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    adminReviewStatus: order.adminReviewStatus,
    providerReference: order.providerReference,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    amount: order.amount,
  }));

  const report = {
    generatedAt: now.toISOString(),
    readOnly: true,
    summary: {
      general: {
        ordersTotal,
        internalOrdersTotal: allInternalOrdersCount,
        dispatchTotal: dispatchCount,
        finishedGoodUnitTotal: finishedGoodUnitCount,
        digitalBatchTotal: digitalBatchCount,
        printOrderTotal: printOrderCount,
        productionOrderTotal: productionOrderCount,
        productTotal: productCount,
        chipTotal: chipCount,
        profileTotal: profileCount,
      },
    },
    countsByModule: {
      customerOrders: {
        orderStatus: Object.fromEntries(ordersByStatus.entries()),
        paymentStatus: Object.fromEntries(paymentByStatus.entries()),
        adminReviewStatus: Object.fromEntries(reviewByStatus.entries()),
        latest10: orderSamples,
      },
      internalOrders: {
        total: allInternalOrdersCount,
        latest10: internalOrders,
      },
      dispatches: {
        total: dispatchCount,
        statusCounts: Object.fromEntries((dispatches || []).reduce((map, dispatch) => {
          map.set(dispatch.status ?? "null", (map.get(dispatch.status ?? "null") || 0) + 1);
          return map;
        }, new Map<string, number>())),
        relatedToOrders: dispatchRelated,
        orphanDispatches: dispatchOrphans,
      },
      inventory: {
        totalUnits: finishedGoodUnitCount,
        statusCounts: Object.fromEntries(unitStatusCounts.entries()),
        productCodeCounts: Object.fromEntries(productCodeCounts.entries()),
        activeUnits: await countIfExists("operationFinishedGoodUnit", { status: "active" }),
        reservedUnits: await countIfExists("operationFinishedGoodUnit", { reservedOrderId: { not: null } }),
        deliveredUnits: await countIfExists("operationFinishedGoodUnit", { deliveredAt: { not: null } }),
        orphanUnits: orphanUnitCandidates,
        testUnits: testUnitCandidates,
      },
      activations: activationSummary,
      sequences: sequenceCandidates,
      catalog: {
        totalProducts: productCount,
        model: "Product",
        mustPreserve: true,
        samples: await findManyIfExists<any>("product", {
          select: { id: true, name: true, productType: true, category: true, isActive: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      },
    },
    candidatesForCleanup: {
      testOrderCandidates,
      internalOrderCandidates,
      orphanDispatches: dispatchOrphans,
      orphanUnits: orphanUnitCandidates,
      testUnits: testUnitCandidates,
    },
    mustPreserve: {
      products: await findManyIfExists<any>("product", {
        select: { id: true, name: true, productType: true, category: true, isActive: true },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      schemaProtected: [
        "Product",
        "User",
        "Account",
        "Package",
        "Organization",
        "OrganizationMember",
        "SystemConfig",
      ],
    },
    risks: [
      "Heuristics de prueba basadas en texto pueden marcar falsos positivos.",
      "Los secuenciadores parecen implícitos por prefijo/código; no hay contador explícito detectado en el schema consultado.",
      "Algunas tablas operativas pueden existir con nombres distintos o no estar presentes en este entorno.",
    ],
    unknowns: [
      "Si existen tablas separadas para secuencias, no fueron detectadas en el schema leído.",
      "Si hay datos de prueba sin palabras clave obvias, este script no los puede inferir con total certeza.",
      "Activaciones públicas se infieren principalmente desde `Chip` y `DigitalPass`, no desde una tabla única de activaciones.",
    ],
    recommendedNextStep:
      "Si la revisión confirma estos conteos, preparar W6.01B con limpieza controlada y W6.01C para reinicio de secuencias, siempre sin tocar catálogo ni usuarios reales.",
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Reporte escrito en: ${reportPath}`);
  console.log("Confirmación: no se realizó ninguna escritura en la base de datos.");
  console.log("Tablas auditadas solo en lectura.");
}

main()
  .catch((error) => {
    console.error("W6.01A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

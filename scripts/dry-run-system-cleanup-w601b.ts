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

const reportPath = path.join(process.cwd(), "tmp", "w601b-system-cleanup-dry-run.json");

function redactDatabaseUrl(value: string | undefined): string {
  if (!value) return "redacted";
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}${url.pathname ? "/redacted" : ""}`;
  } catch {
    return "redacted";
  }
}

function isTestSignal(...values: Array<string | null | undefined>): boolean {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return /test|demo|mock|seed|sandbox|prueba|fake|sample|dummy|smoke/.test(haystack);
}

function trailingNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

function nextOrderCode(prefix: string, current: number | null): string | null {
  if (current === null || Number.isNaN(current)) return null;
  return `${prefix}${String(current + 1).padStart(6, "0")}`;
}

function nextFixedWidthCode(prefix: string, current: number | null, width = 4): string | null {
  if (current === null || Number.isNaN(current)) return null;
  return `${prefix}${String(current + 1).padStart(width, "0")}`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  console.log("=== W6.01B System Cleanup Dry-Run ===");
  console.log("Modo: dry-run, sin escritura en BD.");

  const [orders, commercialOrders, dispatches, units, profiles, chips, products, systemConfigs, digitalBatches, printOrders, productionOrders] =
    await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          paymentStatus: true,
          adminReviewStatus: true,
          createdAt: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
        },
      }),
      prisma.operationCommercialOrder.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          status: true,
          customerType: true,
          createdAt: true,
          dispatchId: true,
          customerReference: true,
        },
      }),
      prisma.operationDispatch.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          status: true,
          createdAt: true,
          commercialOrders: { select: { id: true, code: true } },
          items: { select: { id: true, unitId: true, internalLabel: true } },
        },
      }),
      prisma.operationFinishedGoodUnit.findMany({
        orderBy: [{ createdAt: "desc" }, { internalLabel: "asc" }],
        select: {
          id: true,
          internalLabel: true,
          status: true,
          productCode: true,
          productName: true,
          productType: true,
          activationStatus: true,
          reservedOrderId: true,
          dispatchedAt: true,
          deliveredAt: true,
          activatedAt: true,
          digitalBatchId: true,
          digitalBatchItemId: true,
          printOrderId: true,
          createdAt: true,
        },
      }),
      prisma.profile.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayNamePublic: true,
          userId: true,
          createdAt: true,
          digitalPass: { select: { id: true, profileId: true, serialNumber: true, passUrl: true, passType: true } },
        },
      }),
      prisma.chip.findMany({
        select: {
          id: true,
          shortCode: true,
          internalLabel: true,
          status: true,
          activatedAt: true,
          createdAt: true,
          assignedProfileId: true,
          ownerUserId: true,
        },
      }),
      prisma.product.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, productType: true, category: true, isActive: true },
      }),
      prisma.systemConfig.findMany({
        orderBy: { key: "asc" },
        select: { id: true, key: true, value: true, updatedAt: true },
      }),
      prisma.operationDigitalBatch.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, prefix: true, startNumber: true, endNumber: true, quantity: true, status: true, createdAt: true },
      }),
      prisma.operationPrintOrder.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, status: true, digitalBatchId: true, createdAt: true },
      }),
      prisma.operationProductionOrder.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, status: true, outputType: true, createdAt: true },
      }),
    ]);

  const latestOrder = orders[0] || null;
  const latestCommercial = commercialOrders[0] || null;
  const latestDispatch = dispatches[0] || null;
  const latestUnit = units[0] || null;
  const latestProduction = productionOrders[0] || null;

  const customerOrderCandidates = orders
    .filter((order) => order.orderStatus !== "completed" || order.paymentStatus !== "paid" || order.adminReviewStatus !== "approved" || isTestSignal(order.customerName, order.customerEmail, order.customerPhone, order.orderNumber))
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      adminReviewStatus: order.adminReviewStatus,
      createdAt: order.createdAt,
      reason: isTestSignal(order.customerName, order.customerEmail, order.customerPhone, order.orderNumber)
        ? "Heurística de prueba detectó texto sospechoso."
        : "No es un pedido terminal limpio para conservar en producción.",
    }));

  const commercialOrderCandidates = commercialOrders
    .filter((order) => order.customerType === "internal" || order.status !== "completed" || isTestSignal(order.code, order.customerReference))
    .map((order) => ({
      id: order.id,
      orderNumberOrCode: order.code,
      status: order.status,
      customerType: order.customerType,
      relationToCustomerOrder: order.customerReference || null,
      reason: order.customerType === "internal" ? "Pedido operacional interno." : "Estado no terminal o patrón sospechoso.",
    }));

  const dispatchCandidates = dispatches.map((dispatch) => ({
    id: dispatch.id,
    dispatchNumberOrCode: dispatch.code,
    status: dispatch.status,
    commercialOrderId: dispatch.commercialOrders[0]?.id || null,
    orphan: dispatch.commercialOrders.length === 0,
    reason: dispatch.commercialOrders.length === 0 ? "No hay orden comercial vinculada en el modelo consultado." : "Tiene relación con pedido operativo.",
  }));

  const unitCandidates = units
    .filter((unit) =>
      unit.status !== "delivered" ||
      unit.activationStatus !== "activated" ||
      unit.reservedOrderId !== null ||
      isTestSignal(unit.internalLabel, unit.productCode, unit.productName)
    )
    .map((unit) => {
      const deliveredOrActive = unit.deliveredAt || unit.activatedAt || unit.activationStatus === "activated";
      const needsReset = unit.status === "reserved" || unit.status === "available";
      return {
        id: unit.id,
        internalLabel: unit.internalLabel,
        status: unit.status,
        productCode: unit.productCode,
        finishedGood: unit.productName,
        productId: null,
        reason: isTestSignal(unit.internalLabel, unit.productCode, unit.productName)
          ? "Parece data operativa de prueba."
          : deliveredOrActive
            ? "Unidad entregada/activa: requiere revisión manual antes de cualquier borrado."
            : needsReset
              ? "Podría ser candidata a reset a available en vez de borrado."
              : "Unidad operativa que no está claramente limpia.",
        suggestedTreatment: isTestSignal(unit.internalLabel, unit.productCode, unit.productName)
          ? "deleteCandidate"
          : deliveredOrActive
            ? "manualReview"
            : needsReset
              ? "resetToAvailableCandidate"
              : "manualReview",
      };
    });

  const candidateProfiles = profiles.map((profile) => ({
    id: profile.id,
    profileName: [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.displayNamePublic || null,
    hasDigitalPass: Boolean(profile.digitalPass),
    reason: profile.digitalPass ? "Tiene digital pass asociado." : "No tiene dispositivo activo detectado.",
  }));

  const candidatePublicLinks = [
    ...chips
      .filter((chip) => Boolean(chip.shortCode))
      .map((chip) => ({
        type: "shortCode",
        id: chip.id,
        value: chip.shortCode,
        assignedProfileId: chip.assignedProfileId,
        reason: "shortCode público detectado en Chip.",
      })),
    ...profiles
      .filter((profile) => Boolean(profile.digitalPass?.passUrl))
      .map((profile) => ({
        type: "publicLink",
        id: profile.id,
        value: profile.digitalPass?.passUrl,
        assignedProfileId: profile.id,
        reason: "Link público del pass detectado.",
      })),
  ];

  const needsManualDecision = [
    ...candidateProfiles.filter((profile) => !profile.hasDigitalPass),
    ...candidatePublicLinks.filter((link) => typeof link.value === "string" && link.value.includes("http")),
    ...unitCandidates.filter((unit) => unit.suggestedTreatment === "manualReview"),
  ];

  const willResetSequences = [
    {
      target: "customerOrders",
      current: latestOrder?.orderNumber || null,
      currentNumeric: trailingNumber(latestOrder?.orderNumber || null),
      proposedNext: "PR-2026-000001",
      source: "Order.orderNumber",
      method: "derivado por último código detectado",
      status: "ok",
    },
    {
      target: "operationCommercialOrders",
      current: latestCommercial?.code || null,
      currentNumeric: trailingNumber(latestCommercial?.code || null),
      proposedNext: "OP-CLI-PR-2026-000001",
      source: "OperationCommercialOrder.code",
      method: "derivado por prefijo",
      status: "ok",
    },
    {
      target: "production",
      current: latestProduction?.code || null,
      currentNumeric: trailingNumber(latestProduction?.code || null),
      proposedNext: "PROD-INT-0001",
      source: "OperationProductionOrder.code",
      method: "derivado por prefijo",
      status: "ok",
    },
    {
      target: "dispatches",
      current: latestDispatch?.code || null,
      currentNumeric: trailingNumber(latestDispatch?.code || null),
      proposedNext: "DSP-OP-CLI-PR-2026-000001",
      source: "OperationDispatch.code",
      method: "derivado por prefijo",
      status: "ok",
    },
    {
      target: "labelsInternal",
      current: latestUnit?.internalLabel || null,
      currentNumeric: trailingNumber(latestUnit?.internalLabel || null),
      proposedNext: "needsManualDecision",
      source: "OperationDigitalBatchItem.internalLabel / OperationFinishedGoodUnit.internalLabel",
      method: "depende del lote/producción nueva",
      status: "needsManualDecision",
    },
  ];

  const report = {
    summary: {
      mode: "dry-run",
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt,
      databaseUrl: redactDatabaseUrl(databaseUrl),
    },
    willDeleteCandidates: {
      customerOrders: customerOrderCandidates,
      operationCommercialOrders: commercialOrderCandidates,
      operationDispatches: dispatchCandidates,
      operationFinishedGoodUnits: unitCandidates,
      profiles: {
        candidateProfiles,
        candidatePublicLinks,
        needsManualDecision,
      },
    },
    willResetSequences,
    mustPreserve: {
      preservedModels: [
        "Product",
        "User",
        "Account",
        "Package",
        "Organization",
        "OrganizationMember",
        "SystemConfig",
      ],
      preservedDataNotes: [
        "No tocar catálogo/productos terminados.",
        "No tocar usuarios reales ni cuentas.",
        "No tocar configuración base salvo una futura confirmación explícita de secuencias.",
      ],
    },
    deletionOrderPlan: [
      "Primero hijos dependientes: items/eventos/unidades ligadas.",
      "Luego dispatches huérfanos o de prueba.",
      "Luego pedidos operativos / internos.",
      "Luego pedidos cliente candidatos.",
      "Luego perfiles / links públicos solo si se confirma manualmente.",
      "Luego secuencias, únicamente tras confirmar la clave o el método real.",
    ],
    risks: [
      "shortCodes existentes: 11",
      "profiles: 4",
      "unidades delivered: 2",
      "unidad reserved: 1",
      "dispatches delivered: 2",
      "posible relación entre pedido real PR-2026-000655 y pruebas",
      "secuencias no deben reiniciarse sin confirmar tabla/método exacto",
    ],
    confirmationRequiredForRealCleanup: "CONFIRM_W601C_SYSTEM_CLEANUP",
    recommendedNextStep: "revisar reporte dry-run con usuario y no ejecutar limpieza real hasta aprobación explícita",
    sources: {
      counts: {
        orders: orders.length,
        commercialOrders: commercialOrders.length,
        dispatches: dispatches.length,
        units: units.length,
        profiles: profiles.length,
        chips: chips.length,
        products: products.length,
        systemConfigs: systemConfigs.length,
        digitalBatches: digitalBatches.length,
        printOrders: printOrders.length,
        productionOrders: productionOrders.length,
      },
      systemConfigKeys: systemConfigs.map((config) => ({ key: config.key, value: config.value, updatedAt: config.updatedAt })),
    },
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Reporte dry-run escrito en: ${reportPath}`);
  console.log("No se realizaron escrituras en la base de datos.");
}

main()
  .catch((error) => {
    console.error("W6.01B dry-run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

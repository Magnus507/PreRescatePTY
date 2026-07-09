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

const reportPath = path.join(process.cwd(), "tmp", "w603a-products-store-inventory-audit.json");

async function main() {
  const [products, finishedGoods, units, batches, productionOrders, chips, digitalPasses, orgMembers] =
    await Promise.all([
      prisma.product.findMany({
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          stock: true,
          isActive: true,
          productType: true,
          estimatedProductionTime: true,
          requiresPersonalization: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.operationFinishedGood.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          code: true,
          name: true,
          productType: true,
          status: true,
          unit: true,
          packingBatchId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.operationFinishedGoodUnit.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          internalLabel: true,
          productCode: true,
          productName: true,
          productType: true,
          status: true,
          qaStatus: true,
          activationStatus: true,
          reservedOrderId: true,
          deliveredAt: true,
          digitalBatchId: true,
          printOrderId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.operationDigitalBatch.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          code: true,
          name: true,
          productType: true,
          finishedGoodCode: true,
          prefix: true,
          startNumber: true,
          endNumber: true,
          quantity: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.operationProductionOrder.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          plannedQuantity: true,
          producedQuantity: true,
          outputType: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.chip.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          shortCode: true,
          internalLabel: true,
          productType: true,
          status: true,
          serviceStatus: true,
          activatedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.digitalPass.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          serialNumber: true,
          passType: true,
          profileId: true,
          passUrl: true,
          createdAt: true,
          lastUpdate: true,
        },
      }),
      prisma.organizationMember.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          memberStatus: true,
          corporateStatus: true,
          corporateProfileId: true,
          profileId: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

  const counts = {
    products: products.length,
    finishedGoods: finishedGoods.length,
    units: units.length,
    digitalBatches: batches.length,
    productionOrders: productionOrders.length,
    chips: chips.length,
    digitalPasses: digitalPasses.length,
    organizationMembers: orgMembers.length,
  };

  const stockRows = Object.values(
    units.reduce<Record<string, {
      productCode: string | null;
      totalUnits: number;
      availableCount: number;
      reservedCount: number;
      qaPendingCount: number;
      qaFailedCount: number;
      dispatchedCount: number;
      deliveredCount: number;
      activatedCount: number;
      lastUpdatedAt: Date | null;
    }>>((acc, unit) => {
      const key = unit.productCode || "__missing__";
      if (!acc[key]) {
        acc[key] = {
          productCode: unit.productCode,
          totalUnits: 0,
          availableCount: 0,
          reservedCount: 0,
          qaPendingCount: 0,
          qaFailedCount: 0,
          dispatchedCount: 0,
          deliveredCount: 0,
          activatedCount: 0,
          lastUpdatedAt: null,
        };
      }

      const row = acc[key];
      row.totalUnits += 1;
      const currentUpdatedAt = new Date(unit.updatedAt);
      row.lastUpdatedAt = !row.lastUpdatedAt || currentUpdatedAt > row.lastUpdatedAt ? currentUpdatedAt : row.lastUpdatedAt;

      if (unit.status === "available") row.availableCount += 1;
      if (unit.status === "reserved") row.reservedCount += 1;
      if (unit.status === "qa_pending") row.qaPendingCount += 1;
      if (unit.status === "qa_failed") row.qaFailedCount += 1;
      if (unit.status === "dispatched") row.dispatchedCount += 1;
      if (unit.status === "delivered") row.deliveredCount += 1;
      if (unit.activationStatus === "activated") row.activatedCount += 1;

      return acc;
    }, {})
  ).sort((a, b) => (a.productCode || "").localeCompare(b.productCode || ""));

  const report = {
    summary: {
      generatedAt: new Date().toISOString(),
      writesPerformed: false,
      destructiveActionsPerformed: false,
      readOnly: true,
    },
    counts,
    modelsDetected: [
      "Product",
      "Package",
      "Order",
      "OrderItem",
      "OperationCommercialOrder",
      "OperationProductionOrder",
      "OperationFinishedGood",
      "OperationDigitalBatch",
      "OperationDigitalBatchItem",
      "OperationFinishedGoodUnit",
      "OperationDispatch",
      "Chip",
      "DigitalPass",
      "Profile",
      "Organization",
      "OrganizationMember",
      "CorporatePublicProfile",
      "SystemConfig",
    ],
    currentProducts: products,
    storeArchitecture: {
      source: "app/(admin)/admin/_components/sections/TiendaSection.tsx",
      apiSources: ["/api/admin/products", "/api/admin/operations/inventory/stock"],
      currentBehavior:
        "La tienda comercial consume Product como catálogo visual y stock operativo calculado desde inventario; la publicación se infiere desde metadata textual en description.",
      visibleSignals: [
        "category",
        "productType",
        "isActive",
        "estimatedProductionTime",
        "requiresPersonalization",
      ],
      notes: [
        "No existe un modelo separado de tienda comercial con categorías múltiples o taxonomía fuerte.",
        "Tienda Admin muestra productos publicados, pero la fuente práctica de stock es el inventario operativo.",
      ],
    },
    inventoryArchitecture: {
      source: "OperationFinishedGoodUnit + OperationDigitalBatch + OperationFinishedGood + OperationDispatch",
      countsByProductCode: stockRows.map((row) => ({
        productCode: row.productCode,
        totalUnits: row.totalUnits,
        availableCount: row.availableCount,
        reservedCount: row.reservedCount,
        qaPendingCount: row.qaPendingCount,
        qaFailedCount: row.qaFailedCount,
        dispatchedCount: row.dispatchedCount,
        deliveredCount: row.deliveredCount,
        activatedCount: row.activatedCount,
        lastUpdatedAt: row.lastUpdatedAt,
      })),
      sampleUnits: units.slice(0, 12),
      statusSummary: units.reduce<Record<string, number>>((acc, unit) => {
        acc[unit.status] = (acc[unit.status] || 0) + 1;
        return acc;
      }, {}),
      activationSummary: units.reduce<Record<string, number>>((acc, unit) => {
        acc[unit.activationStatus] = (acc[unit.activationStatus] || 0) + 1;
        return acc;
      }, {}),
      orderSafetyNote:
        "Inventario operativo guarda productCode/productName/productType y referencias a batches, dispatches y órdenes reservadas; Pedido debe preservar productId/productCode y el historial de precio/nombre.",
    },
    productionArchitecture: {
      source: "OperationProductionOrder + OperationDigitalBatch + OperationFinishedGood + OperationFinishedGoodUnit",
      productionOrders,
      finishedGoods,
      batches,
      notes: [
        "La producción usa OperationProductionOrder como cabecera operativa.",
        "OperationDigitalBatch y OperationFinishedGoodUnit generan labels internos y shortCodes.",
        "OperationFinishedGood une el output con productType y capacidad de inventario final.",
      ],
    },
    deviceTypeReadiness: {
      currentFields: {
        productTypeOnProduct: true,
        productTypeOnFinishedGood: true,
        productTypeOnDigitalBatch: true,
        productTypeOnFinishedGoodUnit: true,
        nicheTypeOnChip: true,
        profileTypeOnProfile: true,
        accountTypeOnAccount: true,
      },
      currentTypesObserved: {
        productTypes: Array.from(new Set(products.map((product) => product.productType))).sort(),
        finishedGoodTypes: Array.from(new Set(finishedGoods.map((item) => item.productType))).sort(),
        unitTypes: Array.from(new Set(units.map((item) => item.productType))).sort(),
        chipTypes: Array.from(new Set(chips.map((item) => item.productType))).sort(),
      },
      readinessAssessment:
        "El sistema ya tiene campos extensibles por tipo en varias capas, pero la taxonomía no está consolidada como un contrato único para tienda, inventario y activación.",
      futureNeeds: [
        "normal",
        "empresarial",
        "mascotas",
        "future device kinds",
      ],
    },
    orderSafetyImpact: {
      fieldsToPreserve: [
        "productId",
        "productCode",
        "productName",
        "price",
        "category",
        "orderStatus",
        "paymentStatus",
        "adminReviewStatus",
        "delivery state",
      ],
      risksDetected: [
        "Product.price and Product.name may diverge from historical order values if pedidos start reading live Product data.",
        "Published-in-store logic inferred from description metadata can drift if descriptions are edited.",
        "operation inventory and store catalog are coupled only by conventions, not a single canonical mapping table.",
      ],
      recommendation:
        "W6.03B should introduce a thin canonical mapping between catálogo comercial y producto operativo terminado without rebuilding pedidos.",
    },
    recommendedW603B: {
      direction:
        "Crear una capa de mapeo explícita entre Product, OperationFinishedGood y stock visible, conservando la compatibilidad con pedidos congelados.",
      avoid:
        "No reconstruir tienda, inventario o producción desde cero ni mover lógica de pedidos a un nuevo esquema.",
    },
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.03A Products / Store / Inventory Audit ===");
  console.log("Read-only audit completed.");
  console.log(`Products detected: ${counts.products}`);
  console.log(`Finished goods detected: ${counts.finishedGoods}`);
  console.log(`Units detected: ${counts.units}`);
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
}

main()
  .catch((error) => {
    console.error("W6.03A audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

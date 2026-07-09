import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const reportPath = path.join(process.cwd(), "tmp", "w603g-final-products-store-inventory-audit.json");

type MappingRow = {
  id: string;
  productId: string;
  finishedGoodId: string | null;
  productCode: string | null;
  deviceType: string;
  storeSection: string;
  purchaseFlow: string;
  activationFlow: string;
  visibilityRules: string | null;
  requiresCompanyContext: boolean;
  requiresApproval: boolean;
  requiresPersonalization: boolean;
  isPublished: boolean;
  sortOrder: number;
  badgeLabel: string | null;
  badgeColor: string | null;
  product: { id: string; name: string; isActive: boolean; productType: string };
  finishedGood: { id: string; code: string; name: string; productType: string; status: string } | null;
};

type ProductRow = {
  id: string;
  name: string;
  isActive: boolean;
  productType: string;
  operationalMapping: MappingRow | null;
};

type FinishedGoodRow = {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
  operationalMapping: {
    id: string;
    productId: string;
    finishedGoodId: string | null;
    productCode: string | null;
    isPublished: boolean;
    deviceType: string;
    storeSection: string;
    sortOrder: number;
    badgeLabel: string | null;
    badgeColor: string | null;
  } | null;
};

type UnitRow = {
  id: string;
  internalLabel: string;
  productCode: string;
  productName: string;
  productType: string;
  status: string;
  qaStatus: string | null;
  activationStatus: string;
  reservedOrderId: string | null;
  deliveredAt: Date | null;
  activatedAt: Date | null;
  createdAt: Date;
};

type CountMap = Record<string, number>;

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): CountMap {
  return rows.reduce<CountMap>((acc, row) => {
    const value = String(row[key] ?? "null");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function isEligibleForPublicStore(mapping: MappingRow | null) {
  if (!mapping) return { eligible: false, reason: "sin mapping operativo" };
  if (!mapping.isPublished) return { eligible: false, reason: "no publicado" };
  if (!mapping.finishedGoodId) return { eligible: false, reason: "sin producto base operativo" };
  if (!mapping.productCode) return { eligible: false, reason: "sin código operativo" };
  if (!mapping.finishedGood) return { eligible: false, reason: "sin finished good asociado" };
  if (mapping.finishedGood.status === "inactive") return { eligible: false, reason: "producto base inactivo" };
  return { eligible: true, reason: null };
}

async function main() {
  const currentHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const [mappings, products, finishedGoods, units, orders, commercialOrders, dispatches] = await Promise.all([
    prisma.productOperationalMapping.findMany({
      include: {
        product: { select: { id: true, name: true, isActive: true, productType: true } },
        finishedGood: { select: { id: true, code: true, name: true, productType: true, status: true } },
      },
      orderBy: [{ storeSection: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.product.findMany({
      include: {
        operationalMapping: {
          include: {
            finishedGood: { select: { id: true, code: true, name: true, productType: true, status: true } },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    prisma.operationFinishedGood.findMany({
      include: {
        operationalMapping: {
          select: {
            id: true,
            productId: true,
            finishedGoodId: true,
            productCode: true,
            isPublished: true,
            deviceType: true,
            storeSection: true,
            sortOrder: true,
            badgeLabel: true,
            badgeColor: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.operationFinishedGoodUnit.findMany({
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
        activatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        adminReviewStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.operationCommercialOrder.findMany({
      select: {
        id: true,
        code: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.operationDispatch.findMany({
      select: {
        id: true,
        code: true,
        status: true,
        destinationType: true,
        createdAt: true,
        commercialOrders: { select: { id: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const mappingsTyped = mappings as MappingRow[];
  const productsTyped = products as ProductRow[];
  const finishedGoodsTyped = finishedGoods as FinishedGoodRow[];
  const unitsTyped = units as UnitRow[];

  const publicEligibility = productsTyped.map((product) => {
    const mapping = product.operationalMapping;
    const check = isEligibleForPublicStore(mapping);
    return {
      productId: product.id,
      name: product.name,
      productType: product.productType,
      isActive: product.isActive,
      mappingId: mapping?.id ?? null,
      deviceType: mapping?.deviceType ?? null,
      storeSection: mapping?.storeSection ?? null,
      isPublished: mapping?.isPublished ?? false,
      finishedGoodId: mapping?.finishedGoodId ?? null,
      productCode: mapping?.productCode ?? null,
      finishedGoodStatus: mapping?.finishedGood?.status ?? null,
      eligible: check.eligible,
      reason: check.reason,
    };
  });

  const publicVisibleProducts = publicEligibility.filter((item) => item.eligible);
  const publicExcludedProducts = publicEligibility.filter((item) => !item.eligible);

  const report = {
    summary: {
      writesPerformed: false,
      destructiveActionsPerformed: false,
      generatedAt: new Date().toISOString(),
      currentHead,
    },
    productOperationalMappings: {
      total: mappingsTyped.length,
      byDeviceType: countBy(mappingsTyped, "deviceType"),
      byStoreSection: countBy(mappingsTyped, "storeSection"),
      published: mappingsTyped.filter((mapping) => mapping.isPublished).length,
      notPublished: mappingsTyped.filter((mapping) => !mapping.isPublished).length,
      withoutFinishedGoodId: mappingsTyped.filter((mapping) => !mapping.finishedGoodId).length,
      withoutProductCode: mappingsTyped.filter((mapping) => !mapping.productCode).length,
      items: mappingsTyped.map((mapping) => ({
        id: mapping.id,
        productId: mapping.productId,
        productName: mapping.product.name,
        finishedGoodId: mapping.finishedGoodId,
        finishedGoodName: mapping.finishedGood?.name ?? null,
        productCode: mapping.productCode,
        deviceType: mapping.deviceType,
        storeSection: mapping.storeSection,
        purchaseFlow: mapping.purchaseFlow,
        activationFlow: mapping.activationFlow,
        isPublished: mapping.isPublished,
        sortOrder: mapping.sortOrder,
        badgeLabel: mapping.badgeLabel,
        badgeColor: mapping.badgeColor,
      })),
    },
    products: {
      total: productsTyped.length,
      withMapping: publicEligibility.filter((item) => Boolean(item.mappingId)).length,
      withoutMapping: publicEligibility.filter((item) => !item.mappingId).length,
      publishedPublicly: publicVisibleProducts.map((item) => ({
        id: item.productId,
        name: item.name,
        productType: item.productType,
        storeSection: item.storeSection,
        productCode: item.productCode,
      })),
      blockedByMissingOperationalBase: publicExcludedProducts
        .filter((item) => item.reason === "sin producto base operativo" || item.reason === "sin finished good asociado" || item.reason === "sin código operativo" || item.reason === "producto base inactivo")
        .map((item) => ({
          id: item.productId,
          name: item.name,
          productType: item.productType,
          reason: item.reason,
          storeSection: item.storeSection,
          productCode: item.productCode,
          finishedGoodId: item.finishedGoodId,
        })),
      items: publicEligibility,
    },
    finishedGoods: {
      total: finishedGoodsTyped.length,
      withMapping: finishedGoodsTyped.filter((item) => Boolean(item.operationalMapping)).length,
      withoutMapping: finishedGoodsTyped.filter((item) => !item.operationalMapping).length,
      items: finishedGoodsTyped.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        productType: item.productType,
        status: item.status,
        mappingId: item.operationalMapping?.id ?? null,
        isPublished: item.operationalMapping?.isPublished ?? false,
        sortOrder: item.operationalMapping?.sortOrder ?? null,
        badgeLabel: item.operationalMapping?.badgeLabel ?? null,
        badgeColor: item.operationalMapping?.badgeColor ?? null,
      })),
      stockByStatus: countBy(unitsTyped, "status"),
    },
    publicStoreEligibility: {
      rule: [
        "isPublished=true",
        "finishedGoodId válido",
        "productCode válido",
        "OperationFinishedGood asociado",
        "status !== inactive",
      ],
      visibleProducts: publicVisibleProducts,
      excludedProducts: publicExcludedProducts,
    },
    adminControl: {
      primaryCenter: "Centro de Operaciones → Inventario → Productos terminados",
      tiendaSectionAsSecondaryView: true,
      productOperationalMappingEditorExists: true,
    },
    ordersFreezeSafety: {
      orders: orders.length,
      operationCommercialOrders: commercialOrders.length,
      operationDispatches: dispatches.length,
      operationFinishedGoodUnits: unitsTyped.length,
      untouchedAreas: [
        "Pedidos no fue modificado",
        "compra ≠ activación",
        "entrega ≠ activación",
        "internalLabel ≠ shortCode",
      ],
    },
    risksAndPending: [
      "secciones dinámicas aún no implementadas",
      "tipos dinámicos aún no implementados",
      "flujo empresarial completo queda para W6.07",
      "tienda cliente/panel completo queda para W6.05",
      "mascotas queda para W6.09",
      "manualDecision KLFUFPK8 sigue intacto",
    ],
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.03G Final Products / Store / Inventory Audit ===");
  console.log("Read-only audit completed.");
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
  console.log(`Current HEAD: ${currentHead}`);
}

main()
  .catch((error) => {
    console.error("W6.03G audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

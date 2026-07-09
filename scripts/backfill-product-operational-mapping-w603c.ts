import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { ACTIVATION_FLOWS, DEVICE_TYPES, PURCHASE_FLOWS, STORE_SECTIONS } from "@/lib/products/product-operational-mapping";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const reportPath = path.join(process.cwd(), "tmp", "w603c-product-operational-mapping-backfill-report.json");
const CONFIRM_TOKEN = "CONFIRM_W603C_MAPPING_BACKFILL";
const dryRun = process.argv.includes("--dry-run") || process.env.W603C_MAPPING_BACKFILL_DRY_RUN !== "false";
const confirmToken = process.env.W603C_MAPPING_BACKFILL_TOKEN || process.argv.find((arg) => arg.startsWith("--confirm="))?.split("=")[1] || null;

type MappingInput = {
  productName: string;
  productId: string;
  finishedGoodId: string | null;
  productCode: string | null;
  deviceType: (typeof DEVICE_TYPES)[number];
  storeSection: (typeof STORE_SECTIONS)[number];
  purchaseFlow: (typeof PURCHASE_FLOWS)[number];
  activationFlow: (typeof ACTIVATION_FLOWS)[number];
  isPublished: boolean;
  requiresCompanyContext: boolean;
  requiresApproval: boolean;
  requiresPersonalization: boolean;
  sortOrder: number;
  badgeLabel: string;
  badgeColor: string;
};

function getExpectedMapping(productName: string, productId: string, finishedGoodId: string | null, productCode: string | null): MappingInput {
  if (productName === "Primer chip empresarial") {
    return {
      productName,
      productId,
      finishedGoodId,
      productCode,
      deviceType: "business",
      storeSection: "business_devices",
      purchaseFlow: "company_request",
      activationFlow: "business_profile",
      isPublished: true,
      requiresCompanyContext: true,
      requiresApproval: true,
      requiresPersonalization: false,
      sortOrder: 0,
      badgeLabel: "Empresarial",
      badgeColor: "indigo",
    };
  }

  if (productName === "Sticker PreRescatePTY") {
    return {
      productName,
      productId,
      finishedGoodId,
      productCode,
      deviceType: "personal",
      storeSection: "personal_devices",
      purchaseFlow: "direct_purchase",
      activationFlow: "personal_profile",
      isPublished: true,
      requiresCompanyContext: false,
      requiresApproval: false,
      requiresPersonalization: false,
      sortOrder: 10,
      badgeLabel: "Personal",
      badgeColor: "sky",
    };
  }

  if (productName === "Chip Empresarial") {
    return {
      productName,
      productId,
      finishedGoodId,
      productCode,
      deviceType: "business",
      storeSection: "business_devices",
      purchaseFlow: "company_request",
      activationFlow: "business_profile",
      isPublished: false,
      requiresCompanyContext: true,
      requiresApproval: true,
      requiresPersonalization: false,
      sortOrder: 20,
      badgeLabel: "Empresarial",
      badgeColor: "indigo",
    };
  }

  if (productName === "Sticker PreRescatePTY Empresarial") {
    return {
      productName,
      productId,
      finishedGoodId,
      productCode,
      deviceType: "business",
      storeSection: "business_devices",
      purchaseFlow: "company_request",
      activationFlow: "business_profile",
      isPublished: true,
      requiresCompanyContext: true,
      requiresApproval: true,
      requiresPersonalization: false,
      sortOrder: 30,
      badgeLabel: "Empresarial",
      badgeColor: "indigo",
    };
  }

  throw new Error(`Unexpected product for mapping: ${productName}`);
}

async function main() {
  const [products, finishedGoods] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        productType: true,
        isActive: true,
        requiresPersonalization: true,
      },
    }),
    prisma.operationFinishedGood.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        productType: true,
      },
    }),
  ]);

  const expectedNames = [
    "Primer chip empresarial",
    "Sticker PreRescatePTY",
    "Chip Empresarial",
    "Sticker PreRescatePTY Empresarial",
  ];

  const productNames = products.map((product) => product.name);
  const unexpectedProducts = productNames.filter((name) => !expectedNames.includes(name));
  const missingProducts = expectedNames.filter((name) => !productNames.includes(name));

  if (products.length !== 4 || finishedGoods.length < 2 || unexpectedProducts.length > 0 || missingProducts.length > 0) {
    throw new Error(
      `Unexpected product set for backfill. products=${products.length}, finishedGoods=${finishedGoods.length}, unexpected=${unexpectedProducts.join(",") || "none"}, missing=${missingProducts.join(",") || "none"}`
    );
  }

  const mappings = products.map((product) => {
    const finishedGood =
      finishedGoods.find((item) => item.code === "PRP-FG-STICKER" && product.name === "Sticker PreRescatePTY") ||
      finishedGoods.find((item) => item.code === "PRP-FG-STICKER-EMP" && product.name === "Sticker PreRescatePTY Empresarial") ||
      null;

    return getExpectedMapping(product.name, product.id, finishedGood?.id || null, finishedGood?.code || null);
  });

  const report: Record<string, unknown> = {
    summary: {
      generatedAt: new Date().toISOString(),
      writesPerformed: false,
      destructiveActionsPerformed: false,
      dryRun,
      readOnly: dryRun,
    },
    constants: {
      deviceTypes: DEVICE_TYPES,
      storeSections: STORE_SECTIONS,
      purchaseFlows: PURCHASE_FLOWS,
      activationFlows: ACTIVATION_FLOWS,
    },
    products,
    finishedGoods,
    mappings,
    createdMappings: [],
    updatedMappings: [],
    skippedMappings: [],
    manualDecisions: [],
    productsMapped: mappings.map((mapping) => mapping.productName),
    productsUnmapped: [],
    preservedModels: ["Product", "OperationFinishedGood", "OperationFinishedGoodUnit", "Order", "Chip", "DigitalPass"],
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });

  if (dryRun) {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log("=== W6.03C Product Operational Mapping Backfill (dry-run) ===");
    console.log("Dry-run only. No database writes performed.");
    console.log(`Report written to: ${reportPath}`);
    return;
  }

  if (confirmToken !== CONFIRM_TOKEN) {
    await fs.writeFile(reportPath, JSON.stringify({ ...report, writesPerformed: false, note: "Invalid token. No writes performed." }, null, 2), "utf8");
    console.log("=== W6.03C Product Operational Mapping Backfill ===");
    console.log("Missing or invalid token. No database writes performed.");
    console.log(`Expected token: ${CONFIRM_TOKEN}`);
    console.log(`Report written to: ${reportPath}`);
    return;
  }

  const createdMappings: string[] = [];
  const updatedMappings: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const mapping of mappings) {
      const existing = await tx.productOperationalMapping.findUnique({ where: { productId: mapping.productId } });
      const data = {
        finishedGoodId: mapping.finishedGoodId,
        productCode: mapping.productCode,
        deviceType: mapping.deviceType,
        storeSection: mapping.storeSection,
        purchaseFlow: mapping.purchaseFlow,
        activationFlow: mapping.activationFlow,
        isPublished: mapping.isPublished,
        requiresCompanyContext: mapping.requiresCompanyContext,
        requiresApproval: mapping.requiresApproval,
        requiresPersonalization: mapping.requiresPersonalization,
        sortOrder: mapping.sortOrder,
        badgeLabel: mapping.badgeLabel,
        badgeColor: mapping.badgeColor,
      };

      if (existing) {
        await tx.productOperationalMapping.update({ where: { productId: mapping.productId }, data });
        updatedMappings.push(mapping.productName);
      } else {
        await tx.productOperationalMapping.create({
          data: {
            productId: mapping.productId,
            ...data,
          },
        });
        createdMappings.push(mapping.productName);
      }
    }
  });

  const finalReport = {
    ...report,
    summary: {
      generatedAt: new Date().toISOString(),
      writesPerformed: true,
      destructiveActionsPerformed: false,
      dryRun: false,
      readOnly: false,
    },
    createdMappings,
    updatedMappings,
    skippedMappings: [],
    manualDecisions: [],
    productsMapped: mappings.map((mapping) => mapping.productName),
    productsUnmapped: [],
  };

  await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2), "utf8");
  console.log("=== W6.03C Product Operational Mapping Backfill ===");
  console.log("Token accepted. Mappings written successfully.");
  console.log(`Created mappings: ${createdMappings.length}`);
  console.log(`Updated mappings: ${updatedMappings.length}`);
  console.log(`Report written to: ${reportPath}`);
}

main()
  .catch((error) => {
    console.error("W6.03C backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

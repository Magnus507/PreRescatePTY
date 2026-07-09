import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { ACTIVATION_FLOWS, DEVICE_TYPES, PURCHASE_FLOWS, STORE_SECTIONS, getActivationFlowLabel, getDeviceTypeLabel, getPurchaseFlowLabel, getStoreSectionLabel } from "@/lib/products/product-operational-mapping";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const reportPath = path.join(process.cwd(), "tmp", "w603c-product-operational-mapping-dry-run.json");

async function main() {
  const [products, finishedGoods] = await Promise.all([
      prisma.product.findMany({
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          stock: true,
          isActive: true,
          productType: true,
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
        status: true,
        unit: true,
      },
    }),
  ]);

  const mappings = products.map((product) => {
    const guessedDeviceType = (() => {
      switch (product.name) {
        case "Primer chip empresarial":
          return "business" as const;
        case "Sticker PreRescatePTY":
          return "personal" as const;
        case "Chip Empresarial":
          return "business" as const;
        case "Sticker PreRescatePTY Empresarial":
          return "business" as const;
        default:
          return "future" as const;
      }
    })();
    const finishedGood =
      finishedGoods.find((item) => item.code.toUpperCase() === (product.productType || "").toUpperCase()) ||
      finishedGoods.find((item) => product.name.toLowerCase().includes(item.name.toLowerCase())) ||
      finishedGoods.find((item) => product.description?.toLowerCase().includes(item.code.toLowerCase())) ||
      null;

    const storeSection = guessedDeviceType === "business" ? "business_devices" : "personal_devices";

    const purchaseFlow =
      guessedDeviceType === "business"
        ? "company_request"
        : product.isActive
          ? "direct_purchase"
          : "coming_soon";

    const activationFlow = guessedDeviceType === "business" ? "business_profile" : "personal_profile";

    return {
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      guessedDeviceType,
      finishedGoodId: finishedGood?.id || null,
      finishedGoodCode: finishedGood?.code || null,
      storeSection,
      purchaseFlow,
      activationFlow,
      isPublished: product.isActive,
      requiresCompanyContext: guessedDeviceType === "business",
      requiresApproval: guessedDeviceType === "business",
      requiresPersonalization: product.requiresPersonalization,
      sortOrder: product.category === "corporate" ? 10 : 0,
      badgeLabel: getDeviceTypeLabel(guessedDeviceType),
      badgeColor: getDeviceTypeLabel(guessedDeviceType),
      helperLabels: {
        storeSection: getStoreSectionLabel(storeSection),
        purchaseFlow: getPurchaseFlowLabel(purchaseFlow),
        activationFlow: getActivationFlowLabel(activationFlow),
      },
    };
  });

  const report = {
    summary: {
      generatedAt: new Date().toISOString(),
      writesPerformed: false,
      destructiveActionsPerformed: false,
      readOnly: true,
    },
    constants: {
      deviceTypes: DEVICE_TYPES,
      storeSections: STORE_SECTIONS,
      purchaseFlows: PURCHASE_FLOWS,
      activationFlows: ACTIVATION_FLOWS,
    },
    products,
    finishedGoods,
    suggestedMappings: mappings,
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== W6.03C Product Operational Mapping Dry Run ===");
  console.log("Read-only dry run completed.");
  console.log(`Products detected: ${products.length}`);
  console.log(`Finished goods detected: ${finishedGoods.length}`);
  console.log(`Report written to: ${reportPath}`);
  console.log("No database writes performed.");
}

main()
  .catch((error) => {
    console.error("W6.03C dry-run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "@/lib/prisma";
import { extractOperationsProductCode } from "@/lib/operations/sync-operations-product-to-store";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function stripMarker(description: string | null | undefined) {
  if (!description) return null;
  return description.replace(/\n?\[operationsProductCode:[^\]]+\]/g, "").trim() || null;
}

async function main() {
  const code = getArg("--code") || "";
  if (!code) throw new Error("Missing --code");

  const marker = `[operationsProductCode:${code}]`;
  const [operationProduct, products, stockRows] = await Promise.all([
    prisma.operationFinishedGood.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, status: true, productType: true, unit: true, updatedAt: true },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, description: true, productType: true, category: true, price: true, stock: true, isActive: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    loadInventoryStockRows(),
  ]);

  const byMarker = products.filter((product) => product.description?.includes(marker));
  const byName = products.filter((product) =>
    ["Sticker PreRescatePTY", "PRP-FG-STICKER", "Chip Empresarial", "Sticker PreRescatePTY Empresarial"].includes(product.name)
  );
  const byProductType = products.filter((product) => product.productType === code);
  const activeWithMarker = byMarker.filter((product) => product.isActive);
  const inactiveWithMarker = byMarker.filter((product) => !product.isActive);
  const similarNameWithoutMarker = byName.filter((product) => !product.description?.includes(marker));
  const activeWithoutMarker = products.filter((product) => product.isActive && !product.description?.includes(marker) && product.name.toLowerCase().includes("sticker"));

  const stock = stockRows.find((row) => row.productCode === code) || null;
  const publicDescription = byMarker[0] ? stripMarker(byMarker[0].description) : null;

  const shouldShowPublished =
    byMarker.some((product) => product.isActive) &&
    byMarker.some((product) => extractOperationsProductCode(product) === code);

  const buttonReason = shouldShowPublished
    ? "marker exacto encontrado con isActive true"
    : byMarker.length > 0
      ? "hay marker exacto pero el producto está inactivo"
      : byProductType.length > 0
        ? "solo hubo match por productType/nombre sin marcador exacto"
        : "no existe match exacto";

  const wouldReturn = Boolean(operationProduct) && products.some((product) => product.isActive && extractOperationsProductCode(product) === code);
  const hiddenBecauseInactive = byMarker.length > 0 && !byMarker.some((product) => product.isActive);
  const hiddenBecauseNoMarker = byMarker.length === 0;
  const hiddenBecauseNoStock = (stock?.availableCount ?? 0) <= 0 && wouldReturn;
  const hiddenBecauseOtherFilter = false;

  console.log("=== W5.43B.2 Forensic Publish Store Audit ===");
  console.log("A. OperationFinishedGood");
  console.log(`- exists: ${Boolean(operationProduct)}`);
  console.log(`- id: ${operationProduct?.id || null}`);
  console.log(`- code: ${operationProduct?.code || code}`);
  console.log(`- name: ${operationProduct?.name || null}`);
  console.log(`- status: ${operationProduct?.status || null}`);
  console.log(`- productType: ${operationProduct?.productType || null}`);
  console.log(`- unit: ${operationProduct?.unit || null}`);
  console.log(`- updatedAt: ${operationProduct?.updatedAt?.toISOString?.() || null}`);

  console.log("B. Product matches by marker exacto");
  console.log(`- count: ${byMarker.length}`);
  console.log(`- ids: ${byMarker.map((product) => product.id).join(", ") || "none"}`);
  byMarker.forEach((product) => {
    console.log(`  - id: ${product.id}`);
    console.log(`    name: ${product.name}`);
    console.log(`    isActive: ${product.isActive}`);
    console.log(`    productType: ${product.productType}`);
    console.log(`    category: ${product.category}`);
    console.log(`    price: ${product.price}`);
    console.log(`    stock: ${product.stock}`);
    console.log(`    descriptionRaw: ${product.description || null}`);
    console.log(`    markerPresent: ${Boolean(product.description?.includes(marker))}`);
    console.log(`    updatedAt: ${product.updatedAt.toISOString()}`);
  });

  console.log("C. Product matches by name");
  console.log(`- count: ${byName.length}`);
  console.log(`- ids: ${byName.map((product) => product.id).join(", ") || "none"}`);
  console.log(`- names: ${byName.map((product) => product.name).join(", ") || "none"}`);
  console.log(`- isActive: ${byName.map((product) => String(product.isActive)).join(", ") || "none"}`);
  console.log(`- descriptions: ${byName.map((product) => product.description || "null").join(" | ") || "none"}`);
  console.log(`- productTypes: ${byName.map((product) => product.productType).join(", ") || "none"}`);

  console.log("D. Product matches by productType");
  console.log(`- count: ${byProductType.length}`);
  console.log(`- ids: ${byProductType.map((product) => product.id).join(", ") || "none"}`);
  console.log(`- productType: ${byProductType.map((product) => product.productType).join(", ") || "none"}`);
  console.log(`- names: ${byProductType.map((product) => product.name).join(", ") || "none"}`);
  console.log(`- isActive: ${byProductType.map((product) => String(product.isActive)).join(", ") || "none"}`);
  console.log(`- marker: ${byProductType.map((product) => String(Boolean(product.description?.includes(marker)))).join(", ") || "none"}`);

  console.log("E. Duplicados");
  console.log(`- productos activos con mismo marker: ${activeWithMarker.length}`);
  console.log(`- productos inactivos con mismo marker: ${inactiveWithMarker.length}`);
  console.log(`- productos sin marker pero nombre parecido: ${similarNameWithoutMarker.length}`);
  console.log(`- productos activos sin marker que podrían aparecer en tienda: ${activeWithoutMarker.length}`);

  console.log("F. Resultado esperado botón Inventario");
  console.log(`- expectedButtonLabel: ${shouldShowPublished ? "Dejar de publicar" : "Publicar en Tienda"}`);
  console.log(`- reason: ${buttonReason}`);

  console.log("G. Resultado esperado /api/products");
  console.log(`- wouldReturn: ${wouldReturn}`);
  console.log(`- reason: ${wouldReturn ? "active marker exacto" : hiddenBecauseInactive ? "inactive" : hiddenBecauseNoMarker ? "no marker" : "other"}`);
  console.log(`- operationsProductCode: ${extractOperationsProductCode(byMarker[0] || byProductType[0] || byName[0] || { description: null, productType: "", name: "" }) || null}`);
  console.log(`- availableStock: ${stock?.availableCount ?? 0}`);
  console.log(`- reservedStock: ${stock?.reservedCount ?? 0}`);
  console.log(`- stock: ${stock?.availableCount ?? 0}`);
  console.log(`- publicDescription: ${publicDescription}`);
  console.log(`- hiddenBecauseInactive: ${hiddenBecauseInactive}`);
  console.log(`- hiddenBecauseNoMarker: ${hiddenBecauseNoMarker}`);
  console.log(`- hiddenBecauseNoStock: ${hiddenBecauseNoStock}`);
  console.log(`- hiddenBecauseOtherFilter: ${hiddenBecauseOtherFilter}`);

  console.log("H. Resultado tienda pública UI");
  console.log(`- hidesOutOfStock: false`);
  console.log(`- file: app/(app)/dashboard/tienda/page.tsx`);
  console.log(`- condition: stock <= 0 => muestra \"Agotado\" y desactiva compra`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});

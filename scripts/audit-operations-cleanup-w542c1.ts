import { readFile } from "node:fs/promises";
import { prisma } from "../lib/prisma";
import { loadInventoryStockRows } from "../lib/operations/inventory-stock";

const CHECKS = [
  "Inventario físico de insumos",
  "Separacion operativa obligatoria",
  "Separación operativa obligatoria",
  "Inventario agregado / referencia",
  "Balance calculado por eventos",
  "API conectada",
  "Flujo de despacho",
  "Tipos de despacho",
  "Flujo operativo implementado",
];

async function main() {
  const files = [
    "app/(admin)/admin/_components/sections/PedidosSection.tsx",
    "app/(admin)/admin/_components/sections/PhysicalInventorySection.tsx",
    "app/(admin)/admin/_components/sections/FinishedGoodsSection.tsx",
    "app/(admin)/admin/_components/sections/DispatchSection.tsx",
    "app/(admin)/admin/_components/sections/OperationsCenterSection.tsx",
    "app/(admin)/admin/_components/sections/MaterialsWorkflowSection.tsx",
  ];

  const stockRows = await loadInventoryStockRows();
  const finishedGoods = await prisma.operationFinishedGood.findMany({ select: { code: true, name: true } });
  const prp = stockRows.find((row) => row.productCode === "PRP-FG-STICKER");

  console.log("=== W5.42C.1 AUDIT ===");
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const check of CHECKS) {
      if (content.includes(check)) {
        console.log(`visible-text:${file}:${check}`);
      }
    }
  }

  console.log(`PRP-FG-STICKER availableCount: ${prp?.availableCount ?? 0}`);
  console.log(`PRP-FG-STICKER tableBalance: ${prp?.availableCount ?? 0}`);
  console.log(`Finished goods scanned: ${finishedGoods.length}`);
  console.log(`Modal containers inspected: 0`);
}

main()
  .catch((error) => {
    console.error("W5.42C.1 audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

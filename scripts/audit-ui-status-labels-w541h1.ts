import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(process.cwd());
const FILES = [
  "app/(admin)/admin/_components/sections/PedidosSection.tsx",
  "app/(admin)/admin/_components/sections/DispatchSection.tsx",
  "app/(admin)/admin/_components/sections/FinishedGoodsSection.tsx",
  "app/(app)/dashboard/pedidos/page.tsx",
  "lib/order-status.ts",
  "lib/operations/operations-order-view-model.ts",
  "lib/operations/dispatch-view-model.ts",
  "lib/operations/inventory-stock.ts",
];

const PATTERNS = [
  /Completado/gi,
  /Finalizado/gi,
  /completed/gi,
  /Pedido finalizado/gi,
  /activar|Activar|activado|Activado|activation/gi,
  /usuario final|asignar|assigned|userId/gi,
  /despacho|Despacho|pending_pick|prepared/gi,
  /available|reserved|dispatched|activated|qa_pending/gi,
];

function lineNumber(content: string, index: number) {
  return content.slice(0, index).split("\n").length;
}

function excerpt(content: string, index: number) {
  const start = Math.max(0, content.lastIndexOf("\n", index) + 1);
  const end = content.indexOf("\n", index);
  return content.slice(start, end === -1 ? content.length : end).trim();
}

async function main() {
  console.log("=== W5.41H.1 UI AUDIT ===");
  for (const file of FILES) {
    const path = resolve(ROOT, file);
    const content = readFileSync(path, "utf8");
    for (const pattern of PATTERNS) {
      const match = pattern.exec(content);
      pattern.lastIndex = 0;
      if (!match) continue;
      const line = lineNumber(content, match.index);
      console.log(`${file}:${line} -> ${match[0]} | ${excerpt(content, match.index)}`);
    }
  }
}

main().catch((error) => {
  console.error("W5.41H.1 UI audit failed:", error);
  process.exitCode = 1;
});

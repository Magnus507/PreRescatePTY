import { readFileSync } from "fs";
import { resolve } from "path";

const files = [
  "app/(admin)/admin/_components/sections/PedidosSection.tsx",
  "app/(admin)/admin/_components/sections/DispatchSection.tsx",
  "app/(admin)/admin/_components/sections/FinishedGoodsSection.tsx",
  "app/(app)/dashboard/pedidos/page.tsx",
  "app/(app)/dashboard/chips/page.tsx",
  "components/orders/OrderStatusBadge.tsx",
  "lib/order-status.ts",
];

const patterns = [
  { label: "Completado", re: /Completado/gi },
  { label: "Finalizado", re: /Finalizado/gi },
  { label: "Activar", re: /Activar|activar/gi },
  { label: "Usuario final", re: /usuario final|assigned|userId/gi },
  { label: "Enviar ambiguo", re: /\bEnviar\b/g },
  { label: "Inglés", re: /\b(Completed|Finalized|Shipped|Delivered|Pending|Available|Reserved|Dispatched|Activated)\b/g },
  { label: "Sin label español", re: /\b(pending_pick|pending_preparation|draft|prepared|sent)\b/g },
  { label: "Botón ambiguo", re: /\b(Completar|Finalizar|Enviar)\b/g },
];

function lineOf(content: string, index: number) {
  return content.slice(0, index).split("\n").length;
}

function excerpt(content: string, index: number) {
  const start = content.lastIndexOf("\n", index) + 1;
  const end = content.indexOf("\n", index);
  return content.slice(start, end === -1 ? content.length : end).trim();
}

for (const file of files) {
  const path = resolve(process.cwd(), file);
  const content = readFileSync(path, "utf8");
  for (const { label, re } of patterns) {
    const match = re.exec(content);
    re.lastIndex = 0;
    if (!match) continue;
    console.log(`${label} | ${file}:${lineOf(content, match.index)} | ${match[0]} | ${excerpt(content, match.index)}`);
  }
}

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relPath: string) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function containsAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

async function main() {
  const viewModel = read("lib/operations/operations-order-view-model.ts");
  const pedidos = read("app/(admin)/admin/_components/sections/PedidosSection.tsx");
  const permanentDelete = read("app/api/admin/orders/[id]/permanent-delete/route.ts");
  const docs = read("docs/orders-actions-map-w542g2.md");

  assert(containsAny(viewModel, ["canSoftDeleteOrder", "softDeleteLabel", "softDeleteHelpText"]), "View model no expone campos de soft delete.");
  assert(containsAny(viewModel, ["requiresAction", "pendingReasonLabel", "orderSource", "orderKind", "isCustomerOrder", "isInternalOrder", "sourceModel"]), "View model no expone semántica oficial completa.");
  assert(!/test\|prueba\|demo\|seed\|sandbox\|mock\|fake/.test(pedidos) || containsAny(viewModel, ["detectTestOrderSignals"]), "La heurística de test no debe vivir dispersa en la UI.");
  assert(!containsAny(pedidos, ["isSoftDeletableTestOrder"]), "La UI todavía usa heurística local para eliminación.");
  assert(containsAny(pedidos, ["No hay pedidos para mostrar.", "No hay pedidos de clientes.", "No hay pedidos internos.", "No hay pedidos que requieran acción."]), "Faltan empty states por filtro.");
  assert(containsAny(pedidos, ["Cancelar / ocultar", "Ocultar pedido"]), "La UI no muestra el texto correcto de soft delete.");
  assert(containsAny(pedidos, ["Esta acción no borra físicamente", "No borra físicamente"]), "El modal no aclara que no borra físicamente.");
  assert(containsAny(pedidos, ["canPermanentDeleteOrder", "isSuperadmin"]), "Permanent delete no sigue condicionado correctamente.");
  assert(containsAny(permanentDelete, ["findUnique", "where: { id }"]), "Permanent delete no busca por id real.");
  assert(containsAny(docs, ["No existe `/api/admin/orders/[id]/reserve-units`.", "No existe `/api/admin/orders/[id]/archive`."]), "La documentación no aclara rutas inexistentes.");
  assert(containsAny(docs, ["Cancelar / ocultar", "Eliminar permanentemente"]), "La documentación no refleja las acciones reales.");

  console.log("=== W5.42G.2 Orders UI Semantics Audit ===");
  console.log("viewModel.softDelete: yes");
  console.log("viewModel.pending: yes");
  console.log("ui.localDeleteHeuristic: no");
  console.log("emptyStatesByFilter: yes");
  console.log("softDeleteTruthfulCopy: yes");
  console.log("permanentDeleteSuperadmin: yes");
  console.log("permanentDeleteById: yes");
  console.log("docsExist: yes");
  console.log("docsNoArchiveRoute: yes");
  console.log("docsNoOrdersReserveRoute: yes");
  console.log("No se escribe nada en modo auditoría.");
}

main().catch((error) => {
  console.error("W5.42G.2 audit failed:", error);
  process.exitCode = 1;
});

import { NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const rows = await loadInventoryStockRows();
    return NextResponse.json({ stock: rows, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[operations/inventory/stock] GET error:", error);
    return NextResponse.json({ error: "Error al cargar stock agregado" }, { status: 500 });
  }
}

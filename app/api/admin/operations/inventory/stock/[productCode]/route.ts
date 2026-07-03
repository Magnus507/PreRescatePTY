import { NextRequest, NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { loadInventoryStockDetail } from "@/lib/operations/inventory-stock";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { productCode } = await params;

  try {
    const detail = await loadInventoryStockDetail(productCode);
    return NextResponse.json({ ...detail, productCode });
  } catch (error) {
    console.error("[operations/inventory/stock/:productCode] GET error:", error);
    return NextResponse.json({ error: "Error al cargar detalle de stock" }, { status: 500 });
  }
}

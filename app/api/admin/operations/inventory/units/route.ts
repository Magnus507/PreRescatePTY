import { NextRequest, NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { loadInventoryStockDetail } from "@/lib/operations/inventory-stock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const productCode = req.nextUrl.searchParams.get("productCode")?.trim();
  if (!productCode) {
    return NextResponse.json({ error: "productCode es requerido" }, { status: 400 });
  }

  try {
    const detail = await loadInventoryStockDetail(productCode);
    return NextResponse.json({
      success: true,
      productCode,
      summary: detail.summary,
      units: detail.units,
    });
  } catch (error) {
    console.error("[operations/inventory/units] GET error:", error);
    return NextResponse.json({ error: "Error al cargar unidades por producto" }, { status: 500 });
  }
}

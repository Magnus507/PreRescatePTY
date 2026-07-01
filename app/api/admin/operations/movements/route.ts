import { NextRequest, NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getOperationMovements } from "@/lib/operations/operation-movements";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const searchParams = req.nextUrl.searchParams;
    const movements = await getOperationMovements({
      source: searchParams.get("source"),
      eventType: searchParams.get("eventType"),
      search: searchParams.get("search"),
      internalLabel: searchParams.get("internalLabel"),
      productCode: searchParams.get("productCode"),
      commercialOrderId: searchParams.get("commercialOrderId"),
      dispatchId: searchParams.get("dispatchId"),
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });

    return NextResponse.json({ movements, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[operations/movements] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar movimientos consolidados" },
      { status: 500 }
    );
  }
}

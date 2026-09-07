import { NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getCommercialOrderHistoryDetail } from "@/lib/operations/commercial-order-history-detail";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const detail = await getCommercialOrderHistoryDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Registro histórico no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ detail });
  } catch (error) {
    console.error("[operations/history/:id] GET error:", error);
    return NextResponse.json({ error: "Error al cargar expediente histórico" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { listPostSaleUnitCandidates } from "@/lib/operations/post-sale-unit-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const candidates = await listPostSaleUnitCandidates();
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("[operations/postsale/candidates] GET error:", error);
    return NextResponse.json({ error: "No se pudieron cargar las unidades de postventa" }, { status: 500 });
  }
}

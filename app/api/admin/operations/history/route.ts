import { NextRequest, NextResponse } from "next/server";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getOperationHistory, type HistoryEntityType } from "@/lib/operations/operation-history";

export const dynamic = "force-dynamic";

const VALID_ENTITY_TYPES = new Set<HistoryEntityType>([
  "unit",
  "commercial_order",
  "digital_batch",
  "print_order",
  "production_order",
  "dispatch",
  "warranty",
  "replacement",
  "return",
  "material",
]);

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const searchParams = req.nextUrl.searchParams;
    const entityTypeRaw = searchParams.get("entityType");
    const entityType = entityTypeRaw && VALID_ENTITY_TYPES.has(entityTypeRaw as HistoryEntityType) ? (entityTypeRaw as HistoryEntityType) : null;
    const payload = await getOperationHistory({
      entityType,
      entityId: searchParams.get("entityId"),
      identifier: searchParams.get("identifier"),
      internalLabel: searchParams.get("internalLabel"),
      search: searchParams.get("search"),
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[operations/history] GET error:", error);
    return NextResponse.json({ error: "Error al cargar historial consolidado" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; preparationId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id: productionOrderId, preparationId } = await params;
  const item = await prisma.operationDigitalBatchItem.findUnique({ where: { id: preparationId } });
  if (!item || item.productionOrderId !== productionOrderId) {
    return NextResponse.json({ error: "Item de preparacion no encontrado" }, { status: 404 });
  }

  await prisma.operationProductionEvent.create({
    data: {
      productionOrderId,
      eventType: "PACKAGING_COMPLETED",
      reason: "Empaque completado",
      metadataJson: JSON.stringify({ preparationId }),
      createdById: auth.session.user.id || null,
    },
  });

  return NextResponse.json({ ok: true });
}

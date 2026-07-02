import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id: productionOrderId, unitId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

  if (!reason) {
    return NextResponse.json({ error: "reason es requerido" }, { status: 400 });
  }

  try {
    const unit = await prisma.operationFinishedGoodUnit.findUnique({
      where: { id: unitId },
    });
    if (!unit) return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
    if (unit.qaStatus === "failed") return NextResponse.json({ unit });
    if (unit.status !== "qa_pending" && unit.status !== "assembled") {
      return NextResponse.json({ error: "La unidad no está lista para QC" }, { status: 400 });
    }

    const updated = await prisma.operationFinishedGoodUnit.update({
      where: { id: unitId },
      data: {
        qaStatus: "failed",
        status: "qa_failed",
        reservedOrderId: null,
        reservedAt: null,
        events: {
          create: {
            eventType: "QA_FAILED",
            reason,
            metadataJson: { productionOrderId, notes },
          },
        },
      },
    });

    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("[operations/production-orders/:id/qa/:unitId/fail] POST error:", error);
    return NextResponse.json({ error: "Error al registrar QC fallido" }, { status: 500 });
  }
}

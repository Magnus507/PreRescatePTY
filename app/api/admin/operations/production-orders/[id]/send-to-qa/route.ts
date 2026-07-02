import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id: productionOrderId } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productionOrder = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        include: { digitalItems: true },
      });
      if (!productionOrder) return null;

      const printOrder = await tx.operationPrintOrder.findFirst({
        where: { digitalBatchId: productionOrder.digitalItems[0]?.batchId || "" },
      });
      if (!printOrder || printOrder.status !== "received") {
        throw new Error("PRINT_NOT_RECEIVED");
      }

      const incomplete = await tx.operationDigitalBatchItem.count({
        where: {
          productionOrderId,
          NOT: { status: "printed" },
        },
      });
      if (incomplete > 0) {
        throw new Error("PHYSICAL_ASSEMBLY_PENDING");
      }

      await tx.operationFinishedGoodUnit.updateMany({
        where: { digitalBatchId: printOrder.digitalBatchId, status: "qa_pending" },
        data: { qaStatus: "pending" },
      });

      await tx.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "SENT_TO_QA",
          quantity: productionOrder.digitalItems.length,
          reason: "Enviado a QC",
          metadataJson: JSON.stringify({ printOrderId: printOrder.id }),
          createdById: auth.session.user.id || null,
        },
      });

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: { status: "qa_pending" },
      });

      return { printOrder };
    });

    if (!result) return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "PRINT_NOT_RECEIVED") {
      return NextResponse.json({ error: "La imprenta debe estar recibida antes de enviar a QC" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PHYSICAL_ASSEMBLY_PENDING") {
      return NextResponse.json({ error: "Hay unidades físicas pendientes de ensamblaje" }, { status: 400 });
    }
    console.error("[operations/production-orders/:id/send-to-qa] POST error:", error);
    return NextResponse.json({ error: "Error al enviar a QC" }, { status: 500 });
  }
}

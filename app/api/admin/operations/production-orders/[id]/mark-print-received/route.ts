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
        include: { items: true },
      });

      if (!printOrder) throw new Error("PRINT_ORDER_NOT_FOUND");
      if (!["sent", "partially_received", "received"].includes(printOrder.status)) {
        throw new Error("PRINT_ORDER_NOT_SENT");
      }

      if (printOrder.status !== "received") {
        await tx.operationPrintOrder.update({
          where: { id: printOrder.id },
          data: { status: "received", receivedAt: new Date() },
        });
      }

      await tx.operationPrintOrderItem.updateMany({
        where: { printOrderId: printOrder.id },
        data: { status: "received", receivedAt: new Date() },
      });

      await tx.operationDigitalBatchItem.updateMany({
        where: { id: { in: printOrder.items.map((item) => item.digitalBatchItemId) } },
        data: { status: "printed" },
      });

      await tx.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "PRINT_RECEIVED",
          quantity: printOrder.items.length,
          reason: "Imprenta recibida",
          metadataJson: JSON.stringify({ printOrderId: printOrder.id }),
          createdById: auth.session.user.id || null,
        },
      });

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: { status: "print_received" },
      });

      return { printOrder };
    });

    if (!result) return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    return NextResponse.json({ printOrder: result.printOrder });
  } catch (error) {
    if (error instanceof Error && error.message === "PRINT_ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "No existe una orden a imprenta vinculada" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "PRINT_ORDER_NOT_SENT") {
      return NextResponse.json({ error: "La orden a imprenta todavía no fue enviada" }, { status: 400 });
    }
    console.error("[operations/production-orders/:id/mark-print-received] POST error:", error);
    return NextResponse.json({ error: "Error al registrar recepción de imprenta" }, { status: 500 });
  }
}

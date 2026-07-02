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
        include: {
          digitalItems: {
            orderBy: [{ sequenceNumber: "asc" }],
            include: { batch: true },
          },
        },
      });

      if (!productionOrder) return null;

      if (["completed", "cancelled"].includes(productionOrder.status)) {
        throw new Error("TERMINAL_PRODUCTION_ORDER");
      }

      if (productionOrder.digitalItems.length === 0) {
        throw new Error("NO_DIGITAL_ITEMS");
      }

      const notReady = productionOrder.digitalItems.filter((item) => !item.nfcProgrammed || !item.qrPrepared);
      if (notReady.length > 0) {
        throw new Error("NOT_READY_FOR_PRINT");
      }

      const existing = await tx.operationPrintOrder.findFirst({
        where: { digitalBatchId: productionOrder.digitalItems[0].batchId },
        include: { items: true },
      });

      if (existing) {
        await tx.operationProductionOrder.update({
          where: { id: productionOrderId },
          data: { status: "sent_to_print" },
        });
        return { productionOrder, printOrder: existing };
      }

      const firstItem = productionOrder.digitalItems[0];
      const lastItem = productionOrder.digitalItems[productionOrder.digitalItems.length - 1];
      const printOrder = await tx.operationPrintOrder.create({
        data: {
          code: `${productionOrder.code}-PRINT`,
          supplierName: "Pendiente de imprenta",
          supplierReference: null,
          productType: productionOrder.outputType,
          finishedGoodCode: firstItem.batch.finishedGoodCode || null,
          digitalBatchId: firstItem.batchId,
          rangeStartLabel: firstItem.internalLabel,
          rangeEndLabel: lastItem.internalLabel,
          quantity: productionOrder.digitalItems.length,
          includesSticker: true,
          includesActivationCard: false,
          includesPresentation: false,
          includesPackaging: false,
          status: "sent",
          sentAt: new Date(),
          items: {
            create: productionOrder.digitalItems.map((item) => ({
              digitalBatchItemId: item.id,
              internalLabel: item.internalLabel,
              status: "sent",
              sentAt: new Date(),
            })),
          },
        },
        include: { items: true },
      });

      await tx.operationDigitalBatchItem.updateMany({
        where: { id: { in: productionOrder.digitalItems.map((item) => item.id) } },
        data: { status: "sent_to_print" },
      });

      await tx.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "PRINT_ORDER_SENT",
          quantity: productionOrder.digitalItems.length,
          reason: "Orden enviada a imprenta",
          metadataJson: JSON.stringify({
            printOrderId: printOrder.id,
            digitalBatchItemIds: productionOrder.digitalItems.map((item) => item.id),
          }),
          createdById: auth.session.user.id || null,
        },
      });

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: { status: "sent_to_print" },
      });

      return { productionOrder, printOrder };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ printOrder: result.printOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_PRODUCTION_ORDER") {
      return NextResponse.json({ error: "No se puede enviar a imprenta una orden finalizada" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "NO_DIGITAL_ITEMS") {
      return NextResponse.json({ error: "La orden no tiene items digitales preparados" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "NOT_READY_FOR_PRINT") {
      return NextResponse.json({ error: "La orden no está lista para imprenta." }, { status: 400 });
    }

    console.error("[operations/production-orders/:id/send-to-print] POST error:", error);
    return NextResponse.json({ error: "Error al enviar a imprenta" }, { status: 500 });
  }
}

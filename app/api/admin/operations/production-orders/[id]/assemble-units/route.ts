import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getFirstValidationMessage } from "../../production-orders.helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AssembleUnitsSchema = z.object({
  digitalBatchItemIds: z.array(z.string().trim().min(1)).min(1, "digitalBatchItemIds es requerido"),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: productionOrderId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = AssembleUnitsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  const createdById = auth.session.user.id || null;
  const digitalBatchItemIds = [...new Set(parsed.data.digitalBatchItemIds)];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productionOrder = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        select: { id: true, outputType: true, status: true },
      });

      if (!productionOrder) return null;
      if (["completed", "cancelled"].includes(productionOrder.status)) {
        throw new Error("TERMINAL_PRODUCTION_ORDER");
      }

      const batchItems = await tx.operationDigitalBatchItem.findMany({
        where: {
          id: { in: digitalBatchItemIds },
          productionOrderId,
        },
        include: {
          batch: true,
          printOrderItems: {
            include: { printOrder: true },
          },
        },
      });

      if (batchItems.length !== digitalBatchItemIds.length) {
        throw new Error("DIGITAL_BATCH_ITEM_NOT_FOUND");
      }

      for (const item of batchItems) {
        if (item.status !== "printed") {
          throw new Error("DIGITAL_BATCH_ITEM_NOT_PRINTED");
        }
        if (item.batch.productType !== productionOrder.outputType) {
          throw new Error("INCOMPATIBLE_PRODUCTION_ORDER");
        }
        const receivedPrintOrder = item.printOrderItems[0]?.printOrder;
        if (!receivedPrintOrder || receivedPrintOrder.status !== "received") {
          throw new Error("PRINT_ORDER_NOT_RECEIVED");
        }
      }

      await tx.operationDigitalBatchItem.updateMany({
        where: {
          id: { in: digitalBatchItemIds },
          productionOrderId,
          status: "printed",
        },
        data: { status: "assembled" },
      });

      await tx.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "UNIT_ASSEMBLED",
          quantity: batchItems.length,
          reason: parsed.data.notes || "Chip + sticker ensamblados",
          metadataJson: JSON.stringify({
            digitalBatchItemIds,
            nextRequiredStep: "packaging",
          }),
          createdById,
        },
      });

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: { status: "started" },
      });

      const assembledItems = await tx.operationDigitalBatchItem.findMany({
        where: { id: { in: digitalBatchItemIds } },
        orderBy: [{ sequenceNumber: "asc" }, { internalLabel: "asc" }],
      });

      return { productionOrder, assembledItems };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json(
      {
        productionOrder: result.productionOrder,
        assembledItems: result.assembledItems,
        message: "Ensamblaje registrado. Falta empaque antes de crear la unidad para QC.",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_PRODUCTION_ORDER") {
      return NextResponse.json({ error: "No se puede ensamblar sobre una orden finalizada" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DIGITAL_BATCH_ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Uno o más items no pertenecen a esta orden de producción" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DIGITAL_BATCH_ITEM_NOT_PRINTED") {
      return NextResponse.json({ error: "Todos los items deben estar impresos antes del ensamblaje" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INCOMPATIBLE_PRODUCTION_ORDER") {
      return NextResponse.json({ error: "La orden de producción no coincide con el tipo del item" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PRINT_ORDER_NOT_RECEIVED") {
      return NextResponse.json({ error: "La impresión debe estar recibida antes del ensamblaje" }, { status: 400 });
    }

    console.error("[operations/production-orders/:id/assemble-units] POST error:", error);
    return NextResponse.json({ error: "Error al ensamblar unidades" }, { status: 500 });
  }
}

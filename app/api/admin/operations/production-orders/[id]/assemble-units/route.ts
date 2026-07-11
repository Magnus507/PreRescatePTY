import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getFirstValidationMessage } from "../../production-orders.helpers";
import { getProductMetadata } from "@/app/api/admin/operations/finished-good-units/finished-good-units.helpers";
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

      if (!productionOrder) {
        return null;
      }

      if (["completed", "cancelled"].includes(productionOrder.status)) {
        throw new Error("TERMINAL_PRODUCTION_ORDER");
      }

      const batchItems = await tx.operationDigitalBatchItem.findMany({
        where: { id: { in: digitalBatchItemIds } },
        include: {
          batch: true,
          printOrderItems: {
            include: {
              printOrder: true,
            },
          },
          finishedGoodUnits: true,
        },
      });

      if (batchItems.length !== digitalBatchItemIds.length) {
        throw new Error("DIGITAL_BATCH_ITEM_NOT_FOUND");
      }

      for (const item of batchItems) {
        if (item.status !== "printed") {
          throw new Error("DIGITAL_BATCH_ITEM_NOT_PRINTED");
        }
        if (item.finishedGoodUnits.length > 0) {
          throw new Error("DIGITAL_BATCH_ITEM_ALREADY_LINKED");
        }
        if (item.batch.productType !== productionOrder.outputType) {
          throw new Error("INCOMPATIBLE_PRODUCTION_ORDER");
        }
        const receivedPrintOrder = item.printOrderItems[0]?.printOrder;
        if (!receivedPrintOrder || receivedPrintOrder.status !== "received") {
          throw new Error("PRINT_ORDER_NOT_RECEIVED");
        }
      }

      const createdUnits = [];

      for (const item of batchItems) {
        const printOrder = item.printOrderItems[0]?.printOrder || null;
        const productMetadata = getProductMetadata(item.batch.productType);
        const unit = await tx.operationFinishedGoodUnit.create({
          data: {
            internalLabel: item.internalLabel,
            productCode: productMetadata.productCode,
            productName: productMetadata.productName,
            productType: productionOrder.outputType,
            digitalBatchId: item.batchId,
            digitalBatchItemId: item.id,
            printOrderId: printOrder?.id || null,
            status: "qa_pending",
            qaStatus: "pending",
            activationStatus: "not_activated",
            notes: parsed.data.notes || null,
            events: {
              create: {
                eventType: "ASSEMBLED",
                reason: "Unidad ensamblada desde item impreso",
                referenceType: "production_order",
                referenceId: productionOrder.id,
                metadataJson: {
                  source: "production_order_assemble_units",
                  digitalBatchItemId: item.id,
                  productionOrderId: productionOrder.id,
                  printOrderId: printOrder?.id || null,
                  previousStatus: item.status,
                },
              },
            },
          },
        });

        await tx.operationDigitalBatchItem.update({
          where: { id: item.id },
          data: { status: "assembled" },
        });

        createdUnits.push(unit);
      }

      const event = await tx.operationProductionEvent.create({
        data: {
          productionOrderId: productionOrder.id,
          eventType: "ASSEMBLED_UNITS",
          quantity: createdUnits.length,
          reason: parsed.data.notes || "Unidades ensambladas desde items impresos",
          metadataJson: JSON.stringify({
            digitalBatchItemIds,
            createdUnitIds: createdUnits.map((unit) => unit.id),
          }),
          createdById,
        },
      });

      return {
        productionOrder,
        createdUnits,
        event,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json(
      {
        productionOrder: result.productionOrder,
        createdUnits: result.createdUnits,
        event: result.event,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_PRODUCTION_ORDER") {
      return NextResponse.json({ error: "No se puede ensamblar sobre una orden completed o cancelled" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DIGITAL_BATCH_ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Uno o mas digitalBatchItemIds no existen" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DIGITAL_BATCH_ITEM_NOT_PRINTED") {
      return NextResponse.json({ error: "Todos los items deben estar printed" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DIGITAL_BATCH_ITEM_ALREADY_LINKED") {
      return NextResponse.json({ error: "Uno o mas items ya estan vinculados a una unidad terminada" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INCOMPATIBLE_PRODUCTION_ORDER") {
      return NextResponse.json({ error: "La orden de produccion no coincide con el tipo del item" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PRINT_ORDER_NOT_RECEIVED") {
      return NextResponse.json({ error: "El item debe pertenecer a una orden a imprenta recibida" }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una unidad con esa etiqueta interna" }, { status: 409 });
    }

    console.error("[operations/production-orders/:id/assemble-units] POST error:", error);
    return NextResponse.json({ error: "Error al ensamblar unidades" }, { status: 500 });
  }
}

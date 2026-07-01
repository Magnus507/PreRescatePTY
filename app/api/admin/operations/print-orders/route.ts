import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreatePrintOrderSchema,
  assertItemsAvailableForPrint,
  buildPrintOrderPayload,
  getDigitalBatchItemsInRange,
  getFirstValidationMessage,
  validateDigitalBatchRange,
} from "./print-orders.helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const printOrders = await prisma.operationPrintOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        digitalBatch: true,
        items: true,
      },
    });
    return NextResponse.json({ printOrders });
  } catch (error) {
    console.error("[operations/print-orders] GET error:", error);
    return NextResponse.json({ error: "Error al listar ordenes a imprenta" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreatePrintOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const { batch, startIndex, endIndex } = await validateDigitalBatchRange(
      data.digitalBatchId,
      data.rangeStartLabel,
      data.rangeEndLabel
    );
    if (batch.productType !== data.productType) {
      return NextResponse.json({ error: "productType no coincide con el lote digital" }, { status: 400 });
    }
    if ((batch.finishedGoodCode || "") !== data.finishedGoodCode) {
      return NextResponse.json({ error: "finishedGoodCode no coincide con el lote digital" }, { status: 400 });
    }

    const batchItems = getDigitalBatchItemsInRange(batch, startIndex, endIndex);
    assertItemsAvailableForPrint(batchItems);

    const quantity = batchItems.length;
    const createdById = auth.session.user.id || null;

    const printOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.operationPrintOrder.create({
        data: buildPrintOrderPayload({
          code: data.code,
          supplierName: data.supplierName,
          supplierReference: data.supplierReference,
          productType: data.productType,
          finishedGoodCode: data.finishedGoodCode,
          digitalBatchId: data.digitalBatchId,
          rangeStartLabel: data.rangeStartLabel,
          rangeEndLabel: data.rangeEndLabel,
          quantity,
          includesSticker: data.includesSticker ?? true,
          includesActivationCard: data.includesActivationCard ?? false,
          includesPresentation: data.includesPresentation ?? false,
          includesPackaging: data.includesPackaging ?? false,
          notes: data.notes,
        }),
      });

      await tx.operationPrintOrderItem.createMany({
        data: batchItems.map((item) => ({
          printOrderId: created.id,
          digitalBatchItemId: item.id,
          internalLabel: item.internalLabel,
          status: "pending",
        })),
      });

      await tx.operationDigitalBatchItem.updateMany({
        where: { id: { in: batchItems.map((item) => item.id) } },
        data: { status: "sent_to_print" },
      });

      await tx.operationPrintOrder.update({
        where: { id: created.id },
        data: { status: "sent", sentAt: new Date() },
      });

      return tx.operationPrintOrder.findUniqueOrThrow({
        where: { id: created.id },
        include: { digitalBatch: true, items: true },
      });
    });

    return NextResponse.json(
      {
        printOrder: {
          ...printOrder,
          sentItems: quantity,
          receivedItems: 0,
          createdById,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "DIGITAL_BATCH_NOT_FOUND") {
      return NextResponse.json({ error: "digitalBatchId no existe" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "RANGE_OUT_OF_BATCH") {
      return NextResponse.json({ error: "El rango no pertenece al lote digital" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_RANGE") {
      return NextResponse.json({ error: "rangeEndLabel debe ser mayor o igual a rangeStartLabel" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ITEMS_NOT_AVAILABLE") {
      return NextResponse.json({ error: "Uno o mas items del rango no estan disponibles para imprenta" }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una orden a imprenta con ese code" }, { status: 409 });
    }

    console.error("[operations/print-orders] POST error:", error);
    return NextResponse.json({ error: "Error al crear orden a imprenta" }, { status: 500 });
  }
}

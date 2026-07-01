import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateFinishedGoodUnitSchema,
  getFirstValidationMessage,
  getProductMetadata,
} from "./finished-good-units.helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const units = await prisma.operationFinishedGoodUnit.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        digitalBatch: true,
        digitalBatchItem: true,
        printOrder: true,
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ units });
  } catch (error) {
    console.error("[operations/finished-good-units] GET error:", error);
    return NextResponse.json({ error: "Error al listar unidades terminadas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateFinishedGoodUnitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  try {
    const item = await prisma.operationDigitalBatchItem.findUnique({
      where: { id: parsed.data.digitalBatchItemId },
      include: { batch: true },
    });
    if (!item) return NextResponse.json({ error: "digitalBatchItem no existe" }, { status: 400 });
    if (item.status !== "printed") return NextResponse.json({ error: "El item debe estar printed" }, { status: 400 });

    const linked = await prisma.operationFinishedGoodUnit.findUnique({
      where: { digitalBatchItemId: item.id },
      select: { id: true },
    });
    if (linked) return NextResponse.json({ error: "El item ya esta vinculado a una unidad" }, { status: 409 });

    const { productCode, productName } = getProductMetadata(item.batch.productType);

    const unit = await prisma.$transaction(async (tx) => {
      const created = await tx.operationFinishedGoodUnit.create({
        data: {
          internalLabel: item.internalLabel,
          productCode,
          productName,
          productType: item.batch.productType,
          digitalBatchId: item.batchId,
          digitalBatchItemId: item.id,
          printOrderId: await tx.operationPrintOrderItem.findFirst({ where: { digitalBatchItemId: item.id }, select: { printOrderId: true } }).then((row) => row?.printOrderId || null),
          status: "assembled",
          qaStatus: "pending",
          notes: parsed.data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: "Unidad creada desde item impreso",
              metadataJson: { source: "printed_digital_batch_item", digitalBatchItemId: item.id },
            },
          },
        },
        include: { events: true },
      });

      return tx.operationFinishedGoodUnit.findUnique({
        where: { id: created.id },
        include: {
          digitalBatch: true,
          digitalBatchItem: true,
          printOrder: true,
          events: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una unidad con esa etiqueta interna" }, { status: 409 });
    }
    console.error("[operations/finished-good-units] POST error:", error);
    return NextResponse.json({ error: "Error al crear unidad terminada" }, { status: 500 });
  }
}

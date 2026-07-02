import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateFinishedGoodUnitSchema,
  buildFinishedGoodUnitStatusCounts,
  getFirstValidationMessage,
  getProductMetadata,
  isDeliveredPendingActivation,
} from "./finished-good-units.helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") || undefined;
  const inventoryStatus = searchParams.get("inventoryStatus") || undefined;
  const qaStatus = searchParams.get("qaStatus") || undefined;
  const productType = searchParams.get("productType") || undefined;
  const productCode = searchParams.get("productCode") || undefined;
  const finishedGoodId = searchParams.get("finishedGoodId") || undefined;
  const productionOrderId = searchParams.get("productionOrderId") || undefined;
  const internalLabel = searchParams.get("internalLabel") || undefined;
  const shortCode = searchParams.get("shortCode") || undefined;
  const activationStatus = searchParams.get("activationStatus") || undefined;
  const reservedOrderId = searchParams.get("reservedOrderId") || undefined;
  const deliveredPendingActivation = searchParams.get("deliveredPendingActivation") === "true";
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (inventoryStatus) where.status = inventoryStatus;
  if (qaStatus) where.qaStatus = qaStatus;
  if (productType) where.productType = productType;
  if (productCode) where.productCode = productCode;
  if (finishedGoodId) where.digitalBatchItemId = finishedGoodId;
  if (productionOrderId) where.digitalBatchItem = { productionOrderId };
  if (internalLabel) where.internalLabel = { contains: internalLabel, mode: "insensitive" };
  if (shortCode) where.digitalBatchItem = { ...(where.digitalBatchItem as Record<string, unknown> || {}), shortCode: { contains: shortCode, mode: "insensitive" } };
  if (activationStatus) where.activationStatus = activationStatus;
  if (reservedOrderId) where.reservedOrderId = reservedOrderId;
  if (deliveredPendingActivation) {
    where.status = "delivered";
    where.activationStatus = "not_activated";
  }
  if (search) {
    where.OR = [
      { internalLabel: { contains: search, mode: "insensitive" } },
      { shortCode: { contains: search, mode: "insensitive" } },
      { productCode: { contains: search, mode: "insensitive" } },
      { productName: { contains: search, mode: "insensitive" } },
      { reservedOrderId: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const units = await prisma.operationFinishedGoodUnit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        digitalBatch: true,
        digitalBatchItem: {
          include: {
            productionOrder: { select: { id: true, code: true, status: true } },
          },
        },
        printOrder: { select: { id: true, code: true, status: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    const normalizedUnits = units.map((unit) => {
      const deliveredPendingActivation = isDeliveredPendingActivation(unit);
      const productionOrder = unit.digitalBatchItem?.productionOrder || null;
      return {
        ...unit,
        inventoryStatus: unit.status,
        deliveredPendingActivation,
        alertLabel: deliveredPendingActivation ? "Entregado, pendiente de activación" : null,
        productionOrderId: productionOrder?.id || null,
        productionOrderCode: productionOrder?.code || null,
        productionOrderStatus: productionOrder?.status || null,
        lastEvent: unit.events.at(-1) || null,
      };
    });

    return NextResponse.json({ units: normalizedUnits, counts: buildFinishedGoodUnitStatusCounts(normalizedUnits) });
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
          status: "qa_pending",
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

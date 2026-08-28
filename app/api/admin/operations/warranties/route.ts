import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { assertPostSaleUnitOrigin } from "@/lib/operations/assert-postsale-unit-origin";
import { resolvePostSaleUnitContext } from "@/lib/operations/post-sale-unit-context";
import { recordFinishedGoodUnitPostSaleEvent } from "@/lib/operations/record-finished-good-unit-postsale-event";
import { CreateWarrantySchema, getFirstValidationMessage } from "./warranties.helpers";

export const dynamic = "force-dynamic";

const warrantyInclude = {
  commercialOrder: { select: { id: true, code: true, status: true, customerName: true, customerEmail: true, customerPhone: true, paymentStatus: true, fulfillmentStatus: true } },
  commercialOrderItem: { select: { id: true, productCode: true, productName: true, quantity: true, unit: true } },
  finishedGood: { select: { id: true, code: true, name: true, productType: true, status: true, unit: true } },
  dispatch: { select: { id: true, code: true, status: true, destinationType: true, destinationName: true } },
  unit: { select: { id: true, internalLabel: true, productCode: true, productName: true, status: true, activationStatus: true, reservedOrderId: true, dispatchedAt: true, deliveredAt: true, activatedAt: true, qaStatus: true, digitalBatchItem: { select: { shortCode: true } } } },
  events: { orderBy: { createdAt: "desc" as const }, take: 10 },
} as const;

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const warranties = await prisma.operationWarranty.findMany({ orderBy: { createdAt: "desc" }, include: warrantyInclude });
    return NextResponse.json({ warranties });
  } catch (error) {
    console.error("[operations/warranties] GET error:", error);
    return NextResponse.json({ error: "Error al listar garantias" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateWarrantySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const warranty = await prisma.$transaction(async (tx) => {
      let unitId = data.unitId || null;
      if (!unitId && data.internalLabel) {
        unitId = (await tx.operationFinishedGoodUnit.findUnique({ where: { internalLabel: data.internalLabel }, select: { id: true } }))?.id || null;
      }
      if (!unitId) throw new Error("WARRANTY_UNIT_REQUIRED");

      const context = await resolvePostSaleUnitContext(tx, unitId);
      await assertPostSaleUnitOrigin({
        tx,
        unitId,
        dispatchId: data.dispatchId || null,
        commercialOrderId: data.commercialOrderId || null,
      });

      if (data.finishedGoodId && context.finishedGood?.id !== data.finishedGoodId) throw new Error("UNIT_FINISHED_GOOD_MISMATCH");
      if (data.commercialOrderItemId && context.commercialOrderItem?.id !== data.commercialOrderItemId) throw new Error("UNIT_ORDER_ITEM_MISMATCH");

      const commercialOrderId = data.commercialOrderId || context.commercialOrder?.id || null;
      const commercialOrderItemId = data.commercialOrderItemId || context.commercialOrderItem?.id || null;
      const finishedGoodId = data.finishedGoodId || context.finishedGood?.id || null;
      const dispatchId = data.dispatchId || context.dispatch?.id || null;
      const customerName = data.customerName || context.commercialOrder?.customerName || null;
      const customerEmail = data.customerEmail || context.commercialOrder?.customerEmail || null;
      const customerPhone = data.customerPhone || context.commercialOrder?.customerPhone || null;

      const created = await tx.operationWarranty.create({
        data: {
          code: data.code,
          status: data.status || "active",
          warrantyType: data.warrantyType || "standard",
          coverageStatus: data.coverageStatus || "valid",
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          customerName,
          customerEmail,
          customerPhone,
          serialReference: context.unit.internalLabel,
          unitId: context.unit.id,
          internalLabel: context.unit.internalLabel,
          productCode: context.unit.productCode,
          productName: context.unit.productName,
          commercialOrderId,
          commercialOrderItemId,
          finishedGoodId,
          dispatchId,
          notes: data.notes || null,
          events: {
            create: {
              eventType: "OPENED",
              reason: data.reason || "Garantia creada sobre unidad entregada",
              metadataJson: JSON.stringify({ unitId: context.unit.id, internalLabel: context.unit.internalLabel, commercialOrderId, finishedGoodId, dispatchId }),
              createdById,
            },
          },
        },
        include: warrantyInclude,
      });

      await recordFinishedGoodUnitPostSaleEvent({
        tx,
        unitId: context.unit.id,
        eventType: "WARRANTY_OPENED",
        referenceType: "warranty",
        referenceId: created.id,
        reason: data.reason || "Garantia abierta",
        metadataJson: { warrantyCode: data.code, commercialOrderId, dispatchId },
      });

      return created;
    });

    return NextResponse.json({ warranty }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const responses: Record<string, { error: string; status: number }> = {
      WARRANTY_UNIT_REQUIRED: { error: "La garantia requiere una unidad fisica identificada", status: 400 },
      INVALID_UNIT: { error: "unitId/internalLabel no existe", status: 400 },
      UNIT_NOT_DELIVERED: { error: "La garantia solo puede abrirse sobre una unidad entregada", status: 409 },
      UNIT_DISPATCH_MISMATCH: { error: "La unidad no pertenece al despacho indicado", status: 409 },
      UNIT_ORDER_MISMATCH: { error: "La unidad no pertenece al pedido indicado", status: 409 },
      ORDER_DISPATCH_MISMATCH: { error: "El despacho indicado no pertenece al pedido indicado", status: 409 },
      UNIT_ORDER_ITEM_MISMATCH: { error: "La unidad no coincide con el articulo del pedido indicado", status: 409 },
      UNIT_FINISHED_GOOD_MISMATCH: { error: "La unidad no coincide con el producto terminado indicado", status: 409 },
    };
    if (responses[message]) return NextResponse.json({ error: responses[message].error }, { status: responses[message].status });

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una garantia con ese code" }, { status: 409 });
    }

    console.error("[operations/warranties] POST error:", error);
    return NextResponse.json({ error: "Error al crear garantia" }, { status: 500 });
  }
}

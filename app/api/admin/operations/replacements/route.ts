import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { assertPostSaleUnitOrigin } from "@/lib/operations/assert-postsale-unit-origin";
import { recordFinishedGoodUnitPostSaleEvent } from "@/lib/operations/record-finished-good-unit-postsale-event";
import { CreateReplacementSchema, getFirstValidationMessage } from "./replacements.helpers";
import { replacementInclude } from "./replacements.include";

export const dynamic = "force-dynamic";

type RelationContext = {
  warrantyUnitId: string | null;
  finishedGoodCodeById: Map<string, string>;
};

async function assertRelationsExist(
  tx: Prisma.TransactionClient,
  data: {
    warrantyId?: string | null;
    commercialOrderId?: string | null;
    originalFinishedGoodId?: string | null;
    replacementFinishedGoodId?: string | null;
    originalDispatchId?: string | null;
    replacementDispatchId?: string | null;
  }
): Promise<RelationContext> {
  let warrantyUnitId: string | null = null;

  if (data.warrantyId) {
    const warranty = await tx.operationWarranty.findUnique({
      where: { id: data.warrantyId },
      select: { id: true, unitId: true },
    });

    if (!warranty) throw new Error("INVALID_WARRANTY");
    warrantyUnitId = warranty.unitId || null;
  }

  if (data.commercialOrderId) {
    const commercialOrder = await tx.operationCommercialOrder.findUnique({
      where: { id: data.commercialOrderId },
      select: { id: true },
    });

    if (!commercialOrder) throw new Error("INVALID_COMMERCIAL_ORDER");
  }

  const finishedGoodIds = [
    data.originalFinishedGoodId,
    data.replacementFinishedGoodId,
  ].filter(Boolean) as string[];
  const finishedGoodCodeById = new Map<string, string>();

  if (finishedGoodIds.length > 0) {
    const finishedGoods = await tx.operationFinishedGood.findMany({
      where: { id: { in: finishedGoodIds } },
      select: { id: true, code: true },
    });

    if (finishedGoods.length !== new Set(finishedGoodIds).size) {
      throw new Error("INVALID_FINISHED_GOOD");
    }

    for (const finishedGood of finishedGoods) {
      finishedGoodCodeById.set(finishedGood.id, finishedGood.code);
    }
  }

  const dispatchIds = [
    data.originalDispatchId,
    data.replacementDispatchId,
  ].filter(Boolean) as string[];

  if (dispatchIds.length > 0) {
    const dispatches = await tx.operationDispatch.findMany({
      where: { id: { in: dispatchIds } },
      select: { id: true },
    });

    if (dispatches.length !== new Set(dispatchIds).size) {
      throw new Error("INVALID_DISPATCH");
    }
  }

  return { warrantyUnitId, finishedGoodCodeById };
}

function relationErrorResponse(error: Error) {
  if (error.message === "INVALID_WARRANTY") {
    return NextResponse.json({ error: "warrantyId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_COMMERCIAL_ORDER") {
    return NextResponse.json({ error: "commercialOrderId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_FINISHED_GOOD") {
    return NextResponse.json(
      { error: "Uno o mas finishedGoodId no existen" },
      { status: 400 }
    );
  }

  if (error.message === "INVALID_DISPATCH") {
    return NextResponse.json(
      { error: "Uno o mas dispatchId no existen" },
      { status: 400 }
    );
  }

  if (error.message === "ORIGINAL_UNIT_REQUIRED") {
    return NextResponse.json(
      { error: "El reemplazo requiere identificar la unidad fisica original" },
      { status: 400 }
    );
  }

  if (error.message === "INVALID_ORIGINAL_UNIT") {
    return NextResponse.json(
      { error: "originalUnitId/originalInternalLabel no existe" },
      { status: 400 }
    );
  }

  if (error.message === "INVALID_REPLACEMENT_UNIT") {
    return NextResponse.json(
      { error: "replacementUnitId/replacementInternalLabel no existe" },
      { status: 400 }
    );
  }

  if (error.message === "UNIT_NOT_DELIVERED") {
    return NextResponse.json(
      { error: "Solo se puede reemplazar una unidad original ya entregada" },
      { status: 409 }
    );
  }

  if (error.message === "UNIT_DISPATCH_MISMATCH") {
    return NextResponse.json(
      { error: "La unidad original no pertenece al despacho indicado" },
      { status: 409 }
    );
  }

  if (error.message === "UNIT_ORDER_MISMATCH") {
    return NextResponse.json(
      { error: "La unidad original no pertenece al pedido indicado" },
      { status: 409 }
    );
  }

  if (error.message === "ORDER_DISPATCH_MISMATCH") {
    return NextResponse.json(
      { error: "El despacho original no pertenece al pedido indicado" },
      { status: 409 }
    );
  }

  if (error.message === "WARRANTY_UNIT_MISMATCH") {
    return NextResponse.json(
      { error: "La garantia indicada pertenece a otra unidad" },
      { status: 409 }
    );
  }

  if (error.message === "ORIGINAL_PRODUCT_MISMATCH") {
    return NextResponse.json(
      { error: "La unidad original no coincide con el producto original indicado" },
      { status: 409 }
    );
  }

  if (error.message === "REPLACEMENT_PRODUCT_MISMATCH") {
    return NextResponse.json(
      { error: "La unidad de reemplazo no coincide con el producto de reemplazo indicado" },
      { status: 409 }
    );
  }

  if (error.message === "SAME_REPLACEMENT_UNIT") {
    return NextResponse.json(
      { error: "La unidad de reemplazo debe ser diferente a la unidad original" },
      { status: 409 }
    );
  }

  return null;
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const replacements = await prisma.operationReplacement.findMany({
      orderBy: { createdAt: "desc" },
      include: replacementInclude,
    });

    return NextResponse.json({ replacements });
  } catch (error) {
    console.error("[operations/replacements] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar reemplazos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateReplacementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const replacement = await prisma.$transaction(async (tx) => {
      if (!data.originalUnitId && !data.originalInternalLabel) {
        throw new Error("ORIGINAL_UNIT_REQUIRED");
      }

      const relationContext = await assertRelationsExist(tx, data);

      const originalUnit = data.originalUnitId
        ? await tx.operationFinishedGoodUnit.findUnique({
            where: { id: data.originalUnitId },
            select: {
              id: true,
              internalLabel: true,
              productCode: true,
              productName: true,
            },
          })
        : await tx.operationFinishedGoodUnit.findUnique({
            where: { internalLabel: data.originalInternalLabel as string },
            select: {
              id: true,
              internalLabel: true,
              productCode: true,
              productName: true,
            },
          });

      if (!originalUnit) throw new Error("INVALID_ORIGINAL_UNIT");

      await assertPostSaleUnitOrigin({
        tx,
        unitId: originalUnit.id,
        dispatchId: data.originalDispatchId || null,
        commercialOrderId: data.commercialOrderId || null,
      });

      if (
        relationContext.warrantyUnitId &&
        relationContext.warrantyUnitId !== originalUnit.id
      ) {
        throw new Error("WARRANTY_UNIT_MISMATCH");
      }

      if (data.originalFinishedGoodId) {
        const expectedCode = relationContext.finishedGoodCodeById.get(
          data.originalFinishedGoodId
        );
        if (expectedCode && expectedCode !== originalUnit.productCode) {
          throw new Error("ORIGINAL_PRODUCT_MISMATCH");
        }
      }

      const replacementUnit = data.replacementUnitId
        ? await tx.operationFinishedGoodUnit.findUnique({
            where: { id: data.replacementUnitId },
            select: {
              id: true,
              internalLabel: true,
              productCode: true,
              productName: true,
            },
          })
        : data.replacementInternalLabel
          ? await tx.operationFinishedGoodUnit.findUnique({
              where: { internalLabel: data.replacementInternalLabel },
              select: {
                id: true,
                internalLabel: true,
                productCode: true,
                productName: true,
              },
            })
          : null;

      if ((data.replacementUnitId || data.replacementInternalLabel) && !replacementUnit) {
        throw new Error("INVALID_REPLACEMENT_UNIT");
      }

      if (replacementUnit?.id === originalUnit.id) {
        throw new Error("SAME_REPLACEMENT_UNIT");
      }

      if (replacementUnit && data.replacementFinishedGoodId) {
        const expectedCode = relationContext.finishedGoodCodeById.get(
          data.replacementFinishedGoodId
        );
        if (expectedCode && expectedCode !== replacementUnit.productCode) {
          throw new Error("REPLACEMENT_PRODUCT_MISMATCH");
        }
      }

      const created = await tx.operationReplacement.create({
        data: {
          code: data.code,
          status: data.status || "draft",
          replacementType: data.replacementType || "warranty",
          reason: data.reason || null,
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          warrantyId: data.warrantyId || null,
          commercialOrderId: data.commercialOrderId || null,
          originalFinishedGoodId: data.originalFinishedGoodId || null,
          replacementFinishedGoodId: data.replacementFinishedGoodId || null,
          originalDispatchId: data.originalDispatchId || null,
          replacementDispatchId: data.replacementDispatchId || null,
          originalUnitId: originalUnit.id,
          originalInternalLabel: originalUnit.internalLabel,
          replacementUnitId: replacementUnit?.id || null,
          replacementInternalLabel: replacementUnit?.internalLabel || null,
          notes: data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: data.reason || "Reemplazo creado sobre unidad entregada",
              metadataJson: JSON.stringify({
                replacementType: data.replacementType || "warranty",
                warrantyId: data.warrantyId || null,
                commercialOrderId: data.commercialOrderId || null,
                originalDispatchId: data.originalDispatchId || null,
                replacementFinishedGoodId: data.replacementFinishedGoodId || null,
                originalUnitId: originalUnit.id,
                originalInternalLabel: originalUnit.internalLabel,
                replacementUnitId: replacementUnit?.id || null,
                replacementInternalLabel: replacementUnit?.internalLabel || null,
              }),
              createdById,
            },
          },
        },
        include: replacementInclude,
      });

      await recordFinishedGoodUnitPostSaleEvent({
        tx,
        unitId: originalUnit.id,
        eventType: "REPLACEMENT_REQUESTED",
        referenceType: "replacement",
        referenceId: created.id,
        reason: data.reason || "Reemplazo solicitado",
        metadataJson: {
          replacementType: data.replacementType || "warranty",
          replacementUnitId: replacementUnit?.id || null,
          commercialOrderId: data.commercialOrderId || null,
          originalDispatchId: data.originalDispatchId || null,
        },
      });

      return created;
    });

    return NextResponse.json({ replacement }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const response = relationErrorResponse(error);
      if (response) return response;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un reemplazo con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/replacements] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear reemplazo" },
      { status: 500 }
    );
  }
}

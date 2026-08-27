import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { assertPostSaleUnitOrigin } from "@/lib/operations/assert-postsale-unit-origin";
import { recordFinishedGoodUnitPostSaleEvent } from "@/lib/operations/record-finished-good-unit-postsale-event";
import { CreateReturnSchema, getFirstValidationMessage } from "./returns.helpers";
import { returnInclude } from "./returns.include";

export const dynamic = "force-dynamic";

type RelationContext = {
  warrantyUnitId: string | null;
  replacementUnitIds: string[];
  finishedGoodCode: string | null;
};

async function assertRelationsExist(
  tx: Prisma.TransactionClient,
  data: {
    warrantyId?: string | null;
    replacementId?: string | null;
    commercialOrderId?: string | null;
    finishedGoodId?: string | null;
    originalDispatchId?: string | null;
  }
): Promise<RelationContext> {
  let warrantyUnitId: string | null = null;
  const replacementUnitIds: string[] = [];
  let finishedGoodCode: string | null = null;

  if (data.warrantyId) {
    const warranty = await tx.operationWarranty.findUnique({
      where: { id: data.warrantyId },
      select: { id: true, unitId: true },
    });
    if (!warranty) throw new Error("INVALID_WARRANTY");
    warrantyUnitId = warranty.unitId || null;
  }

  if (data.replacementId) {
    const replacement = await tx.operationReplacement.findUnique({
      where: { id: data.replacementId },
      select: {
        id: true,
        originalUnitId: true,
        replacementUnitId: true,
      },
    });
    if (!replacement) throw new Error("INVALID_REPLACEMENT");
    if (replacement.originalUnitId) replacementUnitIds.push(replacement.originalUnitId);
    if (replacement.replacementUnitId) replacementUnitIds.push(replacement.replacementUnitId);
  }

  if (data.commercialOrderId) {
    const commercialOrder = await tx.operationCommercialOrder.findUnique({
      where: { id: data.commercialOrderId },
      select: { id: true },
    });
    if (!commercialOrder) throw new Error("INVALID_COMMERCIAL_ORDER");
  }

  if (data.finishedGoodId) {
    const finishedGood = await tx.operationFinishedGood.findUnique({
      where: { id: data.finishedGoodId },
      select: { id: true, code: true },
    });
    if (!finishedGood) throw new Error("INVALID_FINISHED_GOOD");
    finishedGoodCode = finishedGood.code;
  }

  if (data.originalDispatchId) {
    const dispatch = await tx.operationDispatch.findUnique({
      where: { id: data.originalDispatchId },
      select: { id: true },
    });
    if (!dispatch) throw new Error("INVALID_DISPATCH");
  }

  return { warrantyUnitId, replacementUnitIds, finishedGoodCode };
}

function relationErrorResponse(error: Error) {
  if (error.message === "INVALID_WARRANTY") {
    return NextResponse.json({ error: "warrantyId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_REPLACEMENT") {
    return NextResponse.json({ error: "replacementId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_COMMERCIAL_ORDER") {
    return NextResponse.json({ error: "commercialOrderId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_FINISHED_GOOD") {
    return NextResponse.json({ error: "finishedGoodId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_DISPATCH") {
    return NextResponse.json({ error: "originalDispatchId no existe" }, { status: 400 });
  }

  if (error.message === "INVALID_UNIT") {
    return NextResponse.json({ error: "unitId/internalLabel no existe" }, { status: 400 });
  }

  if (error.message === "RETURN_UNIT_REQUIRED") {
    return NextResponse.json(
      { error: "La devolucion de cliente requiere una unidad fisica identificada" },
      { status: 400 }
    );
  }

  if (error.message === "UNIT_NOT_DELIVERED") {
    return NextResponse.json(
      { error: "Solo se puede registrar devolucion de una unidad ya entregada" },
      { status: 409 }
    );
  }

  if (error.message === "UNIT_DISPATCH_MISMATCH") {
    return NextResponse.json(
      { error: "La unidad no pertenece al despacho original indicado" },
      { status: 409 }
    );
  }

  if (error.message === "UNIT_ORDER_MISMATCH") {
    return NextResponse.json(
      { error: "La unidad no pertenece al pedido indicado" },
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

  if (error.message === "REPLACEMENT_UNIT_MISMATCH") {
    return NextResponse.json(
      { error: "El reemplazo indicado no corresponde a esta unidad" },
      { status: 409 }
    );
  }

  if (error.message === "UNIT_FINISHED_GOOD_MISMATCH") {
    return NextResponse.json(
      { error: "La unidad no coincide con el producto terminado indicado" },
      { status: 409 }
    );
  }

  return null;
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const returns = await prisma.operationReturn.findMany({
      orderBy: { createdAt: "desc" },
      include: returnInclude,
    });

    return NextResponse.json({ returns });
  } catch (error) {
    console.error("[operations/returns] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar devoluciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;
  const returnType = data.returnType || "customer_return";

  try {
    const operationReturn = await prisma.$transaction(async (tx) => {
      const relationContext = await assertRelationsExist(tx, data);

      let unit: null | {
        id: string;
        internalLabel: string;
        productCode: string;
        productName: string;
      } = null;

      if (data.unitId || data.internalLabel) {
        const resolved = data.unitId
          ? await tx.operationFinishedGoodUnit.findUnique({
              where: { id: data.unitId },
              select: {
                id: true,
                internalLabel: true,
                productCode: true,
                productName: true,
              },
            })
          : await tx.operationFinishedGoodUnit.findUnique({
              where: { internalLabel: data.internalLabel as string },
              select: {
                id: true,
                internalLabel: true,
                productCode: true,
                productName: true,
              },
            });

        if (!resolved) throw new Error("INVALID_UNIT");

        await assertPostSaleUnitOrigin({
          tx,
          unitId: resolved.id,
          dispatchId: data.originalDispatchId || null,
          commercialOrderId: data.commercialOrderId || null,
        });

        if (
          relationContext.warrantyUnitId &&
          relationContext.warrantyUnitId !== resolved.id
        ) {
          throw new Error("WARRANTY_UNIT_MISMATCH");
        }

        if (
          relationContext.replacementUnitIds.length > 0 &&
          !relationContext.replacementUnitIds.includes(resolved.id)
        ) {
          throw new Error("REPLACEMENT_UNIT_MISMATCH");
        }

        if (
          relationContext.finishedGoodCode &&
          relationContext.finishedGoodCode !== resolved.productCode
        ) {
          throw new Error("UNIT_FINISHED_GOOD_MISMATCH");
        }

        unit = resolved;
      } else if (returnType === "customer_return") {
        throw new Error("RETURN_UNIT_REQUIRED");
      }

      const created = await tx.operationReturn.create({
        data: {
          code: data.code,
          status: data.status || "draft",
          returnType,
          reason: data.reason || null,
          resolution: data.resolution || null,
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          warrantyId: data.warrantyId || null,
          replacementId: data.replacementId || null,
          commercialOrderId: data.commercialOrderId || null,
          finishedGoodId: data.finishedGoodId || null,
          originalDispatchId: data.originalDispatchId || null,
          unitId: unit?.id || null,
          internalLabel: unit?.internalLabel || data.internalLabel || null,
          productCode: unit?.productCode || data.productCode || null,
          productName: unit?.productName || data.productName || null,
          notes: data.notes || null,
          events: {
            create: {
              eventType: "CREATED",
              reason: data.reason || "Devolucion creada",
              metadataJson: JSON.stringify({
                returnType,
                warrantyId: data.warrantyId || null,
                replacementId: data.replacementId || null,
                commercialOrderId: data.commercialOrderId || null,
                finishedGoodId: data.finishedGoodId || null,
                unitId: unit?.id || null,
                internalLabel: unit?.internalLabel || null,
                originalDispatchId: data.originalDispatchId || null,
              }),
              createdById,
            },
          },
        },
        include: returnInclude,
      });

      if (unit) {
        await recordFinishedGoodUnitPostSaleEvent({
          tx,
          unitId: unit.id,
          eventType: "RETURN_REQUESTED",
          referenceType: "return",
          referenceId: created.id,
          reason: data.reason || "Devolucion solicitada",
          metadataJson: {
            returnType,
            originalDispatchId: data.originalDispatchId || null,
            commercialOrderId: data.commercialOrderId || null,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ return: operationReturn }, { status: 201 });
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
        { error: "Ya existe una devolucion con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/returns] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear devolucion" },
      { status: 500 }
    );
  }
}

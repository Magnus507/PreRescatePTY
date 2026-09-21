import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  getFirstValidationMessage,
  UpdateFinishedGoodSchema,
} from "../finished-goods.helpers";
import { Prisma } from "@prisma/client";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";
import { cleanupUploadedObjectOrRecordOrphan } from "@/lib/storage-cleanup-outbox";

export const dynamic = "force-dynamic";

const packingBatchSelect = {
  id: true,
  code: true,
  status: true,
  packageType: true,
  plannedQuantity: true,
  packedQuantity: true,
  rejectedQuantity: true,
  labelCode: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const finishedGood = await prisma.operationFinishedGood.findUnique({
      where: { id },
      include: {
        packingBatch: {
          select: packingBatchSelect,
        },
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!finishedGood) {
      return NextResponse.json(
        { error: "Producto terminado no encontrado" },
        { status: 404 }
      );
    }

    const stockRows = await loadInventoryStockRows();
    const balance = stockRows.find((row) => row.productCode === finishedGood.code)?.availableCount ?? 0;

    return NextResponse.json({
      finishedGood: {
        ...finishedGood,
        balance,
      },
    });
  } catch (error) {
    console.error("[operations/finished-goods/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar producto terminado" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateFinishedGoodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const finishedGood = await prisma.operationFinishedGood.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!finishedGood) {
      return NextResponse.json(
        { error: "Producto terminado no encontrado" },
        { status: 404 }
      );
    }

    const updatedFinishedGood = await prisma.operationFinishedGood.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.productType !== undefined ? { productType: data.productType } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });

    return NextResponse.json({ finishedGood: updatedFinishedGood });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un producto terminado con ese code" },
        { status: 409 }
      );
    }

    console.error("[operations/finished-goods/:id] PATCH error:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto terminado" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const finishedGood = await tx.operationFinishedGood.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          name: true,
          packingBatchId: true,
          _count: {
            select: {
              events: true,
              dispatchItems: true,
              commercialItems: true,
              warranties: true,
              returns: true,
              originalReplacements: true,
              replacementReplacements: true,
            },
          },
          operationalMapping: {
            select: {
              id: true,
              productId: true,
              product: {
                select: {
                  image: true,
                  _count: {
                    select: {
                      orderItems: true,
                      corporateOrderItems: true,
                      productRequestItems: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!finishedGood) {
        return { missing: true as const };
      }

      const [unitCount, digitalBatchCount, productionReference] = await Promise.all([
        tx.operationFinishedGoodUnit.count({
          where: { productCode: finishedGood.code },
        }),
        tx.operationDigitalBatch.count({
          where: { finishedGoodCode: finishedGood.code },
        }),
        tx.operationProductionEvent.findFirst({
          where: {
            metadataJson: {
              contains: `"productCode":"${finishedGood.code}"`,
            },
          },
          select: { id: true },
        }),
      ]);

      const operationalHistoryCount =
        finishedGood._count.events +
        finishedGood._count.dispatchItems +
        finishedGood._count.commercialItems +
        finishedGood._count.warranties +
        finishedGood._count.returns +
        finishedGood._count.originalReplacements +
        finishedGood._count.replacementReplacements +
        unitCount +
        digitalBatchCount +
        (productionReference ? 1 : 0) +
        (finishedGood.packingBatchId ? 1 : 0);

      const storeProduct = finishedGood.operationalMapping?.product || null;
      const storeHistoryCount = storeProduct
        ? storeProduct._count.orderItems +
          storeProduct._count.corporateOrderItems +
          storeProduct._count.productRequestItems
        : 0;

      if (operationalHistoryCount > 0 || storeHistoryCount > 0) {
        return {
          blocked: true as const,
          name: finishedGood.name,
          operationalHistoryCount,
          storeHistoryCount,
        };
      }

      let imageToCleanup: string | null = null;
      const storeProductId = finishedGood.operationalMapping?.productId || null;
      if (storeProductId) {
        const image = storeProduct?.image || null;
        if (image) {
          const otherImageReferences = await tx.product.count({
            where: {
              id: { not: storeProductId },
              image,
            },
          });
          if (otherImageReferences === 0) imageToCleanup = image;
        }

        await tx.product.delete({ where: { id: storeProductId } });
      }

      await tx.operationFinishedGood.delete({ where: { id } });

      return {
        deleted: true as const,
        name: finishedGood.name,
        imageToCleanup,
      };
    });

    if ("missing" in result) {
      return NextResponse.json(
        { error: "Producto terminado no encontrado" },
        { status: 404 }
      );
    }

    if ("blocked" in result) {
      return NextResponse.json(
        {
          error:
            "Este producto ya tiene producción, inventario, pedidos o historial asociado. Para proteger la trazabilidad no se puede eliminar; puedes ocultarlo de la Tienda.",
        },
        { status: 409 }
      );
    }

    if (result.imageToCleanup) {
      await cleanupUploadedObjectOrRecordOrphan(result.imageToCleanup, {
        actorUserId: auth.session.user.id || null,
        accountId: auth.session.user.accountId || null,
      }).catch((error) => {
        console.error("[operations/finished-goods/:id] image cleanup error:", error);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Producto "${result.name}" eliminado`,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "El producto está relacionado con historial operativo y no puede eliminarse. Ocúltalo de la Tienda si ya no debe venderse.",
        },
        { status: 409 }
      );
    }

    console.error("[operations/finished-goods/:id] DELETE error:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto terminado" },
      { status: 500 }
    );
  }
}

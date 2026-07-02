import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: productionOrderId } = await params;
  const body = await req.json().catch(() => ({}));
  const requestedQuantity = Number(body?.quantity);

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productionOrder = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        include: {
          digitalItems: {
            orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
          },
        },
      });

      if (!productionOrder) return null;

      const targetQuantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0
        ? Math.floor(requestedQuantity)
        : Math.max(0, Math.floor(productionOrder.plannedQuantity));

      const existingCount = productionOrder.digitalItems.length;
      const missingCount = Math.max(targetQuantity - existingCount, 0);

      if (missingCount === 0) {
        return {
          productionOrder,
          createdItems: [],
          existingCount,
          targetQuantity,
          inconsistent: existingCount > targetQuantity,
        };
      }

      const candidateItems = await tx.operationDigitalBatchItem.findMany({
        where: {
          productionOrderId: null,
          status: { in: ["available", "generated"] },
          batch: {
            productType: productionOrder.outputType,
          },
        },
        orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
        take: missingCount,
      });

      if (candidateItems.length < missingCount) {
        throw new Error("INSUFFICIENT_DIGITAL_ITEMS");
      }

      const preparedAt = new Date();
      const createdById = auth.session.user.id || null;

      const updatedItems = [];
      for (const item of candidateItems) {
        const updated = await tx.operationDigitalBatchItem.update({
          where: { id: item.id },
          data: {
            productionOrderId,
            shortCode: item.shortCode || item.internalLabel,
            activationUrl: item.activationUrl || item.qrUrl,
            nfcProgrammed: false,
            qrPrepared: false,
            preparedAt,
            preparedBy: createdById,
            status: "generated",
          },
        });
        updatedItems.push(updated);
      }

      await tx.operationProductionEvent.create({
        data: {
          productionOrderId,
          eventType: "DIGITAL_PREPARATION_CREATED",
          quantity: updatedItems.length,
          reason: "Preparacion digital creada",
          metadataJson: JSON.stringify({
            productionOrderId,
            createdItemIds: updatedItems.map((item) => item.id),
          }),
          createdById,
        },
      });

      await tx.operationProductionOrder.update({
        where: { id: productionOrderId },
        data: {
          status: productionOrder.status === "draft" ? "planned" : productionOrder.status,
        },
      });

      const refreshed = await tx.operationProductionOrder.findUnique({
        where: { id: productionOrderId },
        include: {
          digitalItems: {
            orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
          },
        },
      });

      return {
        productionOrder: refreshed,
        createdItems: updatedItems,
        existingCount,
        targetQuantity,
        inconsistent: false,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Orden de produccion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ preparation: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_DIGITAL_ITEMS") {
      return NextResponse.json({ error: "No hay suficientes recursos digitales disponibles para preparar" }, { status: 409 });
    }

    console.error("[operations/production-orders/:id/prepare-digital-items] POST error:", error);
    return NextResponse.json({ error: "Error al preparar recursos digitales" }, { status: 500 });
  }
}

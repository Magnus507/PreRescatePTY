import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSequentialCode } from "@/lib/operations/order-code";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function getProductInfo(item: {
  finishedGood?: { code: string; name: string; productType: string } | null;
  productCode: string | null;
  productName: string;
}) {
  return {
    productCode: item.finishedGood?.code || item.productCode || "UNKNOWN",
    productName: item.finishedGood?.name || item.productName,
    productType: item.finishedGood?.productType || item.productCode || "general",
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: commercialOrderId } = await params;

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const commercialOrder = await tx.operationCommercialOrder.findUnique({
        where: { id: commercialOrderId },
        include: {
          items: {
            include: {
              finishedGood: {
                select: { code: true, name: true, productType: true },
              },
            },
          },
        },
      });

      if (!commercialOrder) return null;
      if (commercialOrder.status === "cancelled" || commercialOrder.status === "rejected") {
        throw new Error("COMMERCIAL_ORDER_CANCELLED");
      }

      const productionNotesMarker = `[commercialOrderId:${commercialOrder.id}]`;
      const existingProductionOrder = await tx.operationProductionOrder.findFirst({
        where: {
          notes: {
            contains: productionNotesMarker,
          },
        },
      });

      if (existingProductionOrder) {
        await tx.operationCommercialOrder.update({
          where: { id: commercialOrder.id },
          data: {
            fulfillmentStatus: "requested",
          },
        });

        return {
          commercialOrder,
          productionOrder: existingProductionOrder,
          created: false,
        };
      }

      const totalQuantity = commercialOrder.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
      const firstItem = commercialOrder.items[0];
      const productInfo = getProductInfo(firstItem);
      const isInternal = commercialOrder.customerType === "internal";
      const productionTitle = isInternal
        ? `Producción interna desde ${commercialOrder.code}`
        : `Producción desde ${commercialOrder.code}`;
      const productionNotes = isInternal
        ? `${productionNotesMarker} Pedido interno para fabricar inventario.`
        : `${productionNotesMarker} Pedido operativo enviado a producción real.`;
      const productionCode = await generateSequentialCode({
        tx,
        model: "productionOrder",
        prefix: isInternal ? "PROD-INT" : "PROD",
      });

      const productionOrder = await tx.operationProductionOrder.create({
        data: {
          code: productionCode,
          title: productionTitle,
          status: "draft",
          plannedQuantity: totalQuantity,
          producedQuantity: 0,
          outputType: productInfo.productType,
          notes: productionNotes,
          events: {
            create: {
              eventType: "CREATED",
              quantity: totalQuantity,
              reason: isInternal
                ? `Orden creada desde pedido interno ${commercialOrder.code}`
                : `Orden creada desde pedido comercial ${commercialOrder.code}`,
              metadataJson: JSON.stringify({
                commercialOrderId: commercialOrder.id,
                commercialOrderCode: commercialOrder.code,
                itemCount: commercialOrder.items.length,
                productType: productInfo.productType,
                orderSource: isInternal ? "internal" : "commercial",
              }),
              createdById: auth.session.user.id || null,
            },
          },
        },
      });

      await tx.operationCommercialOrderEvent.create({
        data: {
          commercialOrderId: commercialOrder.id,
          eventType: "FULFILLMENT_REQUESTED",
          reason: "Pedido enviado a producción",
          referenceType: "production_order",
          referenceId: productionOrder.id,
          metadataJson: JSON.stringify({
            productionOrderId: productionOrder.id,
            productionOrderCode: productionOrder.code,
          }),
          createdById: auth.session.user.id || null,
        },
      });

      await tx.operationCommercialOrder.update({
        where: { id: commercialOrder.id },
        data: {
          fulfillmentStatus: "requested",
        },
      });

      return {
        commercialOrder,
        productionOrder,
        created: true,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "COMMERCIAL_ORDER_CANCELLED") {
      return NextResponse.json({ error: "El pedido cancelado no puede enviarse a produccion" }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una orden de produccion con ese code" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/send-to-production] POST error:", error);
    return NextResponse.json({ error: "Error al enviar el pedido a produccion" }, { status: 500 });
  }
}

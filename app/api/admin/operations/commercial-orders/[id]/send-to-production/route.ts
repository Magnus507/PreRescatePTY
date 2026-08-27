import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSequentialCode } from "@/lib/operations/order-code";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const BACKORDER_MARKER_PREFIX = "W605H-B-BACKORDER-PRODUCTION";

function getProductInfo(item: {
  finishedGood?: { code: string; name: string; productType: string } | null;
  productCode: string | null;
  productName: string;
}) {
  return {
    productCode: item.finishedGood?.code || item.productCode || "UNKNOWN",
    productName: item.finishedGood?.name || item.productName,
    productType: item.finishedGood?.productType || "general",
  };
}

function normalizeMode(value: unknown): "backorder" | "full" {
  return value === "backorder" ? "backorder" : "full";
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: commercialOrderId } = await params;
  const body = await req.json().catch(() => ({}));
  const mode = normalizeMode(body?.mode);
  const explicitPlannedQuantity = toPositiveInteger(body?.plannedQuantity);
  const confirmPendingPayment = Boolean(body?.confirmPendingPayment);

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
      if (commercialOrder.paymentStatus === "pending" && !confirmPendingPayment) {
        throw new Error("PENDING_PAYMENT_CONFIRMATION_REQUIRED");
      }

      const productCodes = Array.from(
        new Set(
          commercialOrder.items
            .map((item) => getProductInfo(item).productCode)
            .filter((code) => code && code !== "UNKNOWN")
        )
      );
      const totalQuantity = commercialOrder.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
      const firstItem = commercialOrder.items[0];
      const productInfo = firstItem ? getProductInfo(firstItem) : null;
      const isInternal = commercialOrder.customerType === "internal";
      const productionTitle = isInternal
        ? `Producción interna desde ${commercialOrder.code}`
        : `Producción desde ${commercialOrder.code}`;
      const productionNotesMarker = `${BACKORDER_MARKER_PREFIX}:${commercialOrder.id}`;
      const legacyMarker = `[commercialOrderId:${commercialOrder.id}]`;
      const existingProductionOrder = await tx.operationProductionOrder.findFirst({
        where: {
          OR: [
            { notes: { contains: productionNotesMarker } },
            { notes: { contains: legacyMarker } },
          ],
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

      if (!productInfo) {
        throw new Error("COMMERCIAL_ORDER_ITEMS_REQUIRED");
      }

      let plannedQuantity = totalQuantity;
      let backorderQty: number | null = null;
      let productionReason = isInternal
        ? `Orden creada desde pedido interno ${commercialOrder.code}`
        : `Orden creada desde pedido comercial ${commercialOrder.code}`;
      let productionMetadata: Record<string, unknown> = {
        commercialOrderId: commercialOrder.id,
        commercialOrderCode: commercialOrder.code,
        itemCount: commercialOrder.items.length,
        productType: productInfo.productType,
        orderSource: isInternal ? "internal" : "commercial",
      };

      if (!isInternal && mode === "backorder") {
        if (productCodes.length !== 1) {
          throw new Error("BACKORDER_MULTI_PRODUCT_NOT_SUPPORTED");
        }

        const stockRows = await loadInventoryStockRows();
        const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));
        const productCode = productCodes[0];
        const availableStock = Math.max(0, stockByCode.get(productCode)?.availableCount ?? 0);
        backorderQty = Math.max(totalQuantity - availableStock, 0);

        if (backorderQty <= 0 && !explicitPlannedQuantity) {
          throw new Error("BACKORDER_QTY_REQUIRED");
        }

        plannedQuantity = explicitPlannedQuantity ?? backorderQty;
        if (plannedQuantity <= 0) {
          throw new Error("BACKORDER_QTY_REQUIRED");
        }

        productionReason = `Orden creada desde pedido comercial ${commercialOrder.code} por faltante de backorder`;
        productionMetadata = {
          ...productionMetadata,
          mode: "backorder",
          productCode,
          requestedQuantity: totalQuantity,
          availableStock,
          backorderQty,
          plannedQuantity,
          confirmPendingPayment,
        };
      } else {
        if (explicitPlannedQuantity && explicitPlannedQuantity !== totalQuantity) {
          plannedQuantity = explicitPlannedQuantity;
        }
        productionMetadata = {
          ...productionMetadata,
          mode: "full",
          productCode: productInfo.productCode,
          requestedQuantity: totalQuantity,
          plannedQuantity,
        };
      }

      const productionNotes = isInternal
        ? `${legacyMarker} Pedido interno para fabricar inventario.`
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
          plannedQuantity,
          producedQuantity: 0,
          outputType: productInfo.productType,
          notes: productionNotes,
          events: {
            create: {
              eventType: "CREATED",
              quantity: plannedQuantity,
              reason: productionReason,
              metadataJson: JSON.stringify(productionMetadata),
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
        mode,
        plannedQuantity,
        productCode: productInfo.productCode,
        backorderQty,
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
    if (error instanceof Error && error.message === "PENDING_PAYMENT_CONFIRMATION_REQUIRED") {
      return NextResponse.json({ error: "Confirma explícitamente que deseas enviar un pedido con pago pendiente a producción" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "BACKORDER_MULTI_PRODUCT_NOT_SUPPORTED") {
      return NextResponse.json({ error: "El modo backorder solo admite pedidos con un único productCode. Crea producciones separadas o usa modo full." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "BACKORDER_QTY_REQUIRED") {
      return NextResponse.json({ error: "No se pudo determinar una cantidad faltante válida para producir" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "COMMERCIAL_ORDER_ITEMS_REQUIRED") {
      return NextResponse.json({ error: "El pedido no tiene items válidos para producir" }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una orden de produccion con ese code" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/send-to-production] POST error:", error);
    return NextResponse.json({ error: "Error al enviar el pedido a produccion" }, { status: 500 });
  }
}

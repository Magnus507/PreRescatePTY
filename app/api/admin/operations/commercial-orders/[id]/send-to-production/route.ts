import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSequentialCode } from "@/lib/operations/order-code";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const BACKORDER_MARKER_PREFIX = "W605H-B-BACKORDER-PRODUCTION";

function getProductInfo(item: {
  finishedGood?: { code: string; name: string; productType: string } | null;
  productCode: string | null;
  productName: string;
}) {
  return {
    productCode: item.finishedGood?.code || item.productCode || "",
    productName: item.finishedGood?.name || item.productName,
    productType: item.finishedGood?.productType || item.productCode || "general",
  };
}

function normalizeMode(value: unknown): "backorder" | "full" | null {
  if (value === "backorder" || value === "full") return value;
  return null;
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
  const requestId = getAuditRequestId(req);
  const body = await req.json().catch(() => ({}));
  const mode = normalizeMode(body?.mode);
  if (!mode) {
    return NextResponse.json(
      { error: "Debes indicar mode=full o mode=backorder explícitamente" },
      { status: 400 }
    );
  }
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
      if (["cancelled", "rejected", "completed", "dispatch_created"].includes(commercialOrder.status)) {
        throw new Error("COMMERCIAL_ORDER_LOCKED");
      }
      if (commercialOrder.paymentStatus === "pending" && !confirmPendingPayment) {
        throw new Error("PENDING_PAYMENT_CONFIRMATION_REQUIRED");
      }

      const groupedProducts = new Map<
        string,
        { productCode: string; productName: string; productType: string; requestedQty: number }
      >();
      for (const item of commercialOrder.items) {
        const info = getProductInfo(item);
        if (!info.productCode) throw new Error("MISSING_PRODUCT_CODE");
        const existing = groupedProducts.get(info.productCode);
        if (existing) {
          existing.requestedQty += item.quantity;
        } else {
          groupedProducts.set(info.productCode, {
            ...info,
            requestedQty: item.quantity,
          });
        }
      }

      const products = Array.from(groupedProducts.values());
      if (products.length === 0) throw new Error("COMMERCIAL_ORDER_ITEMS_REQUIRED");
      if (products.length > 1 && explicitPlannedQuantity) {
        throw new Error("MULTI_PRODUCT_EXPLICIT_QTY_NOT_SUPPORTED");
      }

      const isInternal = commercialOrder.customerType === "internal";
      if (isInternal && mode === "backorder") {
        throw new Error("INTERNAL_BACKORDER_NOT_ALLOWED");
      }

      const legacyMarker = `[commercialOrderId:${commercialOrder.id}]`;
      const productionResults: Array<{
        productionOrder: { id: string; code: string; plannedQuantity: number; status: string };
        created: boolean;
        productCode: string;
        plannedQuantity: number;
        backorderQty: number | null;
      }> = [];

      for (const product of products) {
        let backorderQty: number | null = null;
        let plannedQuantity = product.requestedQty;

        if (!isInternal && mode === "backorder") {
          const availableStock = await tx.operationFinishedGoodUnit.count({
            where: {
              productCode: product.productCode,
              status: "available",
              qaStatus: "passed",
              activationStatus: "not_activated",
              reservedOrderId: null,
              dispatchItems: { none: {} },
            },
          });
          backorderQty = Math.max(product.requestedQty - availableStock, 0);
          plannedQuantity = explicitPlannedQuantity ?? backorderQty;
          if (plannedQuantity <= 0) continue;
        } else if (explicitPlannedQuantity) {
          plannedQuantity = explicitPlannedQuantity;
        }

        const productionMarker = `${BACKORDER_MARKER_PREFIX}:${commercialOrder.id}:${product.productCode}`;
        const existingProductionOrder = await tx.operationProductionOrder.findFirst({
          where: {
            OR: [
              { notes: { contains: productionMarker } },
              ...(products.length === 1 ? [{ notes: { contains: legacyMarker } }] : []),
            ],
          },
          select: { id: true, code: true, plannedQuantity: true, status: true },
        });

        if (existingProductionOrder) {
          productionResults.push({
            productionOrder: existingProductionOrder,
            created: false,
            productCode: product.productCode,
            plannedQuantity: existingProductionOrder.plannedQuantity,
            backorderQty,
          });
          continue;
        }

        const productionCode = await generateSequentialCode({
          tx,
          model: "productionOrder",
          prefix: isInternal ? "PROD-INT" : "PROD",
        });
        const productionTitle = isInternal
          ? `Producción interna desde ${commercialOrder.code} · ${product.productName}`
          : `Producción desde ${commercialOrder.code} · ${product.productName}`;
        const productionReason = isInternal
          ? `Orden creada desde pedido interno ${commercialOrder.code}`
          : mode === "backorder"
            ? `Orden creada desde pedido comercial ${commercialOrder.code} por faltante de backorder`
            : `Orden creada desde pedido comercial ${commercialOrder.code}`;
        const productionNotes = isInternal
          ? `${productionMarker} ${legacyMarker} Pedido interno para fabricar inventario.`
          : `${productionMarker} ${legacyMarker} Pedido operativo enviado a producción real.`;

        const productionOrder = await tx.operationProductionOrder.create({
          data: {
            code: productionCode,
            title: productionTitle.slice(0, 180),
            status: "draft",
            plannedQuantity,
            producedQuantity: 0,
            outputType: product.productType,
            notes: productionNotes,
            events: {
              create: {
                eventType: "CREATED",
                quantity: plannedQuantity,
                reason: productionReason,
                metadataJson: JSON.stringify({
                  commercialOrderId: commercialOrder.id,
                  commercialOrderCode: commercialOrder.code,
                  orderSource: isInternal ? "internal" : "commercial",
                  mode,
                  productCode: product.productCode,
                  productName: product.productName,
                  productType: product.productType,
                  requestedQuantity: product.requestedQty,
                  backorderQty,
                  plannedQuantity,
                  confirmPendingPayment,
                }),
                createdById: auth.session.user.id || null,
              },
            },
          },
          select: { id: true, code: true, plannedQuantity: true, status: true },
        });

        await tx.operationCommercialOrderEvent.create({
          data: {
            commercialOrderId: commercialOrder.id,
            eventType: "FULFILLMENT_REQUESTED",
            reason: `Producto ${product.productCode} enviado a producción`,
            referenceType: "production_order",
            referenceId: productionOrder.id,
            metadataJson: JSON.stringify({
              productionOrderId: productionOrder.id,
              productionOrderCode: productionOrder.code,
              productCode: product.productCode,
              plannedQuantity,
              mode,
            }),
            createdById: auth.session.user.id || null,
          },
        });

        productionResults.push({
          productionOrder,
          created: true,
          productCode: product.productCode,
          plannedQuantity,
          backorderQty,
        });
      }

      if (productionResults.length === 0) throw new Error("BACKORDER_QTY_REQUIRED");

      await tx.operationCommercialOrder.update({
        where: { id: commercialOrder.id },
        data: { fulfillmentStatus: "requested" },
      });

      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "operation_commercial_order",
        entityId: commercialOrder.id,
        action: "commercial_order.sent_to_production",
        requestId,
        before: {
          status: commercialOrder.status,
          fulfillmentStatus: commercialOrder.fulfillmentStatus,
          paymentStatus: commercialOrder.paymentStatus,
        },
        after: {
          mode,
          productions: productionResults.map((entry) => ({
            productionOrderId: entry.productionOrder.id,
            productionOrderCode: entry.productionOrder.code,
            productCode: entry.productCode,
            plannedQuantity: entry.plannedQuantity,
            backorderQty: entry.backorderQty,
            created: entry.created,
          })),
        },
      });

      return {
        commercialOrder,
        productionOrder: productionResults[0]?.productionOrder || null,
        productionOrders: productionResults.map((entry) => entry.productionOrder),
        productionOrderCode: productionResults[0]?.productionOrder.code || null,
        productionOrderCodes: productionResults.map((entry) => entry.productionOrder.code),
        created: productionResults.some((entry) => entry.created),
        mode,
        products: productionResults.map((entry) => ({
          productCode: entry.productCode,
          plannedQuantity: entry.plannedQuantity,
          backorderQty: entry.backorderQty,
        })),
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "COMMERCIAL_ORDER_LOCKED") {
      return NextResponse.json({ error: "El pedido ya no permite crear producción" }, { status: 409 });
    }
    if (message === "PENDING_PAYMENT_CONFIRMATION_REQUIRED") {
      return NextResponse.json({ error: "Confirma explícitamente que deseas enviar un pedido con pago pendiente a producción" }, { status: 400 });
    }
    if (message === "BACKORDER_QTY_REQUIRED") {
      return NextResponse.json({ error: "No existe faltante físico que requiera producción" }, { status: 409 });
    }
    if (message === "COMMERCIAL_ORDER_ITEMS_REQUIRED") {
      return NextResponse.json({ error: "El pedido no tiene items válidos para producir" }, { status: 400 });
    }
    if (message === "MISSING_PRODUCT_CODE") {
      return NextResponse.json({ error: "Todos los artículos deben tener un productCode canónico antes de producir" }, { status: 400 });
    }
    if (message === "MULTI_PRODUCT_EXPLICIT_QTY_NOT_SUPPORTED") {
      return NextResponse.json({ error: "plannedQuantity explícito solo se admite en pedidos de un único SKU" }, { status: 400 });
    }
    if (message === "INTERNAL_BACKORDER_NOT_ALLOWED") {
      return NextResponse.json({ error: "Los pedidos internos solo admiten producción completa" }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una orden de producción con ese código" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/send-to-production] POST error:", error);
    return NextResponse.json({ error: "Error al enviar el pedido a producción" }, { status: 500 });
  }
}

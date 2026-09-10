import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSequentialCode } from "@/lib/operations/order-code";
import { reserveCommercialOrderStock } from "@/lib/operations/commercial-order-reservation";
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
      // Serialize manual production decisions for the same commercial order.
      // This prevents two admin requests from deriving production from different
      // reservation snapshots and creating overlapping work orders.
      const orderLock = await tx.operationCommercialOrder.updateMany({
        where: { id: commercialOrderId },
        data: { updatedAt: new Date() },
      });
      if (orderLock.count !== 1) return null;

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
      if (mode === "backorder" && explicitPlannedQuantity) {
        throw new Error("BACKORDER_EXPLICIT_QTY_NOT_ALLOWED");
      }
      if (mode === "full" && products.length > 1 && explicitPlannedQuantity) {
        throw new Error("MULTI_PRODUCT_EXPLICIT_QTY_NOT_SUPPORTED");
      }

      const isInternal = commercialOrder.customerType === "internal";
      if (isInternal && mode === "backorder") {
        throw new Error("INTERNAL_BACKORDER_NOT_ALLOWED");
      }
      if (!isInternal && mode === "backorder" && commercialOrder.paymentStatus !== "paid") {
        throw new Error("BACKORDER_REQUIRES_PAID_ORDER");
      }

      const legacyMarker = `[commercialOrderId:${commercialOrder.id}]`;
      const existingProductionByCode = new Map<
        string,
        { id: string; code: string; plannedQuantity: number; status: string }
      >();

      for (const product of products) {
        const productionMarker = `${BACKORDER_MARKER_PREFIX}:${commercialOrder.id}:${product.productCode}`;
        const existingProductionOrder = await tx.operationProductionOrder.findFirst({
          where: {
            // A cancelled work order no longer covers outstanding customer
            // demand. Treating it as reusable here strands a paid backorder:
            // retries return the cancelled order instead of creating replacement
            // production, so fulfillment can never reach QA/reservation.
            status: { not: "cancelled" },
            OR: [
              { notes: { contains: productionMarker } },
              ...(products.length === 1 ? [{ notes: { contains: legacyMarker } }] : []),
            ],
          },
          select: { id: true, code: true, plannedQuantity: true, status: true },
        });
        if (existingProductionOrder) {
          existingProductionByCode.set(product.productCode, existingProductionOrder);
        }
      }

      const reservationOrderId = commercialOrder.sourceId || commercialOrder.id;
      let backorderByProductCode: Map<string, number> | null = null;

      if (!isInternal && mode === "backorder") {
        backorderByProductCode = new Map<string, number>();

        if (existingProductionByCode.size === 0) {
          // Backorder demand must be derived from the same reservation engine used
          // by checkout fulfillment. The engine first claims every currently
          // eligible physical unit for this order and then returns the exact
          // remaining shortage per canonical SKU. This prevents already-reserved
          // units from being manufactured a second time.
          const reservation = await reserveCommercialOrderStock(tx, {
            orderId: commercialOrder.id,
            allowPartial: true,
          });
          if (!reservation) throw new Error("COMMERCIAL_ORDER_ITEMS_REQUIRED");
          for (const missing of reservation.missingItems) {
            backorderByProductCode.set(missing.productCode, missing.missingQty);
          }
        } else {
          // Once production exists, do not silently claim newly-arrived inventory
          // on a retry; doing so can over-cover the order because the production
          // quantity was already committed. Only prove that each current shortage
          // is covered by an existing production order. Anything else requires a
          // deliberate reconciliation rather than an automatic second work order.
          const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
            where: {
              reservedOrderId: reservationOrderId,
              status: "reserved",
              qaStatus: "passed",
              activationStatus: "not_activated",
              dispatchItems: { none: {} },
            },
            select: { productCode: true },
          });
          const reservedByCode = new Map<string, number>();
          for (const unit of reservedUnits) {
            reservedByCode.set(unit.productCode, (reservedByCode.get(unit.productCode) || 0) + 1);
          }

          for (const product of products) {
            const missingQty = Math.max(
              0,
              product.requestedQty - (reservedByCode.get(product.productCode) || 0)
            );
            if (missingQty <= 0) continue;
            const existingProduction = existingProductionByCode.get(product.productCode);
            if (!existingProduction || existingProduction.plannedQuantity < missingQty) {
              throw new Error("BACKORDER_RECONCILIATION_REQUIRED");
            }
            backorderByProductCode.set(product.productCode, missingQty);
          }
        }
      }

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
          backorderQty = backorderByProductCode?.get(product.productCode) || 0;
          if (backorderQty <= 0) continue;
          plannedQuantity = backorderQty;
        } else if (explicitPlannedQuantity) {
          plannedQuantity = explicitPlannedQuantity;
        }

        const existingProductionOrder = existingProductionByCode.get(product.productCode);
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

        const productionMarker = `${BACKORDER_MARKER_PREFIX}:${commercialOrder.id}:${product.productCode}`;
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
    if (message === "BACKORDER_REQUIRES_PAID_ORDER") {
      return NextResponse.json({ error: "El modo backorder requiere un pedido pagado para reservar inventario antes de producir" }, { status: 409 });
    }
    if (message === "BACKORDER_EXPLICIT_QTY_NOT_ALLOWED") {
      return NextResponse.json({ error: "El modo backorder calcula el faltante automáticamente; usa mode=full para una cantidad manual" }, { status: 400 });
    }
    if (message === "BACKORDER_RECONCILIATION_REQUIRED") {
      return NextResponse.json({ error: "La reserva actual ya no coincide con la producción existente; revisa el pedido antes de crear otra orden" }, { status: 409 });
    }
    if (message === "BACKORDER_QTY_REQUIRED") {
      return NextResponse.json({ error: "No existe faltante físico que requiera producción" }, { status: 409 });
    }
    if (message === "ORDER_NOT_READY_FOR_RESERVATION" || message === "SOURCE_ORDER_CANCELLED") {
      return NextResponse.json({ error: "El pedido ya no es elegible para reservar inventario y generar backorder" }, { status: 409 });
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

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSequentialCode } from "@/lib/operations/order-code";
import { loadInventoryStockRows } from "@/lib/operations/inventory-stock";
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
    productCode: item.finishedGood?.code?.trim() || item.productCode?.trim() || "",
    productName: item.finishedGood?.name?.trim() || item.productName,
    productType: item.finishedGood?.productType?.trim() || item.productCode?.trim() || "",
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
  const requestId = getAuditRequestId(req);
  const body = await req.json().catch(() => ({}));
  const mode = normalizeMode(body?.mode);
  const explicitPlannedQuantity = toPositiveInteger(body?.plannedQuantity);
  const confirmPendingPayment = Boolean(body?.confirmPendingPayment);

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Serialize production planning for the same operational order.
      await tx.operationCommercialOrder.updateMany({
        where: { id: commercialOrderId },
        data: { updatedAt: new Date() },
      });

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
      if (["cancelled", "rejected"].includes(commercialOrder.status)) {
        throw new Error("COMMERCIAL_ORDER_CANCELLED");
      }
      if (commercialOrder.paymentStatus === "pending" && !confirmPendingPayment) {
        throw new Error("PENDING_PAYMENT_CONFIRMATION_REQUIRED");
      }
      if (commercialOrder.items.length === 0) {
        throw new Error("COMMERCIAL_ORDER_ITEMS_REQUIRED");
      }

      const requirements = new Map<
        string,
        { productCode: string; productName: string; productType: string; requestedQuantity: number }
      >();

      for (const item of commercialOrder.items) {
        const info = getProductInfo(item);
        if (!info.productCode || !info.productType) {
          throw new Error("COMMERCIAL_ORDER_PRODUCT_IDENTITY_REQUIRED");
        }
        const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
        if (quantity <= 0) continue;

        const existing = requirements.get(info.productCode);
        if (existing) {
          if (
            existing.productType !== info.productType ||
            existing.productName !== info.productName
          ) {
            throw new Error("COMMERCIAL_ORDER_PRODUCT_IDENTITY_CONFLICT");
          }
          existing.requestedQuantity += quantity;
        } else {
          requirements.set(info.productCode, {
            ...info,
            requestedQuantity: quantity,
          });
        }
      }

      if (requirements.size === 0) throw new Error("COMMERCIAL_ORDER_ITEMS_REQUIRED");
      if (requirements.size > 1 && explicitPlannedQuantity) {
        throw new Error("MULTI_PRODUCT_EXPLICIT_QTY_AMBIGUOUS");
      }

      const isInternal = commercialOrder.customerType === "internal";
      const plannedByCode = new Map<string, number>();
      const backorderByCode = new Map<string, number>();
      const stockSnapshotByCode = new Map<string, number>();

      if (!isInternal && mode === "backorder" && commercialOrder.paymentStatus === "paid") {
        // Paid customer demand first claims physical stock transactionally. The
        // remaining quantities are the only quantities production may create.
        const reservation = await reserveCommercialOrderStock(tx, {
          orderId: commercialOrder.id,
          allowPartial: true,
        });
        if (!reservation) throw new Error("COMMERCIAL_ORDER_NOT_FOUND");

        for (const missing of reservation.missingItems) {
          if (!missing.productCode && missing.missingQty > 0) {
            throw new Error("COMMERCIAL_ORDER_PRODUCT_IDENTITY_REQUIRED");
          }
          if (missing.productCode && missing.missingQty > 0) {
            backorderByCode.set(missing.productCode, missing.missingQty);
            plannedByCode.set(missing.productCode, missing.missingQty);
          }
        }
      } else if (!isInternal && mode === "backorder") {
        // A pending-payment production is an explicit admin exception and cannot
        // reserve inventory. Use a read-only stock snapshot per SKU, never an
        // aggregate quantity, and preserve that fact in production metadata.
        const stockRows = await loadInventoryStockRows();
        const stockByCode = new Map(stockRows.map((row) => [row.productCode, row]));
        for (const [productCode, requirement] of requirements) {
          const availableStock = Math.max(0, stockByCode.get(productCode)?.availableCount ?? 0);
          const backorderQty = Math.max(requirement.requestedQuantity - availableStock, 0);
          stockSnapshotByCode.set(productCode, availableStock);
          if (backorderQty > 0) {
            backorderByCode.set(productCode, backorderQty);
            plannedByCode.set(productCode, backorderQty);
          }
        }
      } else {
        for (const [productCode, requirement] of requirements) {
          plannedByCode.set(productCode, requirement.requestedQuantity);
        }
      }

      if (explicitPlannedQuantity && requirements.size === 1) {
        const onlyCode = requirements.keys().next().value as string;
        plannedByCode.set(onlyCode, explicitPlannedQuantity);
        if (mode === "backorder") backorderByCode.set(onlyCode, explicitPlannedQuantity);
      }

      for (const [productCode, plannedQuantity] of [...plannedByCode]) {
        if (plannedQuantity <= 0) plannedByCode.delete(productCode);
      }
      if (plannedByCode.size === 0) throw new Error("BACKORDER_QTY_REQUIRED");

      const productions: Array<{
        productionOrder: Awaited<ReturnType<typeof tx.operationProductionOrder.create>>;
        productCode: string;
        plannedQuantity: number;
        backorderQty: number | null;
        created: boolean;
      }> = [];

      for (const [productCode, plannedQuantity] of plannedByCode) {
        const product = requirements.get(productCode);
        if (!product) throw new Error("COMMERCIAL_ORDER_PRODUCT_IDENTITY_REQUIRED");

        const productMarker = `[commercialOrderId:${commercialOrder.id}][productCode:${productCode}]`;
        const legacyBackorderMarker = `${BACKORDER_MARKER_PREFIX}:${commercialOrder.id}`;
        const legacyMarker = `[commercialOrderId:${commercialOrder.id}]`;
        let existingProductionOrder = await tx.operationProductionOrder.findFirst({
          where: { notes: { contains: productMarker } },
        });

        // Reuse a legacy unscoped production only for a single-product order and
        // only when its output identity is the exact one requested here.
        if (!existingProductionOrder && requirements.size === 1) {
          const legacy = await tx.operationProductionOrder.findFirst({
            where: {
              OR: [
                { notes: { contains: legacyBackorderMarker } },
                { notes: { contains: legacyMarker } },
              ],
            },
          });
          if (legacy?.outputType === product.productType) existingProductionOrder = legacy;
        }

        if (existingProductionOrder) {
          productions.push({
            productionOrder: existingProductionOrder,
            productCode,
            plannedQuantity,
            backorderQty: backorderByCode.get(productCode) ?? null,
            created: false,
          });
          continue;
        }

        const productionCode = await generateSequentialCode({
          tx,
          model: "productionOrder",
          prefix: isInternal ? "PROD-INT" : "PROD",
        });
        const backorderQty = backorderByCode.get(productCode) ?? null;
        const productionTitle = isInternal
          ? `Producción interna ${commercialOrder.code} · ${product.productName}`
          : `Producción ${commercialOrder.code} · ${product.productName}`;
        const productionReason = isInternal
          ? `Orden creada desde pedido interno ${commercialOrder.code}`
          : mode === "backorder"
            ? `Orden creada desde pedido comercial ${commercialOrder.code} por faltante de backorder`
            : `Orden creada desde pedido comercial ${commercialOrder.code}`;
        const productionNotes = isInternal
          ? `${productMarker} Pedido interno para fabricar inventario.`
          : `${productMarker} ${legacyBackorderMarker} Pedido operativo enviado a producción real.`;

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
                  sourceType: isInternal
                    ? "internal_production"
                    : commercialOrder.sourceId
                      ? "customer_order"
                      : "commercial_order",
                  orderSource: isInternal ? "internal" : "commercial",
                  orderId: commercialOrder.sourceId || null,
                  commercialOrderId: commercialOrder.id,
                  commercialOrderCode: commercialOrder.code,
                  productionScope: "order_product",
                  mode,
                  productCode,
                  productType: product.productType,
                  productName: product.productName,
                  requestedQuantity: product.requestedQuantity,
                  availableStockSnapshot: stockSnapshotByCode.get(productCode) ?? null,
                  backorderQty,
                  plannedQuantity,
                  confirmPendingPayment,
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
            reason: `Pedido enviado a producción: ${productCode}`,
            referenceType: "production_order",
            referenceId: productionOrder.id,
            metadataJson: JSON.stringify({
              productionOrderId: productionOrder.id,
              productionOrderCode: productionOrder.code,
              productCode,
              plannedQuantity,
            }),
            createdById: auth.session.user.id || null,
          },
        });

        productions.push({
          productionOrder,
          productCode,
          plannedQuantity,
          backorderQty,
          created: true,
        });
      }

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
          productionCount: productions.length,
          productions: productions.map((row) => ({
            id: row.productionOrder.id,
            code: row.productionOrder.code,
            productCode: row.productCode,
            plannedQuantity: row.plannedQuantity,
            backorderQty: row.backorderQty,
            created: row.created,
          })),
        },
      });

      return {
        commercialOrder,
        productionOrder: productions[0]?.productionOrder || null,
        productionOrders: productions.map((row) => row.productionOrder),
        productions,
        created: productions.some((row) => row.created),
        mode,
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const errors: Record<string, string> = {
      COMMERCIAL_ORDER_CANCELLED: "El pedido cancelado no puede enviarse a producción",
      PENDING_PAYMENT_CONFIRMATION_REQUIRED: "Confirma explícitamente que deseas enviar un pedido con pago pendiente a producción",
      BACKORDER_QTY_REQUIRED: "No hay una cantidad faltante válida para producir",
      COMMERCIAL_ORDER_ITEMS_REQUIRED: "El pedido no tiene artículos válidos para producir",
      COMMERCIAL_ORDER_PRODUCT_IDENTITY_REQUIRED: "Todos los artículos deben tener una identidad operacional canónica antes de producción",
      COMMERCIAL_ORDER_PRODUCT_IDENTITY_CONFLICT: "Dos artículos comparten código pero tienen identidades operacionales incompatibles",
      MULTI_PRODUCT_EXPLICIT_QTY_AMBIGUOUS: "Una cantidad manual única no puede aplicarse a varios productos. Usa las cantidades del pedido o crea producciones por producto.",
      ORDER_NOT_READY_FOR_RESERVATION: "El pedido pagado no está en un estado válido para reservar stock antes de producción",
    };
    if (errors[message]) {
      return NextResponse.json({ error: errors[message] }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una orden de producción con ese código" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/send-to-production] POST error:", error);
    return NextResponse.json({ error: "Error al enviar el pedido a producción" }, { status: 500 });
  }
}

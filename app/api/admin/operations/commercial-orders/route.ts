import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSequentialCode } from "@/lib/operations/order-code";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateCommercialOrderSchema,
  calculateCommercialOrderTotal,
  getFirstValidationMessage,
} from "./commercial-orders.helpers";

export const dynamic = "force-dynamic";

const finishedGoodSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  status: true,
  unit: true,
} as const;

const dispatchSelect = {
  id: true,
  code: true,
  status: true,
  destinationType: true,
} as const;

const commercialOrderInclude = {
  dispatch: {
    select: dispatchSelect,
  },
  items: {
    include: {
      finishedGood: {
        select: finishedGoodSelect,
      },
    },
  },
  events: {
    orderBy: { createdAt: "desc" },
    take: 10,
  },
} as const;

const productionNotesMarkerPattern = /\[commercialOrderId:([^\]]+)\]/;

async function createInternalProductionOrder(
  tx: Prisma.TransactionClient,
  commercialOrder: {
    id: string;
    code: string;
    customerType: string;
    items: Array<{
      quantity: number;
      productCode: string | null;
      productName: string;
      notes: string | null;
      finishedGoodId: string | null;
      unit: string;
    }>;
  },
  createdById: string | null
) {
  const totalQuantity = commercialOrder.items.reduce((sum, item) => sum + item.quantity, 0);
  const firstItem = commercialOrder.items[0];
  const outputType = firstItem?.productCode || firstItem?.productName || "internal";
  const productionNotesMarker = `[commercialOrderId:${commercialOrder.id}]`;
  const productionNotes = `${productionNotesMarker} Pedido interno para fabricar inventario.`;
  const code = await generateSequentialCode({
    tx,
    model: "productionOrder",
    prefix: "PROD-INT",
  });

  return tx.operationProductionOrder.create({
    data: {
      code,
      title: `Producción interna desde ${commercialOrder.code}`,
      status: "draft",
      plannedQuantity: totalQuantity,
      producedQuantity: 0,
      outputType,
      notes: productionNotes,
      events: {
        create: {
          eventType: "CREATED",
          quantity: totalQuantity,
          reason: `Orden creada desde pedido interno ${commercialOrder.code}`,
          metadataJson: JSON.stringify({
            commercialOrderId: commercialOrder.id,
            commercialOrderCode: commercialOrder.code,
            itemCount: commercialOrder.items.length,
            productType: outputType,
            orderSource: "internal",
          }),
          createdById,
        },
      },
    },
  });
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const commercialOrders = await prisma.operationCommercialOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: commercialOrderInclude,
    });
    const linkedProductionOrders = await prisma.operationProductionOrder.findMany({
      where: {
        notes: {
          contains: "[commercialOrderId:",
        },
      },
      select: {
        id: true,
        code: true,
        status: true,
        notes: true,
      },
    });
    const reservedUnitsByOrder = await prisma.operationFinishedGoodUnit.findMany({
      where: { reservedOrderId: { in: commercialOrders.map((order) => order.id) }, status: "reserved" },
      select: {
        id: true,
        reservedOrderId: true,
        internalLabel: true,
      },
    });

    const reservedCountMap = reservedUnitsByOrder.reduce<Record<string, number>>((acc, unit) => {
      if (!unit.reservedOrderId) return acc;
      acc[unit.reservedOrderId] = (acc[unit.reservedOrderId] || 0) + 1;
      return acc;
    }, {});
    const productionOrderByCommercialOrderId = linkedProductionOrders.reduce<Record<string, { id: string; code: string; status: string; notes: string | null }>>(
      (acc, productionOrder) => {
        const match = productionOrder.notes?.match(productionNotesMarkerPattern);
        const commercialOrderId = match?.[1];
        if (!commercialOrderId || acc[commercialOrderId]) return acc;
        acc[commercialOrderId] = productionOrder;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      commercialOrders: commercialOrders.map((order) => ({
        ...order,
        reservedUnitsCount: reservedCountMap[order.id] || 0,
        productionOrder: productionOrderByCommercialOrderId[order.id] || null,
      })),
    });
  } catch (error) {
    console.error("[operations/commercial-orders] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar pedidos comerciales" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateCommercialOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;
  const isInternal = (data.customerType || "customer") === "internal";

  try {
    const commercialOrder = await (async () => {
      const maxAttempts = isInternal ? 5 : 1;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await prisma.$transaction(async (tx) => {
            const customerType = data.customerType || "customer";
            const code = data.code?.trim() || (isInternal ? await generateSequentialCode({ tx, model: "commercialOrder", prefix: "INT" }) : null);
            if (!code) {
              throw new Error("COMMERCIAL_ORDER_CODE_REQUIRED");
            }
            const items = isInternal
              ? [{
                  finishedGoodId: data.items[0]?.finishedGoodId || null,
                  productCode: data.items[0]?.productCode || null,
                  productName: data.items[0]?.productName || "Producto interno",
                  quantity: data.items[0]?.quantity || 1,
                  unitPrice: 0,
                  unit: "unit",
                  notes: data.items[0]?.notes || null,
                }]
              : data.items;
            const totalAmount = calculateCommercialOrderTotal(items);
            const finishedGoodIds = [
              ...new Set(items.map((item) => item.finishedGoodId).filter(Boolean)),
            ] as string[];

            if (finishedGoodIds.length > 0) {
              const finishedGoods = await tx.operationFinishedGood.findMany({
                where: { id: { in: finishedGoodIds } },
                select: { id: true },
              });

              if (finishedGoods.length !== finishedGoodIds.length) {
                throw new Error("INVALID_FINISHED_GOOD");
              }
            }

            if (data.dispatchId) {
              const dispatch = await tx.operationDispatch.findUnique({
                where: { id: data.dispatchId },
                select: { id: true },
              });

              if (!dispatch) {
                throw new Error("INVALID_DISPATCH");
              }
            }

            const createdOrder = await tx.operationCommercialOrder.create({
              data: {
                code,
                status: data.status || "draft",
                customerType,
                customerName: isInternal ? null : data.customerName || null,
                customerEmail: isInternal ? null : data.customerEmail || null,
                customerPhone: isInternal ? null : data.customerPhone || null,
                customerReference: isInternal ? data.customerReference || null : data.customerReference || null,
                salesChannel: isInternal ? "internal" : data.salesChannel || "admin",
                paymentStatus: isInternal ? "pending" : data.paymentStatus || "pending",
                fulfillmentStatus: data.fulfillmentStatus || "pending",
                totalAmount,
                currency: isInternal ? "USD" : data.currency || "USD",
                dispatchId: data.dispatchId || null,
                notes: data.notes || null,
                items: {
                  create: items.map((item) => ({
                    finishedGoodId: item.finishedGoodId || null,
                    productCode: item.productCode || null,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                    unit: item.unit || "unit",
                    notes: item.notes || null,
                  })),
                },
                events: {
                  create: {
                    eventType: "CREATED",
                    amount: totalAmount,
                    reason: isInternal ? (data.internalReason || "Pedido interno creado") : "Pedido comercial creado",
                    metadataJson: JSON.stringify({
                      itemCount: items.length,
                      salesChannel: isInternal ? "internal" : data.salesChannel || "admin",
                      customerType,
                      dispatchId: data.dispatchId || null,
                      internalReason: isInternal ? (data.internalReason || null) : null,
                    }),
                    createdById,
                  },
                },
              },
              include: commercialOrderInclude,
            });
            if (isInternal) {
              const productionOrder = await createInternalProductionOrder(tx, createdOrder, createdById);
              await tx.operationCommercialOrder.update({
                where: { id: createdOrder.id },
                data: {
                  status: "accepted",
                  fulfillmentStatus: "requested",
                },
              });
              return {
                ...createdOrder,
                status: "accepted",
                fulfillmentStatus: "requested",
                productionOrder,
              };
            }

            return createdOrder;
          });
        } catch (error) {
          lastError = error;
          if (
            isInternal &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            attempt < maxAttempts - 1
          ) {
            await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
            continue;
          }
          throw error;
        }
      }

      throw lastError ?? new Error("COMMERCIAL_ORDER_CODE_COLLISION");
    })();

    return NextResponse.json({ commercialOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "Uno o mas finishedGoodId no existen" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_DISPATCH") {
      return NextResponse.json(
        { error: "dispatchId no existe" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un pedido comercial con ese code" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "COMMERCIAL_ORDER_CODE_REQUIRED") {
      return NextResponse.json(
        { error: "El code es requerido para pedidos no internos" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith("CODE_COLLISION:")) {
      return NextResponse.json(
        { error: "No se pudo generar un código único. Intenta nuevamente." },
        { status: 409 }
      );
    }

    console.error("[operations/commercial-orders] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear pedido comercial" },
      { status: 500 }
    );
  }
}

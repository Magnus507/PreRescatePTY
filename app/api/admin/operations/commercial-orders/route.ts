import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateCommercialOrderSchema,
  calculateCommercialOrderTotal,
  getFirstValidationMessage,
} from "./commercial-orders.helpers";

export const dynamic = "force-dynamic";

async function generateCommercialOrderCode(
  tx: Prisma.TransactionClient,
  prefix: string
) {
  const existingCodes = await tx.operationCommercialOrder.findMany({
    where: {
      code: {
        startsWith: `${prefix}-`,
      },
    },
    select: { code: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxSequence = 0;
  for (const order of existingCodes) {
    const match = order.code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) continue;
    maxSequence = Math.max(maxSequence, Number.parseInt(match[1], 10) || 0);
  }

  return `${prefix}-${String(maxSequence + 1).padStart(4, "0")}`;
}

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

  try {
    const commercialOrder = await prisma.$transaction(async (tx) => {
      const customerType = data.customerType || "customer";
      const isInternal = customerType === "internal";
      const code = data.code?.trim() || (isInternal ? await generateCommercialOrderCode(tx, "INT") : null);
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

      return tx.operationCommercialOrder.create({
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
              reason: "Pedido comercial creado",
              metadataJson: JSON.stringify({
                itemCount: items.length,
                salesChannel: isInternal ? "internal" : data.salesChannel || "admin",
                customerType,
                dispatchId: data.dispatchId || null,
              }),
              createdById,
            },
          },
        },
        include: commercialOrderInclude,
      });
    });

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

    console.error("[operations/commercial-orders] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear pedido comercial" },
      { status: 500 }
    );
  }
}

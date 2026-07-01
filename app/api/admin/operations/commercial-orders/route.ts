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

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const commercialOrders = await prisma.operationCommercialOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: commercialOrderInclude,
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

    return NextResponse.json({
      commercialOrders: commercialOrders.map((order) => ({
        ...order,
        reservedUnitsCount: reservedCountMap[order.id] || 0,
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
  const totalAmount = calculateCommercialOrderTotal(data.items);
  const finishedGoodIds = [
    ...new Set(data.items.map((item) => item.finishedGoodId).filter(Boolean)),
  ] as string[];

  try {
    const commercialOrder = await prisma.$transaction(async (tx) => {
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
          code: data.code,
          status: data.status || "draft",
          customerType: data.customerType || "customer",
          customerName: data.customerName || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          customerReference: data.customerReference || null,
          salesChannel: data.salesChannel || "admin",
          paymentStatus: data.paymentStatus || "pending",
          fulfillmentStatus: data.fulfillmentStatus || "pending",
          totalAmount,
          currency: data.currency || "USD",
          dispatchId: data.dispatchId || null,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
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
                itemCount: data.items.length,
                salesChannel: data.salesChannel || "admin",
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

    console.error("[operations/commercial-orders] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear pedido comercial" },
      { status: 500 }
    );
  }
}

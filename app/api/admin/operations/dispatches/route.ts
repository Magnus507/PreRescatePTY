import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { buildDispatchViewModel } from "@/lib/operations/dispatch-view-model";
import { getDispatchCustomerOrderId } from "@/lib/operations/dispatch-source";
import {
  CreateDispatchSchema,
  getFirstValidationMessage,
} from "./dispatches.helpers";

export const dynamic = "force-dynamic";

const finishedGoodSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  status: true,
  unit: true,
} as const;

const dispatchInclude = {
  items: {
    include: {
      finishedGood: {
        select: finishedGoodSelect,
      },
      unitRecord: {
        select: {
          id: true,
          internalLabel: true,
          productCode: true,
          productName: true,
          status: true,
          qaStatus: true,
          activationStatus: true,
        },
      },
    },
  },
  events: {
    orderBy: { createdAt: "desc" },
  },
} as const;

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const dispatches = await prisma.operationDispatch.findMany({
      orderBy: { createdAt: "desc" },
      include: dispatchInclude,
    });

    const orderIds = Array.from(
      new Set(
        dispatches
          .map((dispatch) => getDispatchCustomerOrderId(dispatch.events))
          .filter((value): value is string => Boolean(value))
      )
    );
    const sourceOrders = orderIds.length > 0
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: {
            id: true,
            orderNumber: true,
            providerReference: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            shippingCity: true,
            shippingAddress: true,
            shippingNotes: true,
          },
        })
      : [];
    const sourceOrderById = new Map(sourceOrders.map((order) => [order.id, order]));

    return NextResponse.json({
      success: true,
      dispatches: dispatches.map((dispatch) => {
        const orderId = getDispatchCustomerOrderId(dispatch.events);
        return buildDispatchViewModel({
          ...dispatch,
          sourceOrder: orderId ? sourceOrderById.get(orderId) || null : null,
        });
      }),
    });
  } catch (error) {
    console.error("[operations/dispatches] GET error:", error);
    return NextResponse.json(
      { error: "Error al listar despachos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = CreateDispatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const destinationType = data.destinationType || "customer";

  if (destinationType === "customer") {
    return NextResponse.json(
      {
        error: "Los despachos a clientes se crean desde Pedidos después de reservar las unidades físicas.",
        code: "CUSTOMER_DISPATCH_REQUIRES_ORDER",
      },
      { status: 409 }
    );
  }

  const createdById = auth.session.user.id || null;
  const finishedGoodIds = [...new Set(data.items.map((item) => item.finishedGoodId))];

  try {
    const dispatch = await prisma.$transaction(async (tx) => {
      const finishedGoods = await tx.operationFinishedGood.findMany({
        where: { id: { in: finishedGoodIds } },
        select: { id: true },
      });

      if (finishedGoods.length !== finishedGoodIds.length) {
        throw new Error("INVALID_FINISHED_GOOD");
      }

      return tx.operationDispatch.create({
        data: {
          code: data.code,
          destinationType,
          destinationName: data.destinationName || null,
          destinationReference: data.destinationReference || null,
          destinationAddress: data.destinationAddress || null,
          scheduledAt: data.scheduledAt || null,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              finishedGoodId: item.finishedGoodId,
              quantity: item.quantity,
              unit: item.unit,
              notes: item.notes || null,
            })),
          },
          events: {
            create: {
              eventType: "CREATED",
              reason: "Traslado logístico creado",
              referenceType: "dispatch",
              metadataJson: JSON.stringify({
                destinationType,
                itemCount: data.items.length,
                traceabilityMode: "manual_non_customer",
              }),
              createdById,
            },
          },
        },
        include: dispatchInclude,
      });
    });

    return NextResponse.json({ dispatch }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "Uno o más productos terminados no existen" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un despacho con ese código" },
        { status: 409 }
      );
    }

    console.error("[operations/dispatches] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear despacho" },
      { status: 500 }
    );
  }
}

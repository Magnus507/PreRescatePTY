import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import {
  CreateCommercialOrderEventSchema,
  getFirstValidationMessage,
} from "../../commercial-orders.helpers";

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

function getDispatchDestinationType(customerType: string) {
  if (customerType === "enterprise") return "enterprise";
  if (customerType === "internal") return "internal";
  if (customerType === "point_of_sale") return "point_of_sale";
  if (customerType === "other") return "other";
  return "customer";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateCommercialOrderEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getFirstValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const createdById = auth.session.user.id || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const commercialOrder = await tx.operationCommercialOrder.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!commercialOrder) {
        return null;
      }

      if (commercialOrder.status === "cancelled" && data.eventType !== "REFUNDED") {
        throw new Error("CANCELLED_COMMERCIAL_ORDER");
      }

      if (commercialOrder.status === "rejected" && !["REFUNDED", "CANCELLED"].includes(data.eventType)) {
        throw new Error("REJECTED_COMMERCIAL_ORDER");
      }

      if (["CANCELLED", "REJECTED"].includes(data.eventType) && commercialOrder.dispatchId) {
        throw new Error("COMMERCIAL_ORDER_HAS_DISPATCH");
      }

      if (data.eventType === "FULFILLMENT_REQUESTED") {
        if (!["accepted", "confirmed"].includes(commercialOrder.status) && commercialOrder.paymentStatus !== "paid") {
          throw new Error("COMMERCIAL_ORDER_NOT_READY_FOR_FULFILLMENT");
        }

        if (commercialOrder.dispatchId) {
          throw new Error("COMMERCIAL_ORDER_HAS_DISPATCH");
        }

        if (commercialOrder.items.length === 0) {
          throw new Error("COMMERCIAL_ORDER_HAS_NO_ITEMS");
        }

        const itemsWithoutFinishedGood = commercialOrder.items.filter(
          (item) => !item.finishedGoodId
        );
        if (itemsWithoutFinishedGood.length > 0) {
          throw new Error("COMMERCIAL_ORDER_ITEMS_REQUIRE_FINISHED_GOOD");
        }

        const finishedGoodIds = [
          ...new Set(
            commercialOrder.items
              .map((item) => item.finishedGoodId)
              .filter((finishedGoodId): finishedGoodId is string => Boolean(finishedGoodId))
          ),
        ];
        const finishedGoods = await tx.operationFinishedGood.findMany({
          where: { id: { in: finishedGoodIds } },
          select: { id: true },
        });

        if (finishedGoods.length !== finishedGoodIds.length) {
          throw new Error("INVALID_FINISHED_GOOD");
        }
      }

      let dispatchId = commercialOrder.dispatchId;
      const reservedUnits = ["CANCELLED", "REJECTED"].includes(data.eventType)
        ? await tx.operationFinishedGoodUnit.findMany({
            where: { reservedOrderId: commercialOrder.id, status: "reserved" },
            select: { id: true, internalLabel: true },
          })
        : [];

      if (data.eventType === "FULFILLMENT_REQUESTED") {
        const dispatch = await tx.operationDispatch.create({
          data: {
            code: `DSP-${commercialOrder.code}`,
            status: "draft",
            destinationType: getDispatchDestinationType(commercialOrder.customerType),
            destinationName: commercialOrder.customerName || null,
            destinationReference: commercialOrder.code,
            notes: `Creado desde pedido comercial ${commercialOrder.code}`,
            items: {
              create: commercialOrder.items.map((item) => ({
                finishedGoodId: item.finishedGoodId as string,
                quantity: item.quantity,
                unit: item.unit,
                notes: item.notes || `Item comercial ${item.productName}`,
              })),
            },
            events: {
              create: {
                eventType: "CREATED",
                quantity: commercialOrder.items.reduce((sum, item) => sum + item.quantity, 0),
                reason: `Despacho creado desde pedido comercial ${commercialOrder.code}`,
                referenceType: "commercial_order",
                referenceId: commercialOrder.id,
                metadataJson: JSON.stringify({
                  commercialOrderCode: commercialOrder.code,
                  commercialOrderId: commercialOrder.id,
                  itemCount: commercialOrder.items.length,
                }),
                createdById,
              },
            },
          },
          select: {
            id: true,
          },
        });

        dispatchId = dispatch.id;
      }

      const event = await tx.operationCommercialOrderEvent.create({
        data: {
          commercialOrderId: id,
          eventType: data.eventType,
          amount: data.amount ?? null,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || dispatchId || null,
          metadataJson:
            data.metadataJson ||
            (data.eventType === "FULFILLMENT_REQUESTED" && dispatchId
              ? JSON.stringify({ dispatchId })
              : null),
          createdById,
        },
      });

      const updateData: {
        status?: string;
        paymentStatus?: string;
        fulfillmentStatus?: string;
        dispatchId?: string;
      } = {};

      if (data.eventType === "ACCEPTED" || data.eventType === "CONFIRMED") {
        updateData.status = "accepted";
      } else if (data.eventType === "REJECTED") {
        updateData.status = "rejected";
      } else if (data.eventType === "PAID") {
        updateData.paymentStatus = "paid";
      } else if (data.eventType === "PAYMENT_PENDING") {
        updateData.paymentStatus = "pending";
      } else if (data.eventType === "RESERVED") {
        updateData.fulfillmentStatus = "reserved";
      } else if (data.eventType === "FULFILLMENT_REQUESTED") {
        updateData.fulfillmentStatus = "requested";
        updateData.dispatchId = dispatchId || undefined;
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
      } else if (data.eventType === "REFUNDED") {
        updateData.paymentStatus = "refunded";
      }

      if (["CANCELLED", "REJECTED"].includes(data.eventType) && reservedUnits.length > 0) {
        await tx.operationFinishedGoodUnit.updateMany({
          where: { id: { in: reservedUnits.map((unit) => unit.id) } },
          data: {
            status: "available",
            reservedOrderId: null,
            reservedAt: null,
          },
        });

        await tx.operationFinishedGoodUnitEvent.createMany({
          data: reservedUnits.map((unit) => ({
            unitId: unit.id,
            eventType: "RELEASED",
            reason: `Liberada por ${data.eventType === "REJECTED" ? "rechazo" : "cancelación"} del pedido ${commercialOrder.code}`,
            referenceType: "commercial_order",
            referenceId: commercialOrder.id,
            metadataJson: JSON.stringify({
              commercialOrderId: commercialOrder.id,
              commercialOrderCode: commercialOrder.code,
              status: data.eventType.toLowerCase(),
            }),
          })),
        });
      }

      const updatedCommercialOrder =
        Object.keys(updateData).length > 0
          ? await tx.operationCommercialOrder.update({
              where: { id },
              data: updateData,
              include: commercialOrderInclude,
            })
          : await tx.operationCommercialOrder.findUnique({
              where: { id },
              include: commercialOrderInclude,
            });

      return {
        event,
        commercialOrder: updatedCommercialOrder,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Pedido comercial no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CANCELLED_COMMERCIAL_ORDER") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre pedidos comerciales cancelados salvo REFUNDED" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "REJECTED_COMMERCIAL_ORDER") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre pedidos comerciales rechazados salvo CANCELLED o REFUNDED" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "COMMERCIAL_ORDER_HAS_DISPATCH") {
      return NextResponse.json(
        { error: "El pedido comercial ya tiene un despacho vinculado" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "COMMERCIAL_ORDER_NOT_READY_FOR_FULFILLMENT") {
      return NextResponse.json(
        { error: "El pedido comercial debe estar confirmado o pagado para solicitar despacho" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "COMMERCIAL_ORDER_HAS_NO_ITEMS") {
      return NextResponse.json(
        { error: "El pedido comercial no tiene items para despachar" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "COMMERCIAL_ORDER_ITEMS_REQUIRE_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "Todos los items requieren finishedGoodId para solicitar despacho" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "Uno o mas finishedGoodId no existen" },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un despacho con el code generado para este pedido comercial" },
        { status: 409 }
      );
    }

    console.error("[operations/commercial-orders/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento comercial" },
      { status: 500 }
    );
  }
}

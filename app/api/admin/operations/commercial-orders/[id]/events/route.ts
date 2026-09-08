import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { releaseEligibleOrderReservations } from "@/lib/operations/release-order-reservations";
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
          dispatch: {
            select: { id: true, status: true },
          },
        },
      });

      if (!commercialOrder) return null;

      if (commercialOrder.status === "cancelled" && data.eventType !== "REFUNDED") {
        throw new Error("CANCELLED_COMMERCIAL_ORDER");
      }

      if (
        commercialOrder.status === "rejected" &&
        !["REFUNDED", "CANCELLED"].includes(data.eventType)
      ) {
        throw new Error("REJECTED_COMMERCIAL_ORDER");
      }

      const hasLiveDispatch = Boolean(
        commercialOrder.dispatch && commercialOrder.dispatch.status !== "cancelled"
      );

      if (["CANCELLED", "REJECTED"].includes(data.eventType) && hasLiveDispatch) {
        throw new Error("COMMERCIAL_ORDER_HAS_DISPATCH");
      }

      if (
        data.eventType === "REFUNDED" &&
        commercialOrder.dispatch &&
        !["cancelled", "dispatched", "sent", "shipped", "delivered"].includes(
          commercialOrder.dispatch.status
        )
      ) {
        throw new Error("ACTIVE_DISPATCH_MUST_BE_CANCELLED_FIRST");
      }

      if (data.eventType === "FULFILLMENT_REQUESTED") {
        if (commercialOrder.customerType === "internal") {
          throw new Error("INTERNAL_ORDER_NO_DISPATCH");
        }
        if (
          !["accepted", "confirmed"].includes(commercialOrder.status) &&
          commercialOrder.paymentStatus !== "paid"
        ) {
          throw new Error("COMMERCIAL_ORDER_NOT_READY_FOR_FULFILLMENT");
        }
        if (hasLiveDispatch) {
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

      const reservationOrderId = commercialOrder.sourceId || commercialOrder.id;
      const shouldReleaseReservations =
        ["CANCELLED", "REJECTED"].includes(data.eventType) ||
        (data.eventType === "REFUNDED" &&
          (!commercialOrder.dispatch || commercialOrder.dispatch.status === "cancelled"));

      let releaseResult = null;
      if (shouldReleaseReservations) {
        releaseResult = await releaseEligibleOrderReservations(tx, {
          orderId: reservationOrderId,
          actorId: createdById,
          reason: `${data.eventType} del pedido comercial ${commercialOrder.code}`,
        });
        if (releaseResult.blockedCount > 0) {
          throw new Error("RESERVATION_RELEASE_BLOCKED");
        }
      }

      const event = await tx.operationCommercialOrderEvent.create({
        data: {
          commercialOrderId: id,
          eventType: data.eventType,
          amount: data.amount ?? null,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          metadataJson:
            data.metadataJson ||
            (releaseResult
              ? JSON.stringify({
                  reservationOrderId,
                  releasedUnitCount: releaseResult.releasedCount,
                })
              : null),
          createdById,
        },
      });

      const updateData: {
        status?: string;
        paymentStatus?: string;
        fulfillmentStatus?: string;
      } = {};

      if (data.eventType === "ACCEPTED" || data.eventType === "CONFIRMED") {
        updateData.status = "accepted";
      } else if (data.eventType === "REJECTED") {
        updateData.status = "rejected";
        updateData.fulfillmentStatus = "pending";
      } else if (data.eventType === "PAID") {
        updateData.paymentStatus = "paid";
      } else if (data.eventType === "PAYMENT_PENDING") {
        updateData.paymentStatus = "pending";
      } else if (data.eventType === "RESERVED") {
        updateData.fulfillmentStatus = "reserved";
      } else if (data.eventType === "FULFILLMENT_REQUESTED") {
        // Requesting fulfillment no longer creates a dispatch. Physical customer
        // dispatches are created only after exact stock reservation by the
        // create-dispatch endpoint, otherwise they become unitless/stuck.
        updateData.fulfillmentStatus = "requested";
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
        updateData.fulfillmentStatus = "pending";
      } else if (data.eventType === "REFUNDED") {
        updateData.paymentStatus = "refunded";
        if (releaseResult) updateData.fulfillmentStatus = "pending";
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
        releasedUnitCount: releaseResult?.releasedCount || 0,
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
    const message = error instanceof Error ? error.message : "";

    if (message === "CANCELLED_COMMERCIAL_ORDER") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre pedidos comerciales cancelados salvo REFUNDED" },
        { status: 400 }
      );
    }
    if (message === "REJECTED_COMMERCIAL_ORDER") {
      return NextResponse.json(
        { error: "No se pueden registrar eventos sobre pedidos comerciales rechazados salvo CANCELLED o REFUNDED" },
        { status: 400 }
      );
    }
    if (message === "COMMERCIAL_ORDER_HAS_DISPATCH") {
      return NextResponse.json(
        { error: "Cancela primero el despacho vinculado al pedido comercial" },
        { status: 409 }
      );
    }
    if (message === "ACTIVE_DISPATCH_MUST_BE_CANCELLED_FIRST") {
      return NextResponse.json(
        { error: "Cancela primero el despacho no enviado antes de registrar el reembolso" },
        { status: 409 }
      );
    }
    if (message === "RESERVATION_RELEASE_BLOCKED") {
      return NextResponse.json(
        { error: "Hay unidades ya comprometidas o vinculadas a despacho; no se puede liberar la reserva" },
        { status: 409 }
      );
    }
    if (message === "INTERNAL_ORDER_NO_DISPATCH") {
      return NextResponse.json(
        { error: "Los pedidos internos terminan en inventario después de QA y no generan despacho de cliente" },
        { status: 400 }
      );
    }
    if (message === "COMMERCIAL_ORDER_NOT_READY_FOR_FULFILLMENT") {
      return NextResponse.json(
        { error: "El pedido comercial debe estar confirmado o pagado para solicitar fulfillment" },
        { status: 400 }
      );
    }
    if (message === "COMMERCIAL_ORDER_HAS_NO_ITEMS") {
      return NextResponse.json(
        { error: "El pedido comercial no tiene items para fulfillment" },
        { status: 400 }
      );
    }
    if (message === "COMMERCIAL_ORDER_ITEMS_REQUIRE_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "Todos los items requieren finishedGoodId para solicitar fulfillment" },
        { status: 400 }
      );
    }
    if (message === "INVALID_FINISHED_GOOD") {
      return NextResponse.json(
        { error: "Uno o más finishedGoodId no existen" },
        { status: 400 }
      );
    }

    console.error("[operations/commercial-orders/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento comercial" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
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
        select: {
          id: true,
          status: true,
          totalAmount: true,
        },
      });

      if (!commercialOrder) {
        return null;
      }

      if (commercialOrder.status === "cancelled" && data.eventType !== "REFUNDED") {
        throw new Error("CANCELLED_COMMERCIAL_ORDER");
      }

      const event = await tx.operationCommercialOrderEvent.create({
        data: {
          commercialOrderId: id,
          eventType: data.eventType,
          amount: data.amount ?? null,
          reason: data.reason || null,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          metadataJson: data.metadataJson || null,
          createdById,
        },
      });

      const updateData: {
        status?: string;
        paymentStatus?: string;
        fulfillmentStatus?: string;
      } = {};

      if (data.eventType === "CONFIRMED") {
        updateData.status = "confirmed";
      } else if (data.eventType === "PAID") {
        updateData.paymentStatus = "paid";
      } else if (data.eventType === "PAYMENT_PENDING") {
        updateData.paymentStatus = "pending";
      } else if (data.eventType === "RESERVED") {
        updateData.fulfillmentStatus = "reserved";
      } else if (data.eventType === "FULFILLMENT_REQUESTED") {
        updateData.fulfillmentStatus = "requested";
      } else if (data.eventType === "CANCELLED") {
        updateData.status = "cancelled";
      } else if (data.eventType === "REFUNDED") {
        updateData.paymentStatus = "refunded";
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

    console.error("[operations/commercial-orders/:id/events] POST error:", error);
    return NextResponse.json(
      { error: "Error al crear evento comercial" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getFirstValidationMessage } from "../../commercial-orders.helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateDispatchFromOrderSchema = z.object({
  code: z.string().trim().min(1).max(80),
  carrierName: z.string().trim().max(160).optional().nullable(),
  trackingReference: z.string().trim().max(160).optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id: commercialOrderId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = CreateDispatchFromOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: getFirstValidationMessage(parsed.error) }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.operationCommercialOrder.findUnique({
        where: { id: commercialOrderId },
        include: {
          items: true,
          dispatch: true,
        },
      });

      if (!order) {
        return null;
      }

      if (order.dispatch) {
        throw new Error("ORDER_ALREADY_HAS_DISPATCH");
      }

      const reservedUnits = await tx.operationFinishedGoodUnit.findMany({
        where: {
          reservedOrderId: commercialOrderId,
          status: "reserved",
        },
        orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
      });

      if (reservedUnits.length === 0) {
        throw new Error("NO_RESERVED_UNITS");
      }

      const dispatch = await tx.operationDispatch.create({
        data: {
          code: parsed.data.code,
          status: "pending_pick",
          destinationType: order.customerType || "customer",
          destinationName: order.customerName || null,
          destinationReference: order.customerReference || null,
          notes: parsed.data.notes || order.notes || null,
          carrierName: parsed.data.carrierName || null,
          trackingReference: parsed.data.trackingReference || null,
          scheduledAt: parsed.data.scheduledAt || null,
          items: {
            create: reservedUnits.map((unit) => ({
              unitId: unit.id,
              internalLabel: unit.internalLabel,
              productCode: unit.productCode,
              productName: unit.productName,
              quantity: 1,
              unit: "unit",
              status: "pending_pick",
              notes: `Despechado desde pedido ${order.code}`,
            })),
          },
          events: {
            create: {
              eventType: "CREATED",
              reason: "Despacho creado desde pedido reservado",
              metadataJson: JSON.stringify({
                commercialOrderId,
                reservedUnitIds: reservedUnits.map((unit) => unit.id),
              }),
              createdById: auth.session.user.id || null,
            },
          },
        },
        include: {
          items: true,
          events: true,
        },
      });

      await tx.operationCommercialOrder.update({
        where: { id: commercialOrderId },
        data: {
          dispatchId: dispatch.id,
          fulfillmentStatus: "reserved",
          status: order.status === "stock_reserved" ? "stock_reserved" : order.status,
        },
      });

      return {
        order,
        dispatch,
        reservedUnitIds: reservedUnits.map((unit) => unit.id),
      };
    });

    if (!result) {
      return NextResponse.json({ error: "Pedido comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ dispatch: result.dispatch, reservedUnitIds: result.reservedUnitIds }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_ALREADY_HAS_DISPATCH") {
      return NextResponse.json({ error: "El pedido ya tiene un despacho asociado" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "NO_RESERVED_UNITS") {
      return NextResponse.json({ error: "El pedido no tiene unidades reservadas" }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un despacho con ese code" }, { status: 409 });
    }

    console.error("[operations/commercial-orders/:id/create-dispatch] POST error:", error);
    return NextResponse.json({ error: "Error al crear despacho desde pedido" }, { status: 500 });
  }
}

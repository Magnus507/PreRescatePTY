import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin", "imprenta"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const corporateOrderItemId = String(body.corporateOrderItemId || "");
  const chipId = String(body.chipId || "");

  if (!corporateOrderItemId || !chipId) {
    return NextResponse.json({ error: "corporateOrderItemId y chipId son requeridos" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { corporateEmployeeItems: { include: { organizationMember: true } } },
  });

  if (!order || order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json({ error: "Orden corporativa no encontrada" }, { status: 404 });
  }

  const item = order.corporateEmployeeItems.find((x) => x.id === corporateOrderItemId);
  if (!item) {
    return NextResponse.json({ error: "Ítem corporativo no encontrado en la orden" }, { status: 404 });
  }
  const orgMember = await prisma.organizationMember.findUnique({
    where: { id: item.organizationMemberId },
    select: { corporateStatus: true },
  });
  if (!orgMember || orgMember.corporateStatus !== "paid_active") {
    return NextResponse.json({ error: "El empleado corporativo debe estar paid_active" }, { status: 400 });
  }
  if (item.fulfillmentStatus !== "pending_assignment") {
    return NextResponse.json({ error: "Este ítem ya no está pendiente de asignación" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await OrderFulfillmentService.reserveAssignedChipsForOrder(tx, {
        orderId: order.id,
        assignedChipIds: [chipId],
        purchasedChips: Math.max(1, order.corporateEmployeeItems.length),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      // Assign chip to ALL items of the same collaborator in this order
      const collaboratorItems = await tx.corporateOrderEmployeeItem.findMany({
        where: {
          orderId: order.id,
          organizationMemberId: item.organizationMemberId,
        },
      });

      await tx.corporateOrderEmployeeItem.updateMany({
        where: {
          orderId: order.id,
          organizationMemberId: item.organizationMemberId,
        },
        data: {
          chipId,
          fulfillmentStatus: "assigned_reserved",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No se pudo asignar chip" }, { status: error?.status || 500 });
  }
}

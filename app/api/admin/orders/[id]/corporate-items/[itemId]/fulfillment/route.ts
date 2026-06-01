import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = ["pending_assignment", "in_production", "ready_for_assignment", "delivered"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["admin", "superadmin", "imprenta"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: orderId, itemId } = await params;
  const { fulfillmentStatus } = await req.json();

  if (!ALLOWED_STATUSES.includes(fulfillmentStatus)) {
    return NextResponse.json(
      { error: `Estado no válido. Permitidos: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderType: true, paymentStatus: true, adminReviewStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json(
      { error: "Solo aplica a órdenes corporativas" },
      { status: 400 }
    );
  }

  // Guard: no permitir cambios operativos si el pago no está aprobado
  if (order.paymentStatus !== "paid" || order.adminReviewStatus !== "approved") {
    return NextResponse.json(
      { error: "Debes aprobar el pago corporativo antes de cambiar el estado operativo." },
      { status: 400 }
    );
  }

  const item = await prisma.corporateOrderEmployeeItem.findUnique({
    where: { id: itemId },
    select: { id: true, orderId: true, fulfillmentStatus: true, chipId: true },
  });

  if (!item || item.orderId !== orderId) {
    return NextResponse.json(
      { error: "Item no encontrado o no pertenece a esta orden" },
      { status: 404 }
    );
  }

  // No permitir regresar estados si ya está activated
  if (item.fulfillmentStatus === "activated") {
    return NextResponse.json(
      { error: "No se puede cambiar el estado de un chip ya activado" },
      { status: 400 }
    );
  }

  // Si está assigned_reserved, solo permitir delivered
  if (item.fulfillmentStatus === "assigned_reserved" && fulfillmentStatus !== "delivered") {
    return NextResponse.json(
      { error: "Un item con chip asignado solo puede marcarse como entregado" },
      { status: 400 }
    );
  }

  // No tocar chipId desde este endpoint
  const updated = await prisma.corporateOrderEmployeeItem.update({
    where: { id: itemId },
    data: { fulfillmentStatus },
  });

  await prisma.auditLog.create({
    data: {
      accountId: null,
      actorUserId: session.user.id,
      entityType: "CorporateOrderEmployeeItem",
      entityId: itemId,
      action: "fulfillment_status_changed",
      newValuesJson: JSON.stringify({ fulfillmentStatus }),
      oldValuesJson: JSON.stringify({ fulfillmentStatus: item.fulfillmentStatus }),
    },
  });

  return NextResponse.json({ item: updated, message: "Estado de fabricación actualizado" });
}
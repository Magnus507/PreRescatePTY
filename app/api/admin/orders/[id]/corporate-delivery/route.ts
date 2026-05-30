import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["preparation_pending", "ready_for_delivery", "in_transit", "delivered", "on_hold"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, orderType: true, organizationId: true, corporateDeliveryStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json({ error: "Esta funcionalidad solo aplica a pedidos corporativos" }, { status: 400 });
  }

  if (!order.organizationId) {
    return NextResponse.json({ error: "La orden no tiene organización asociada" }, { status: 400 });
  }

  // Validate the user belongs to this organization
  const organization = await prisma.organization.findFirst({
    where: { id: order.organizationId, accountId: session.user.accountId },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "No tienes acceso a este pedido" }, { status: 403 });
  }

  // Validate status
  const corporateDeliveryStatus = body.corporateDeliveryStatus ?? null;
  if (corporateDeliveryStatus !== null && corporateDeliveryStatus !== undefined && !VALID_STATUSES.includes(corporateDeliveryStatus)) {
    return NextResponse.json({ error: "Estado de entrega no válido" }, { status: 400 });
  }

  // Validate date
  let estimatedDeliveryDate: Date | null = null;
  if (body.estimatedDeliveryDate && typeof body.estimatedDeliveryDate === "string") {
    estimatedDeliveryDate = new Date(body.estimatedDeliveryDate);
    if (isNaN(estimatedDeliveryDate.getTime())) {
      return NextResponse.json({ error: "Fecha de entrega no válida" }, { status: 400 });
    }
  }

  // Validate note
  let deliveryNote: string | null = null;
  if (body.deliveryNote !== undefined && body.deliveryNote !== null) {
    if (typeof body.deliveryNote !== "string" || body.deliveryNote.length > 500) {
      return NextResponse.json({ error: "La nota de entrega no debe superar 500 caracteres" }, { status: 400 });
    }
    deliveryNote = body.deliveryNote;
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        corporateDeliveryStatus,
        estimatedDeliveryDate,
        deliveryNote,
      },
      select: {
        id: true,
        corporateDeliveryStatus: true,
        estimatedDeliveryDate: true,
        deliveryNote: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
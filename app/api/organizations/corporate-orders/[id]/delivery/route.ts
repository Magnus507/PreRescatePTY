import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveAccountSession } from "@/lib/rbac";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;

  const organization = await prisma.organization.findFirst({
    where: { accountId: auth.current.accountId },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, organizationId: true, orderType: true },
  });

  if (!order || order.organizationId !== organization.id) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json({ error: "Esta orden no es corporativa" }, { status: 400 });
  }

  const body = await req.json();
  const {
    corporateOrderEmployeeItemId,
    deliveryStatus,
    deliveryEvidenceUrl,
    deliveryNote,
  } = body as {
    corporateOrderEmployeeItemId: string;
    deliveryStatus?: string;
    deliveryEvidenceUrl?: string;
    deliveryNote?: string;
  };

  if (!corporateOrderEmployeeItemId) {
    return NextResponse.json({ error: "Falta corporateOrderEmployeeItemId" }, { status: 400 });
  }

  const targetStatus = deliveryStatus === "delivered" ? "delivered" : null;

  const updateData: Record<string, unknown> = {};
  if (targetStatus) {
    updateData.deliveryStatus = targetStatus;
    updateData.deliveredAt = new Date();
    updateData.deliveredByUserId = auth.session.user.id;
  }
  if (typeof deliveryEvidenceUrl === "string") {
    updateData.deliveryEvidenceUrl = deliveryEvidenceUrl;
  }
  if (typeof deliveryNote === "string") {
    updateData.deliveryNote = deliveryNote;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const item = await prisma.corporateOrderEmployeeItem.findFirst({
    where: {
      id: corporateOrderEmployeeItemId,
      orderId: order.id,
    },
    select: { id: true, deliveryStatus: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado en este pedido" }, { status: 404 });
  }

  const updated = await prisma.corporateOrderEmployeeItem.update({
    where: { id: item.id },
    data: updateData,
    select: {
      id: true,
      deliveryStatus: true,
      deliveredAt: true,
      deliveredByUserId: true,
      receivedByUserId: true,
      deliveryEvidenceUrl: true,
      deliveryNote: true,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

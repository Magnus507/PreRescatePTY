import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId || !session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organization = await prisma.organization.findFirst({
    where: { accountId: session.user.accountId },
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
    corporateOrderEmployeeItemIds,
    deliveryStatus,
    deliveryEvidenceUrl,
    deliveryNote,
  } = body as {
    corporateOrderEmployeeItemIds: string[];
    deliveryStatus?: string;
    deliveryEvidenceUrl?: string;
    deliveryNote?: string;
  };

  if (!Array.isArray(corporateOrderEmployeeItemIds) || corporateOrderEmployeeItemIds.length === 0) {
    return NextResponse.json({ error: "Falta corporateOrderEmployeeItemIds" }, { status: 400 });
  }

  const targetStatus = deliveryStatus === "delivered" ? "delivered" : null;

  const updateData: Record<string, unknown> = {};
  if (targetStatus) {
    updateData.deliveryStatus = targetStatus;
    updateData.deliveredAt = new Date();
    updateData.deliveredByUserId = session.user.id;
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

  const dbItems = await prisma.corporateOrderEmployeeItem.findMany({
    where: {
      id: { in: corporateOrderEmployeeItemIds },
      orderId: order.id,
    },
    select: { id: true },
  });

  if (dbItems.length !== corporateOrderEmployeeItemIds.length) {
    return NextResponse.json(
      { error: "Uno o más ítems no pertenecen a este pedido" },
      { status: 400 }
    );
  }

  const result = await prisma.corporateOrderEmployeeItem.updateMany({
    where: {
      id: { in: corporateOrderEmployeeItemIds },
      orderId: order.id,
    },
    data: updateData,
  });

  return NextResponse.json({ ok: true, updated: result.count });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId) {
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
    include: {
      corporateEmployeeItems: {
        select: { organizationMemberId: true, chipId: true, fulfillmentStatus: true },
      },
    },
  });

  if (!order || order.organizationId !== organization.id) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json({ error: "Esta orden no es corporativa" }, { status: 400 });
  }

  // Only cancelable if pending review
  const isCancelable =
    order.paymentStatus === "under_review" &&
    order.adminReviewStatus === "pending";

  if (!isCancelable) {
    return NextResponse.json(
      { error: "Esta orden ya no puede cancelarse. Solo se pueden cancelar órdenes pendientes de revisión." },
      { status: 400 }
    );
  }

  // Check for assigned chips or activated items
  const hasAssignedItems = order.corporateEmployeeItems.some(
    (item) =>
      item.chipId != null ||
      item.fulfillmentStatus === "assigned_reserved" ||
      item.fulfillmentStatus === "activated"
  );

  if (hasAssignedItems) {
    return NextResponse.json(
      { error: "No se puede cancelar: ya hay chips asignados o activados en esta orden." },
      { status: 400 }
    );
  }

  const memberIds = Array.from(
    new Set(order.corporateEmployeeItems.map((item) => item.organizationMemberId))
  );

  // Cancel order and revert members
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id, paymentStatus: "under_review", adminReviewStatus: "pending", orderStatus: { notIn: ["cancelled", "completed", "shipped"] } },
      data: {
        orderStatus: "cancelled",
        paymentStatus: "rejected",
        adminReviewStatus: "rejected",
      },
    });

    if (memberIds.length > 0) {
      await tx.organizationMember.updateMany({
        where: { id: { in: memberIds } },
        data: { corporateStatus: "approved_unpaid" },
      });
    }
  });

  return NextResponse.json({ ok: true, message: "Compra cancelada. Los empleados volvieron a Aprobados sin pagar." });
}
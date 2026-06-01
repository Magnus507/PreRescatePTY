import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin", "imprenta"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const adminId = session.user.id;
  const limiter = await rateLimit("admin-corporate-assign", adminId, { limit: 20, windowMs: 60_000 });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiadas asignaciones de chips. Intenta nuevamente en un momento." },
      { status: 429 }
    );
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

  // Guard: no permitir asignar chip si el pago no está aprobado
  if (order.paymentStatus !== "paid" || order.adminReviewStatus !== "approved") {
    return NextResponse.json(
      { error: "Debes aprobar el pago corporativo antes de asignar chips." },
      { status: 400 }
    );
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

  // Check if this collaborator already has a corporate chip assigned to the same corporate profile
  const orgMemberFull = await prisma.organizationMember.findUnique({
    where: { id: item.organizationMemberId },
    select: { corporateProfileId: true },
  });
  if (orgMemberFull?.corporateProfileId) {
    const existingCorporateChip = await prisma.corporateOrderEmployeeItem.findFirst({
      where: {
        organizationMemberId: item.organizationMemberId,
        chipId: { not: null },
        id: { not: item.id },
        chip: {
          assignedProfileId: orgMemberFull.corporateProfileId,
          status: { notIn: ["lost", "damaged"] },
        },
      },
      include: {
        chip: {
          select: {
            id: true,
            shortCode: true,
            assignedProfileId: true,
            status: true,
          },
        },
      },
    });
    if (existingCorporateChip?.chip) {
      return NextResponse.json(
        {
          error: "Este colaborador ya tiene un chip empresarial asignado. Los productos adicionales deben usar el mismo QR/link.",
          existingShortCode: existingCorporateChip.chip.shortCode,
        },
        { status: 400 }
      );
    }
  }

  // Validate that the chip is not already assigned to another active item in a different order or to a different member
  const existingAssignment = await prisma.corporateOrderEmployeeItem.findFirst({
    where: {
      chipId,
      orderId: { not: order.id },
      fulfillmentStatus: { notIn: ["pending_assignment", "delivered"] },
    },
    select: { id: true, orderId: true, organizationMemberId: true },
  });
  if (existingAssignment) {
    return NextResponse.json(
      { error: "Este chip ya está asignado a otro colaborador u otra orden." },
      { status: 409 }
    );
  }

  // Count unique collaborators in this order to determine purchasedChips per member
  const uniqueMemberIds = new Set(
    order.corporateEmployeeItems.map((i) => i.organizationMemberId)
  );
  // Use the count of unique members as purchasedChips baseline, but at least 1 per target member
  const purchasedChips = Math.max(1, uniqueMemberIds.size);

  try {
    await prisma.$transaction(async (tx) => {
      await OrderFulfillmentService.reserveAssignedChipsForOrder(tx, {
        orderId: order.id,
        assignedChipIds: [chipId],
        purchasedChips,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      // Assign chip to ALL items of the same collaborator in this order
      // (business decision: one chip per collaborator, shared across their items)
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

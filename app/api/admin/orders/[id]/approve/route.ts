import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";
import { canAdminApproveManual } from "@/lib/order-status";
import { z } from "zod";

const ApproveSchema = z.object({
  adminReviewNotes: z.string().optional(),
  assignedChipIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["admin", "superadmin", "imprenta"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const adminId = session.user.id;
  const { id } = await context.params;
  const body = await req.json();
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const notes = parsed.data.adminReviewNotes || null;
  const assignedChipIds = OrderFulfillmentService.normalizeAssignedChipIds(parsed.data.assignedChipIds);

  // Buscar orden pendiente de revisión
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, corporateEmployeeItems: { select: { organizationMemberId: true } } },
  });
  if (!order || order.provider !== "manual") {
    return NextResponse.json({ error: "Orden manual no encontrada" }, { status: 404 });
  }
  if (!canAdminApproveManual(order)) {
    return NextResponse.json({ error: "La orden manual no puede aprobarse en su estado actual" }, { status: 400 });
  }

  if (order.orderType === "corporate_employee_purchase") {
    const memberIds = Array.from(new Set(order.corporateEmployeeItems.map((item) => item.organizationMemberId)));

    await prisma.$transaction(async (tx) => {
      // Revalidate corporate order employees within transaction
      const corporateEmployeeItems = await tx.corporateOrderEmployeeItem.findMany({
        where: { orderId: id },
        include: {
          organizationMember: {
            include: { organization: true }
          }
        }
      });

      if (corporateEmployeeItems.length === 0) {
        throw new Error("No hay colaboradores vinculados a esta orden corporativa");
      }

      const validMembers = corporateEmployeeItems.filter(item => {
        const member = item.organizationMember;
        return member &&
               member.memberStatus === "active" &&
               member.corporateStatus === "approved_unpaid";
      });

      if (validMembers.length === 0) {
        throw new Error("No hay colaboradores válidos para aprobar (estado debe ser: active, approved_unpaid)");
      }

      await tx.order.update({
        where: { id },
        data: {
          paymentStatus: "paid",
          orderStatus: "completed",
          adminReviewStatus: "approved",
          adminReviewedAt: new Date(),
          adminReviewedById: adminId,
          adminReviewNotes: notes,
        },
      });

      if (memberIds.length > 0) {
        await tx.organizationMember.updateMany({
          where: { id: { in: memberIds } },
          data: { corporateStatus: "paid_active" },
        });
      }

      await tx.auditLog.create({
        data: {
          accountId: null,
          actorUserId: adminId,
          entityType: "Order",
          entityId: order.id,
          action: "corporate_order_approved",
          newValuesJson: null,
          oldValuesJson: null,
        },
      });
    });

    return NextResponse.json({ orderId: order.id });
  }

  // Buscar usuario y accountId
  const user = await prisma.user.findUnique({ where: { id: order.userId ?? undefined } });
  if (!user?.accountId) {
    return NextResponse.json({ error: "Usuario sin cuenta asociada" }, { status: 400 });
  }


  // Validar paquete por order.packageId
  if (!order.packageId) {
    return NextResponse.json({ error: "Orden sin packageId" }, { status: 400 });
  }
  const pkg = await prisma.package.findUnique({ where: { id: order.packageId } });
  if (!pkg || !pkg.isActive) {
    return NextResponse.json({ error: "Paquete no válido" }, { status: 400 });
  }

  const purchasedChips = OrderFulfillmentService.calculatePurchasedChips(order.items);
  const capacityIncrement = OrderFulfillmentService.calculateCapacityIncrement(order.items, pkg);
  const wasAlreadyApproved = OrderFulfillmentService.wasOrderAlreadyApproved(order);

  if (assignedChipIds.length > purchasedChips) {
    return NextResponse.json({ error: "No puedes asignar más chips que los incluidos en la orden." }, { status: 400 });
  }

  // Actualizar orden y cuenta en transacción
  let result: { updatedOrder: { id: string }; account: { id: string } };
  try {
    result = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: "paid",
          orderStatus: "completed",
          adminReviewStatus: "approved",
          adminReviewedAt: new Date(),
          adminReviewedById: adminId,
          adminReviewNotes: notes,
        }
      });

      // Actualizar cuenta
      const currentAccount = await tx.account.findUnique({
        where: { id: user.accountId! },
        select: { id: true, maxChipsAllocated: true, maxProfilesAllocated: true }
      });

      if (!currentAccount) {
        throw new Error("Cuenta no encontrada");
      }

      const accountUpdateData: {
        packageId: string;
        accountType: string;
        status: string;
        maxChipsAllocated?: number;
        maxProfilesAllocated?: number;
      } = {
        packageId: pkg.id,
        accountType: pkg.accountType,
        status: "active",
      };

      const nextCapacity = OrderFulfillmentService.applyCapacityIfFirstApproval(
        currentAccount,
        capacityIncrement,
        wasAlreadyApproved
      );

      accountUpdateData.maxChipsAllocated = nextCapacity.maxChipsAllocated;
      accountUpdateData.maxProfilesAllocated = nextCapacity.maxProfilesAllocated;

      const account = await tx.account.update({
        where: { id: user.accountId! },
        data: accountUpdateData
      });

      await OrderFulfillmentService.reserveAssignedChipsForOrder(tx, {
        orderId: id,
        assignedChipIds,
        purchasedChips,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      // Crear AuditLog SOLO con campos válidos
      await tx.auditLog.create({
        data: {
          accountId: account.id,
          actorUserId: adminId,
          entityType: "Order",
          entityId: order.id,
          action: "order_approved",
          newValuesJson: null,
          oldValuesJson: null,
        }
      });
      return { updatedOrder: { id: updatedOrder.id }, account: { id: account.id } };
    });
  } catch (error: unknown) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    const message = error instanceof Error ? error.message : "Error al aprobar orden";
    return NextResponse.json({ error: message }, { status });
  }

  // Invalidar caché de AccountStateService para el usuario afectado
  if (order.userId) {
    await AccountStateService.invalidateCache(order.userId);
  }

  return NextResponse.json({ orderId: result.updatedOrder.id });
}

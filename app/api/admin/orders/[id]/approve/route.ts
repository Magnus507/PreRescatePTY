import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";
import { reserveCommercialOrderStock } from "@/lib/operations/commercial-order-reservation";
import { canAdminApproveManual } from "@/lib/order-status";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const ApproveSchema = z.object({
  adminReviewNotes: z.string().optional(),
  assignedChipIds: z.array(z.string()).optional(),
});

function buildSourceMarker(sourceType: string, sourceId: string) {
  return `[sourceType:${sourceType}][sourceId:${sourceId}]`;
}

type AdminReviewedOrder = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  adminReviewStatus: string | null;
  adminReviewedAt: Date | null;
  adminReviewNotes: string | null;
  updatedAt: Date;
};

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["admin", "superadmin", "imprenta"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const adminId = session.user.id;
  const limitResult = await rateLimit("admin-approve", adminId, { limit: 20, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }
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
  if (order.adminReviewStatus === "approved" || order.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "Este pedido ya fue aprobado." },
      { status: 400 }
    );
  }

  if (order.adminReviewStatus === "rejected" || order.paymentStatus === "rejected") {
    return NextResponse.json(
      { error: "Este pedido ya fue rechazado y no puede aprobarse desde este flujo." },
      { status: 400 }
    );
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
               ["approved_unpaid", "paid_active"].includes(member.corporateStatus);
      });

      if (validMembers.length === 0) {
        throw new Error("No hay colaboradores válidos para aprobar (estado debe ser: active, approved_unpaid o paid_active)");
      }

      await tx.order.update({
        where: { id },
        data: {
          paymentStatus: "paid",
          orderStatus: "processing",
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

      // Mark linked product requests as paid_approved
      await tx.corporateProductRequest.updateMany({
        where: { orderId: id },
        data: { status: "paid_approved" },
      });

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

    return NextResponse.json({
      success: true,
      action: "approve",
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "processing",
      paymentStatus: "paid",
      message: "Pago aprobado correctamente.",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderStatus: "processing",
        paymentStatus: "paid",
        adminReviewStatus: "approved",
        adminReviewedAt: new Date().toISOString(),
        adminReviewNotes: notes,
      },
    });
  }

  // Buscar usuario y accountId
  const user = await prisma.user.findUnique({ where: { id: order.userId ?? undefined } });
  if (!user?.accountId) {
    return NextResponse.json({ error: "Usuario sin cuenta asociada" }, { status: 400 });
  }

  // Detectar órdenes de accesorios personalizados (sin packageId, con profileId/chipId en items)
  const isPersonalizedAccessoryOrder =
    !order.packageId &&
    order.items.length > 0 &&
    order.items.every((item) => item.profileId || item.chipId);

  if (isPersonalizedAccessoryOrder) {
    // Validar que todos los items tengan chipId
    const itemsWithoutChip = order.items.filter(item => !item.chipId);
    if (itemsWithoutChip.length > 0) {
      return NextResponse.json(
        { error: "No se puede aprobar un accesorio personalizado sin chip asociado." },
        { status: 400 }
      );
    }

    // Aprobar orden de accesorio personalizado sin picking ni capacity
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            paymentStatus: "paid",
            orderStatus: "processing",
            adminReviewStatus: "approved",
            adminReviewedAt: new Date(),
            adminReviewedById: adminId,
            adminReviewNotes: notes,
          },
        });

        await tx.auditLog.create({
          data: {
            accountId: user.accountId!,
            actorUserId: adminId,
            entityType: "Order",
            entityId: order.id,
            action: "accessory_order_approved",
            newValuesJson: null,
            oldValuesJson: null,
          },
        });
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al aprobar accesorio";
      logger.error("[Admin Approve] Accessory order error:", message);
      return NextResponse.json({ error: "No se pudo aprobar el accesorio" }, { status: 500 });
    }

    if (order.userId) {
      await AccountStateService.invalidateCache(order.userId);
    }

    return NextResponse.json({
      success: true,
      action: "approve",
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "processing",
      paymentStatus: "paid",
      message: "Pago aprobado correctamente.",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderStatus: "processing",
        paymentStatus: "paid",
        adminReviewStatus: "approved",
        adminReviewedAt: new Date().toISOString(),
        adminReviewNotes: notes,
      },
    });
  }

  // Validar paquete por order.packageId (solo para órdenes de paquete/chips)
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
  let result: { updatedOrder: AdminReviewedOrder; account: { id: string } };
  try {
    result = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: "paid",
          orderStatus: "processing",
          adminReviewStatus: "approved",
          adminReviewedAt: new Date(),
          adminReviewedById: adminId,
          adminReviewNotes: notes,
        }
      });

      const linkedCommercialOrder = await tx.operationCommercialOrder.findFirst({
        where: {
          notes: {
            contains: buildSourceMarker("legacy_order", order.id),
          },
        },
        select: { id: true },
      });

      if (linkedCommercialOrder) {
        await reserveCommercialOrderStock(tx, {
          orderId: linkedCommercialOrder.id,
          allowPartial: true,
        });
      }

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
      return { updatedOrder, account: { id: account.id } };
    });
  } catch (error: unknown) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    const message = error instanceof Error ? error.message : "Error al aprobar orden";
    logger.error("[Admin Approve] Order approval error:", message);
    return NextResponse.json({ error: "No se pudo aprobar la orden" }, { status });
  }

  // Invalidar caché de AccountStateService para el usuario afectado
  if (order.userId) {
    await AccountStateService.invalidateCache(order.userId);
  }

  return NextResponse.json({
    success: true,
    action: "approve",
    orderId: result.updatedOrder.id,
    orderNumber: result.updatedOrder.orderNumber,
    status: result.updatedOrder.orderStatus,
    paymentStatus: result.updatedOrder.paymentStatus,
    message: "Pago aprobado correctamente.",
    order: result.updatedOrder,
  });
}

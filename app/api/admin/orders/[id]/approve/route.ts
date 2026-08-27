import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";
import { reserveCommercialOrderStock } from "@/lib/operations/commercial-order-reservation";
import { ensureCustomerBackorderProduction } from "@/lib/operations/customer-order-production";
import { syncRealOrderToOperations } from "@/lib/operations/sync-real-order-to-operations";
import { canAdminApproveManual } from "@/lib/order-status";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { InvoiceService } from "@/domains/invoices/services/invoice.service";

const ApproveSchema = z.object({
  adminReviewNotes: z.string().optional(),
  assignedChipIds: z.array(z.string()).optional(),
});

function buildFulfillmentReviewNotes(
  baseNotes: string | null,
  reservation: Awaited<ReturnType<typeof reserveCommercialOrderStock>> | null
) {
  if (!reservation || reservation.summary.missingQty <= 0) {
    return baseNotes;
  }

  const summaryLines = [
    `Stock/backorder calculado automáticamente.`,
    `Tiene backorder: sí.`,
    `Producción estimada: 14 días.`,
    `customerMessage:Si tu pedido supera el stock disponible, producción estimada: 2 semanas.`,
    ...reservation.missingItems.map((item) =>
      `${item.productCode}: disponible=${item.reservedQty}, solicitada=${item.requestedQty}, backorder=${item.missingQty}, modo=production_backorder, estimado=14d`
    ),
  ];

  return [baseNotes?.trim() || null, ...summaryLines].filter(Boolean).join("\n");
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
      await InvoiceService.ensurePendingForPaidOrder(tx, { orderId: id });

      if (memberIds.length > 0) {
        await tx.organizationMember.updateMany({
          where: { id: { in: memberIds } },
          data: { corporateStatus: "paid_active" },
        });
      }

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

  const user = await prisma.user.findUnique({ where: { id: order.userId ?? undefined } });
  if (!user?.accountId) {
    return NextResponse.json({ error: "Usuario sin cuenta asociada" }, { status: 400 });
  }

  const isPersonalizedAccessoryOrder =
    !order.packageId &&
    order.items.length > 0 &&
    order.items.every((item) => item.profileId || item.chipId);

  let linkedCommercialOrder = await prisma.operationCommercialOrder.findFirst({
    where: {
      sourceId: order.id,
      sourceType: { in: ["checkout", "legacy_order"] },
    },
    select: { id: true },
  });

  // Checkout and Operations are eventually synchronized through the outbox, but
  // payment approval must not race that worker. If the operational order is not
  // present yet, create/update it idempotently from the immutable order snapshot.
  if (!linkedCommercialOrder && !isPersonalizedAccessoryOrder) {
    try {
      const sync = await syncRealOrderToOperations(prisma, {
        sourceType: "checkout",
        sourceId: order.id,
        sourceCode: order.orderNumber,
        orderType: "customer",
        customerName: order.customerName,
        contactEmail: order.customerEmail,
        contactPhone: order.customerPhone,
        customerReference: order.providerReference,
        paymentStatus: order.paymentStatus,
        paymentReference: order.manualPaymentReference || order.paymentProofUrl || null,
        currency: order.currency,
        totalAmount: order.amount,
        salesChannel: "checkout",
        notes: `orderId:${order.id}`,
        items: order.items.map((item) => ({
          productId: item.productId,
          productCode: item.productCode || item.operationalProductCode || item.productType,
          productName: item.productName || item.operationalProductName || item.productType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: "unit",
          finishedGoodId: item.operationalFinishedGoodId,
          operationalMappingId: item.operationalMappingId,
          operationalProductCode: item.operationalProductCode,
          operationalProductName: item.operationalProductName,
          operationalFinishedGoodId: item.operationalFinishedGoodId,
        })),
      });
      linkedCommercialOrder = { id: sync.order.id };
    } catch (error) {
      logger.error(
        "[Admin Approve] Could not ensure operational order:",
        error instanceof Error ? error.message : "unknown"
      );
      return NextResponse.json(
        { error: "No se pudo preparar el pedido para inventario/producción" },
        { status: 500 }
      );
    }
  }

  if (isPersonalizedAccessoryOrder) {
    const itemsWithoutChip = order.items.filter(item => !item.chipId);
    if (itemsWithoutChip.length > 0) {
      return NextResponse.json(
        { error: "No se puede aprobar un accesorio personalizado sin chip asociado." },
        { status: 400 }
      );
    }

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
        await InvoiceService.ensurePendingForPaidOrder(tx, { orderId: id });

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

  if (!order.packageId && linkedCommercialOrder) {
    try {
      const transactionResult = await prisma.$transaction(async (tx) => {
        const reservation = await reserveCommercialOrderStock(tx, {
          orderId: linkedCommercialOrder!.id,
          allowPartial: true,
        });
        const reviewNotes = buildFulfillmentReviewNotes(notes, reservation);

        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            paymentStatus: "paid",
            orderStatus: "processing",
            adminReviewStatus: "approved",
            adminReviewedAt: new Date(),
            adminReviewedById: adminId,
            adminReviewNotes: reviewNotes,
          },
        });
        await InvoiceService.ensurePendingForPaidOrder(tx, { orderId: id });

        if (reservation && reservation.summary.missingQty > 0) {
          const firstMissing = reservation.missingItems[0];
          const firstItem = order.items[0];
          await ensureCustomerBackorderProduction(tx, {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            backorderQty: reservation.summary.missingQty,
            outputType: firstMissing?.productCode || firstItem?.operationalProductCode || firstItem?.productCode || firstItem?.productType || "PRODUCT",
            productName: firstItem?.operationalProductName || firstItem?.productName || firstItem?.productType || "Producto",
            createdById: adminId,
          });
        }

        await tx.auditLog.create({
          data: {
            accountId: user.accountId!,
            actorUserId: adminId,
            entityType: "Order",
            entityId: order.id,
            action: "store_order_approved",
            newValuesJson: null,
            oldValuesJson: null,
          },
        });

        return { updatedOrder, reservation };
      });

      if (order.userId) {
        await AccountStateService.invalidateCache(order.userId);
      }

      return NextResponse.json({
        success: true,
        action: "approve",
        orderId: transactionResult.updatedOrder.id,
        orderNumber: transactionResult.updatedOrder.orderNumber,
        status: transactionResult.updatedOrder.orderStatus,
        paymentStatus: transactionResult.updatedOrder.paymentStatus,
        fulfillmentStatus: transactionResult.reservation?.summary.status || null,
        productionRequired: Boolean(transactionResult.reservation?.summary.missingQty),
        message: transactionResult.reservation?.summary.missingQty
          ? "Pago aprobado. Stock disponible reservado y faltante enviado a producción."
          : "Pago aprobado. Stock físico reservado correctamente.",
        order: transactionResult.updatedOrder,
      });
    } catch (error: unknown) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status) || 500
        : 500;
      const message = error instanceof Error ? error.message : "Error al aprobar orden";
      logger.error("[Admin Approve] Store order approval error:", message);
      return NextResponse.json({ error: "No se pudo aprobar la orden" }, { status });
    }
  }

  if (!order.packageId) {
    return NextResponse.json({ error: "Orden sin configuración operativa" }, { status: 400 });
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

  let result: {
    updatedOrder: AdminReviewedOrder;
    account: { id: string };
    reservation: Awaited<ReturnType<typeof reserveCommercialOrderStock>> | null;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const reservation = linkedCommercialOrder
        ? await reserveCommercialOrderStock(tx, {
            orderId: linkedCommercialOrder.id,
            allowPartial: true,
          })
        : null;

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: "paid",
          orderStatus: "processing",
          adminReviewStatus: "approved",
          adminReviewedAt: new Date(),
          adminReviewedById: adminId,
          adminReviewNotes: buildFulfillmentReviewNotes(notes, reservation),
        }
      });
      await InvoiceService.ensurePendingForPaidOrder(tx, { orderId: id });

      if (reservation && reservation.summary.missingQty > 0) {
        const firstMissing = reservation.missingItems[0];
        const firstItem = order.items[0];
        await ensureCustomerBackorderProduction(tx, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          backorderQty: reservation.summary.missingQty,
          outputType: firstMissing?.productCode || firstItem?.operationalProductCode || firstItem?.productCode || firstItem?.productType || "PRODUCT",
          productName: firstItem?.operationalProductName || firstItem?.productName || firstItem?.productType || "Producto",
          createdById: adminId,
        });
      }

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
      return { updatedOrder, account: { id: account.id }, reservation };
    });
  } catch (error: unknown) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    const message = error instanceof Error ? error.message : "Error al aprobar orden";
    logger.error("[Admin Approve] Order approval error:", message);
    return NextResponse.json({ error: "No se pudo aprobar la orden" }, { status });
  }

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
    fulfillmentStatus: result.reservation?.summary.status || null,
    productionRequired: Boolean(result.reservation?.summary.missingQty),
    message: result.reservation?.summary.missingQty
      ? "Pago aprobado. Stock disponible reservado y faltante enviado a producción."
      : "Pago aprobado correctamente.",
    order: result.updatedOrder,
  });
}

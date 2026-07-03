import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/domains/shared/constants";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { OrderNotificationService } from "@/domains/notifications/services/order-notification.service";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";

function normalizeOrderPresentation(order: {
  id: string;
  orderNumber: string;
  provider: string;
  providerReference: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentProofUrl: string | null;
  manualPaymentReference: string | null;
  adminReviewStatus: string | null;
  adminReviewNotes: string | null;
  orderStatus: string;
  orderType: string;
  updatedAt: Date;
  items: Array<{ productType: string; quantity: number; totalPrice: number; unitPrice: number }>;
}) {
  const displayOrderCode = order.providerReference?.trim()?.startsWith("PR-")
    ? order.providerReference.trim()
    : order.orderNumber.startsWith("OP-")
      ? order.orderNumber.replace(/^OP-(CLI|EMP)-/, "")
      : order.orderNumber;
  const operationsOrderCode = order.orderNumber.startsWith("OP-")
    ? order.orderNumber
    : `OP-CLI-${displayOrderCode}`;
  const paymentProofAvailable = Boolean(order.paymentProofUrl || order.manualPaymentReference);
  const paymentStatusHuman =
    order.paymentStatus === "rejected"
      ? "Pago rechazado"
      : order.paymentStatus === "paid"
        ? "Pago aprobado"
        : paymentProofAvailable
          ? "Pago en revisión"
          : "Pago pendiente";

  const firstItem = order.items[0] || null;
  const commercialItemName = firstItem?.productType || null;
  const commercialQuantity = firstItem?.quantity || 0;
  const commercialTotal = firstItem?.totalPrice ?? 0;
  const operationalProductCode = commercialItemName?.toUpperCase().startsWith("COMBO_")
    ? "PRP-FG-STICKER"
    : commercialItemName?.toUpperCase().includes("STICKER")
      ? "PRP-FG-STICKER"
      : null;
  const operationalProductName = operationalProductCode === "PRP-FG-STICKER"
    ? "Sticker PreRescatePTY"
    : commercialItemName;
  const operationalQuantity = operationalProductCode ? commercialQuantity : commercialQuantity;

  return {
    displayOrderCode,
    operationsOrderCode,
    sourceType: order.provider,
    sourceId: order.id,
    paymentStatus: order.paymentStatus,
    paymentStatusHuman,
    paymentMethod: order.paymentMethod,
    paymentProofUrl: order.paymentProofUrl,
    paymentProofAvailable,
    paymentSubmittedAt: paymentProofAvailable ? order.updatedAt.toISOString() : null,
    paymentReference: order.manualPaymentReference || order.paymentProofUrl || null,
    paymentRejectionReason: order.adminReviewStatus === "rejected" ? order.adminReviewNotes : null,
    canApprovePayment: paymentProofAvailable && order.adminReviewStatus !== "approved" && order.adminReviewStatus !== "rejected",
    canRejectPayment: paymentProofAvailable && order.adminReviewStatus !== "approved" && order.adminReviewStatus !== "rejected",
    canArchiveOrder: order.orderStatus !== "cancelled",
    commercialItemName,
    commercialQuantity,
    commercialTotal,
    operationalProductCode,
    operationalProductName,
    operationalQuantity,
  };
}

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) return false;
  const role = session.user.role;
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUPERADMIN;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        organization: {
          select: { id: true, legalName: true, displayName: true, companyCode: true },
        },
        user: {
          select: {
            email: true,
            phone: true,
            profile: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        items: {
          include: {
            profile: {
              select: { id: true, firstName: true, lastName: true, displayNamePublic: true, profileType: true },
            },
            chip: {
              select: { id: true, shortCode: true, serialPublic: true, status: true },
            },
          },
        },
        corporateEmployeeItems: {
          include: {
            product: { select: { id: true, name: true, productType: true } },
            chip: { select: { id: true, shortCode: true, serialPublic: true, status: true } },
            organizationMember: {
              select: {
                id: true,
                employeeInternalId: true,
                corporateStatus: true,
                corporateProfileId: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        chipClaimTokens: {
          include: {
            chip: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const allMemberIds = new Set<string>();
    const allCorporateProfileIds = new Set<string>();
    for (const order of orders) {
      for (const item of order.corporateEmployeeItems || []) {
        if (item.organizationMember?.id) {
          allMemberIds.add(item.organizationMember.id);
        }
        if (item.organizationMember?.corporateProfileId) {
          allCorporateProfileIds.add(item.organizationMember.corporateProfileId);
        }
      }
    }

    const existingChipsByMember = new Map<string, { id: string; shortCode: string; serialPublic: string; status: string }>();
    if (allCorporateProfileIds.size > 0) {
      const existingChips = await prisma.corporateOrderEmployeeItem.findMany({
        where: {
          organizationMemberId: { in: Array.from(allMemberIds) },
          chipId: { not: null },
          chip: {
            assignedProfileId: { in: Array.from(allCorporateProfileIds) },
            status: { notIn: ["lost", "damaged"] },
          },
        },
        select: {
          organizationMemberId: true,
          chip: {
            select: {
              id: true,
              shortCode: true,
              serialPublic: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const item of existingChips) {
        if (item.chip && !existingChipsByMember.has(item.organizationMemberId)) {
          existingChipsByMember.set(item.organizationMemberId, item.chip);
        }
      }
    }

    const ordersWithExistingChips = orders.map((order) => ({
      ...order,
      corporateEmployeeItems: (order.corporateEmployeeItems || []).map((item) => ({
        ...item,
        existingCorporateChip: item.organizationMember?.id
          ? existingChipsByMember.get(item.organizationMember.id) || null
          : null,
      })),
    }));

    return NextResponse.json({
      orders: ordersWithExistingChips.map((order) => ({
        ...order,
        ...normalizeOrderPresentation(order as Parameters<typeof normalizeOrderPresentation>[0]),
      })),
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Error al cargar órdenes" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, orderStatus, paymentStatus, generateTokens, assignedChipIds } = await req.json();

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        items: true, 
        user: { include: { account: true, profile: true } } 
      }
    });

    if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

    if (order.provider === "manual") {
      return NextResponse.json(
        {
          error:
            "Órdenes manuales están protegidas en PATCH legacy. Usa /api/admin/orders/{id}/approve o /reject.",
        },
        { status: 400 }
      );
    }

    const purchasedChipLimit = OrderFulfillmentService.calculatePurchasedChips(order.items);
    const normalizedAssignedChipIds = OrderFulfillmentService.normalizeAssignedChipIds(
      Array.isArray(assignedChipIds) ? assignedChipIds : undefined
    );

    const requestedChipCount = normalizedAssignedChipIds.length > 0
      ? normalizedAssignedChipIds.length
      : (generateTokens ? purchasedChipLimit : 0);

    if (requestedChipCount > purchasedChipLimit) {
      return NextResponse.json(
        { error: `Este pedido solo permite ${purchasedChipLimit} chips.` },
        { status: 400 }
      );
    }

    // ── Fulfillment gating: validate state transitions ──────────────────────
    const isPaymentApproved = order.paymentStatus === "paid" || order.adminReviewStatus === "approved";
    const requestedOrderStatus = orderStatus || order.orderStatus;
    const isShippedTransition = requestedOrderStatus === "shipped" && order.orderStatus !== "shipped";
    const isCompletedTransition = requestedOrderStatus === "completed" && order.orderStatus !== "completed";

    if ((isShippedTransition || isCompletedTransition) && !isPaymentApproved) {
      return NextResponse.json(
        {
          error: "INVALID_ORDER_TRANSITION",
          message: "El pedido no puede cambiar a ese estado con el pago o estado actual.",
        },
        { status: 409 }
      );
    }

    if (isShippedTransition && order.orderStatus !== "processing") {
      return NextResponse.json(
        {
          error: "INVALID_ORDER_TRANSITION",
          message: "El pedido no puede cambiar a ese estado con el pago o estado actual.",
        },
        { status: 409 }
      );
    }

    if (isCompletedTransition && order.orderStatus !== "shipped") {
      return NextResponse.json(
        {
          error: "INVALID_ORDER_TRANSITION",
          message: "El pedido no puede cambiar a ese estado con el pago o estado actual.",
        },
        { status: 409 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: orderStatus || order.orderStatus,
        paymentStatus: paymentStatus || order.paymentStatus
      }
    });

    const isFulfilling = ["shipped", "completed"].includes(updatedOrder.orderStatus);

    if ((generateTokens || isFulfilling) && order.items.length > 0) {
      let totalChips = 0;
      let totalProfiles = 0;
      
      for (const item of order.items) {
        if (item.productType === "CHIP_EXTRA") {
           totalChips += item.quantity;
           totalProfiles += item.quantity;
        } else if (item.productType.startsWith("COMBO_") && order.providerReference) {
           const pkg = await prisma.package.findUnique({ where: { id: order.providerReference } });
           if (pkg) {
              totalChips += pkg.maxChips * item.quantity;
              totalProfiles += pkg.maxProfiles * item.quantity;
           }
        }
      }
      
      if (totalChips > 0 || totalProfiles > 0) {
        const existingTokens = await prisma.chipClaimToken.count({ where: { orderId: id } });
        const neededChips = totalChips - existingTokens;
        
        if (neededChips > 0) {
          if (normalizedAssignedChipIds.length > 0) {
            if (normalizedAssignedChipIds.length > purchasedChipLimit) {
              return NextResponse.json(
                { error: `Este pedido solo permite ${purchasedChipLimit} chips.` },
                { status: 400 }
              );
            }
            try {
              await prisma.$transaction(async (tx) => {
                await OrderFulfillmentService.reserveAssignedChipsForOrder(tx, {
                  orderId: id,
                  assignedChipIds: normalizedAssignedChipIds,
                  purchasedChips: purchasedChipLimit,
                  tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10), // 10 años para chips físicos
                });
              });
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Error al actualizar orden";
              return NextResponse.json({ error: message }, { status: 500 });
            }
          } else {
            for (let i = 0; i < neededChips; i++) {
               const chip = await prisma.chip.create({
                  data: {
                     serialPublic: `PR-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
                     shortCode: Math.random().toString(36).substring(2, 7).toUpperCase(),
                     nfcUrl: "https://www.prerescatepty.com/e/NEW",
                     qrUrl: "https://www.prerescatepty.com/e/NEW",
                     status: "inventory"
                  }
               });

               await prisma.chipClaimToken.create({
                  data: {
                     chipId: chip.id,
                     orderId: id,
                     activationCode: `ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                     expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  }
               });
            }
          }
        }

        if (existingTokens === 0 && order.user?.accountId && order.provider !== "manual") {
          await prisma.account.update({
            where: { id: order.user.accountId },
            data: {
              maxChipsAllocated: { increment: totalChips },
              maxProfilesAllocated: { increment: totalProfiles },
            },
          });
          if (order.user?.id) {
            await AccountStateService.invalidateCache(order.user.id);
          }
        }
      }
    }

    if (isFulfilling) {
      const orderTokens = await prisma.chipClaimToken.findMany({
        where: { orderId: id },
        select: { chipId: true }
      });
      const chipIdsToUpdate = orderTokens.map((t: { chipId: string }) => t.chipId);
      
      if (chipIdsToUpdate.length > 0) {
        await prisma.chip.updateMany({
          where: { 
            id: { in: chipIdsToUpdate },
            status: "inventory" 
          },
          data: { status: "sold" }
        });
      }
    }

    const newStatus = orderStatus || updatedOrder.orderStatus;
    const oldStatus = order.orderStatus;

    if (newStatus === "completed" && oldStatus !== "completed") {
       await OrderNotificationService.notifyPaymentValidated({
         ...updatedOrder,
         customerEmail: updatedOrder.customerEmail || order.customerEmail || order.user?.email,
         customerName: updatedOrder.customerName || order.customerName || `${order.user?.profile?.firstName || ""} ${order.user?.profile?.lastName || ""}`.trim(),
         items: order.items
       });
    } else if (newStatus === "shipped" && oldStatus !== "shipped") {
       await OrderNotificationService.notifyOrderShipped({
         ...updatedOrder,
         customerEmail: updatedOrder.customerEmail || order.customerEmail || order.user?.email,
         customerName: updatedOrder.customerName || order.customerName || `${order.user?.profile?.firstName || ""} ${order.user?.profile?.lastName || ""}`.trim()
       });
    }

    return NextResponse.json({ order: updatedOrder, message: "Estado de orden actualizado" });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Error al actualizar orden" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const bulk = searchParams.get('bulk');

  if (bulk === 'cancelled') {
    return NextResponse.json(
      {
        error:
          "Eliminación masiva deshabilitada por trazabilidad. Usa eliminación individual controlada.",
      },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json({ error: "Falta ID de la orden" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.orderStatus !== "cancelled") {
      return NextResponse.json({ error: "Solo puedes eliminar ordenes canceladas" }, { status: 400 });
    }

    if (order.provider === "manual") {
      return NextResponse.json(
        { error: "Órdenes manuales canceladas no se eliminan por trazabilidad." },
        { status: 400 }
      );
    }

    const relatedTokensCount = await prisma.chipClaimToken.count({ where: { orderId: id } });
    if (relatedTokensCount > 0) {
      return NextResponse.json(
        {
          error:
            "La orden tiene tokens/chips vinculados y no puede eliminarse para preservar trazabilidad.",
        },
        { status: 400 }
      );
    }

    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ message: "Orden eliminada exitosamente" });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Error al eliminar orden" }, { status: 500 });
  }
}

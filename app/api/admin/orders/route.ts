import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/domains/shared/constants";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { OrderNotificationService } from "@/domains/notifications/services/order-notification.service";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";

// Check if the current session is an admin
async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) return false;
  const role = session.user.role;
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUPERADMIN;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            profile: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        items: true,
        chipClaimTokens: {
          include: {
            chip: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Error al cargar órdenes" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // C10A GUARDRAILS — Legacy partial orchestrator (no functional changes here)
  // - This PATCH remains operational for current admin/legacy flows.
  // - Canonical manual approval path is: /api/admin/orders/[id]/approve (and /reject).
  // - Chip reservation/token assignment must use OrderFulfillmentService helpers.
  // - Do NOT reintroduce capacity increments for manual orders in this route.
  // - Future target: keep PATCH as thin router/orchestrator and move domain logic to services.
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // MANUAL FLOW P0 HARDENING
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

    // C6C HARDENING: manual orders are fully protected in legacy PATCH.
    // Any approval/rejection/state/payment/manual-fulfillment must go through
    // canonical endpoints: /api/admin/orders/[id]/approve and /reject.
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

    // C10A: Estado/Pago (legacy partial branch)
    // Keep minimal direct updates here until transition helper is extracted (C10B).
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: orderStatus || order.orderStatus,
        paymentStatus: paymentStatus || order.paymentStatus
      }
    });

    const isFulfilling = ["shipped", "completed"].includes(updatedOrder.orderStatus);

    // C10A: generateTokens / fulfillment orchestration (legacy partial branch)
    // Do not duplicate reservation/token logic outside OrderFulfillmentService.
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
          // C10A: assignedChipIds path
          // Canonical reservation path must stay in OrderFulfillmentService.reserveAssignedChipsForOrder().
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
                  tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                });
              });
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Error al actualizar orden";
              const status =
                typeof error === "object" && error !== null && "status" in error
                  ? Number((error as { status?: unknown }).status) || 500
                  : 500;
              return NextResponse.json({ error: message }, { status });
            }
          } else {
            // C10A: auto token/chip generation fallback (legacy behavior)
            // Pending extraction to OrderFulfillmentService in C10D.
            // Auto generation (fallback)
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

        // C10A: Capacity branch intentionally restricted to non-manual providers.
        // Manual capacity adjustments belong to canonical /approve flow and must not be duplicated here.
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
      // Transition linked chips from 'inventory' to 'sold'
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

    // C10A: Notifications + cache invalidation are side-effects.
    // Future target (C10E): invoke through explicit orchestration/event helpers.
    // Trigger Notifications based on status change
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
    // C6C HARDENING: disable bulk destructive deletion to preserve audit traceability.
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

    // Cascade delete is usually configured in Prisma schema, but let's delete items first to be safe
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ message: "Orden eliminada exitosamente" });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Error al eliminar orden" }, { status: 500 });
  }
}

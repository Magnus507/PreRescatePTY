import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/domains/shared/constants";
import { AccountStateService } from "@/domains/accounts/services/account-state.service";
import { OrderFulfillmentService } from "@/domains/orders/services/order-fulfillment.service";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";
import { buildCustomerProductionCode } from "@/lib/operations/customer-order-production";
import { getUniqueActivationCode } from "@/lib/identifiers";
import { protectActivationCode } from "@/domains/chips/activation-code.service";

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
      where: {},
      include: {
        organization: {
          select: { id: true, legalName: true, displayName: true, companyCode: true },
        },
        user: {
          select: {
            email: true,
            phone: true,
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
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
        // The operations list only needs token/chip identity. Never decrypt activation
        // secrets in a broad list endpoint.
        chipClaimTokens: {
          select: {
            id: true,
            chipId: true,
            chip: {
              select: {
                id: true,
                serialPublic: true,
                shortCode: true,
                internalLabel: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
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

    const existingChipsByMember = new Map<
      string,
      { id: string; shortCode: string; serialPublic: string; status: string }
    >();
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

    const reservedUnits = await prisma.operationFinishedGoodUnit.findMany({
      where: {
        reservedOrderId: { in: orders.map((order) => order.id) },
        status: "reserved",
      },
      select: {
        id: true,
        reservedOrderId: true,
        internalLabel: true,
        status: true,
        qaStatus: true,
        activationStatus: true,
      },
      orderBy: [{ createdAt: "asc" }, { internalLabel: "asc" }],
    });

    const dispatches = await prisma.operationDispatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
          select: {
            referenceType: true,
            referenceId: true,
            metadataJson: true,
          },
        },
      },
    });

    const dispatchByOrderId = new Map<string, { id: string; code: string; status: string }>();
    for (const dispatch of dispatches) {
      for (const event of dispatch.events) {
        const payload = (() => {
          if (!event.metadataJson) return null;
          try {
            return JSON.parse(event.metadataJson) as { orderId?: string; orderCode?: string };
          } catch {
            return null;
          }
        })();
        const orderId = payload?.orderId || (event.referenceType === "order" ? event.referenceId : null);
        if (orderId && !dispatchByOrderId.has(orderId)) {
          dispatchByOrderId.set(orderId, {
            id: dispatch.id,
            code: dispatch.code,
            status: dispatch.status,
          });
        }
      }
    }

    const productionCodes = orders.map((order) => buildCustomerProductionCode(order.orderNumber));
    const productionOrders = productionCodes.length > 0
      ? await prisma.operationProductionOrder.findMany({
          where: { code: { in: productionCodes } },
          select: { id: true, code: true, status: true },
        })
      : [];
    const productionByCode = new Map(
      productionOrders.map((productionOrder) => [productionOrder.code, productionOrder])
    );

    const reservedUnitsByOrderId = reservedUnits.reduce<Record<string, typeof reservedUnits>>((acc, unit) => {
      if (!unit.reservedOrderId) return acc;
      acc[unit.reservedOrderId] = acc[unit.reservedOrderId] || [];
      acc[unit.reservedOrderId].push(unit);
      return acc;
    }, {});

    return NextResponse.json({
      orders: ordersWithExistingChips.map((order) => {
        const reservedUnits = reservedUnitsByOrderId[order.id] || [];
        const dispatch = dispatchByOrderId.get(order.id) || null;
        const productionOrder =
          productionByCode.get(buildCustomerProductionCode(order.orderNumber)) || null;

        return {
          ...buildOperationsOrderViewModel({
            ...(order as unknown as Parameters<typeof buildOperationsOrderViewModel>[0]),
            customerName:
              order.customerName ||
              `${order.user?.profile?.firstName || ""} ${order.user?.profile?.lastName || ""}`.trim() ||
              order.user?.email ||
              "Sin cliente",
            customerEmail: order.customerEmail || order.user?.email || null,
            customerPhone: order.customerPhone || order.user?.phone || null,
            shippingAddress: order.shippingAddress || null,
            shippingCity: order.shippingCity || null,
            shippingNotes: order.shippingNotes || null,
            reservedUnits,
            dispatch,
            user: {
              email: order.user?.email || null,
              phone: order.user?.phone || null,
              profile: order.user?.profile
                ? {
                    firstName: order.user.profile.firstName || null,
                    lastName: order.user.profile.lastName || null,
                  }
                : null,
            },
          }),
          reservedUnits,
          dispatch,
          productionOrder,
          chipClaimTokens: order.chipClaimTokens.map((token) => ({
            id: token.id,
            chip: token.chip,
          })),
        };
      }),
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
        user: { include: { account: true, profile: true } },
      },
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

    const requestedOrderStatus = orderStatus || order.orderStatus;
    const requestsDispatchOwnedTransition =
      requestedOrderStatus !== order.orderStatus &&
      ["shipped", "completed"].includes(requestedOrderStatus);

    if (requestsDispatchOwnedTransition) {
      return NextResponse.json(
        {
          error: "DISPATCH_WORKFLOW_REQUIRED",
          message:
            "Los estados enviado y entregado se actualizan únicamente desde Centro de Operaciones > Despachos.",
        },
        { status: 409 }
      );
    }

    const purchasedChipLimit = OrderFulfillmentService.calculatePurchasedChips(order.items);
    const normalizedAssignedChipIds = OrderFulfillmentService.normalizeAssignedChipIds(
      Array.isArray(assignedChipIds) ? assignedChipIds : undefined
    );

    const requestedChipCount = normalizedAssignedChipIds.length > 0
      ? normalizedAssignedChipIds.length
      : generateTokens
        ? purchasedChipLimit
        : 0;

    if (requestedChipCount > purchasedChipLimit) {
      return NextResponse.json(
        { error: `Este pedido solo permite ${purchasedChipLimit} chips.` },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: orderStatus || order.orderStatus,
        paymentStatus: paymentStatus || order.paymentStatus,
      },
    });

    // Legacy token generation remains supported for historical non-manual orders,
    // but physical shipping/delivery is owned exclusively by OperationDispatch.
    if (generateTokens && order.items.length > 0) {
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
                  tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10),
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
                  status: "inventory",
                },
              });

              const activationCode = await getUniqueActivationCode();
              await prisma.chipClaimToken.create({
                data: {
                  chipId: chip.id,
                  orderId: id,
                  ...protectActivationCode(activationCode),
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
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
  const id = searchParams.get("id");
  const bulk = searchParams.get("bulk");

  if (bulk === "cancelled") {
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

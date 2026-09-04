import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_REVIEW_ROLES, requireRole } from "@/lib/rbac";
import { buildOperationsOrderViewModel } from "@/lib/operations/operations-order-view-model";
import { buildCustomerProductionCode } from "@/lib/operations/customer-order-production";

export async function GET() {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;

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

export async function PATCH() {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    {
      error: "LEGACY_ORDER_MUTATION_RETIRED",
      message: "Usa las rutas dedicadas de aprobar, rechazar, despacho o eliminación controlada.",
    },
    { status: 410 }
  );
}

export async function DELETE() {
  const auth = await requireRole(ORDER_REVIEW_ROLES);
  if (!auth.authorized) return auth.response;

  return NextResponse.json(
    {
      error: "LEGACY_ORDER_MUTATION_RETIRED",
      message: "Usa la ruta dedicada de eliminación controlada para conservar trazabilidad.",
    },
    { status: 410 }
  );
}

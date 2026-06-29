import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["admin", "superadmin", "imprenta"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Buscar pedidos corporativos aprobados, pagados, y pendientes de producción
  const orders = await prisma.order.findMany({
    where: {
      orderType: "corporate_employee_purchase",
      paymentStatus: "paid",
      adminReviewStatus: "approved",
      corporateDeliveryStatus: { not: "delivered" },
    },
    include: {
      organization: {
        select: {
          legalName: true,
          displayName: true,
        },
      },
      corporateEmployeeItems: {
        select: {
          id: true,
          fulfillmentStatus: true,
          quantity: true,
          chipId: true,
          product: {
            select: {
              productType: true,
            },
          },
          organizationMember: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const queue = orders.map((order) => {
    const items = order.corporateEmployeeItems || [];
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalCollaborators = new Set(items.map((i) => i.organizationMember.id)).size;

    const summaryByProductType: Record<string, number> = {};
    for (const item of items) {
      const type = item.product.productType || "otro";
      summaryByProductType[type] = (summaryByProductType[type] || 0) + item.quantity;
    }

    const allActivated = items.length > 0 && items.every((i) => i.fulfillmentStatus === "activated");
    const anyInProduction = items.some((i) => i.fulfillmentStatus === "in_production");
    const anyReady = items.some((i) => i.fulfillmentStatus === "ready_for_assignment");
    const anyDelivered = items.some((i) => i.fulfillmentStatus === "delivered");
    const chipsNfc = (summaryByProductType.initial_chip || 0) + (summaryByProductType.sticker_nfc_qr || 0);

    let productionStatus: "pending" | "in_production" | "packing" | "done" = "pending";
    if (allActivated) productionStatus = "done";
    else if (anyDelivered) productionStatus = "packing";
    else if (anyReady) productionStatus = "packing";
    else if (anyInProduction) productionStatus = "in_production";

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      companyName: order.organization?.displayName || order.organization?.legalName || "—",
      totalItems,
      totalCollaborators,
      summaryByProductType,
      chipsNfc,
      productionStatus,
      createdAt: order.createdAt,
    };
  });

  const counts = {
    pending: queue.filter((o) => o.productionStatus === "pending").length,
    inProduction: queue.filter((o) => o.productionStatus === "in_production").length,
    packing: queue.filter((o) => o.productionStatus === "packing").length,
    done: queue.filter((o) => o.productionStatus === "done").length,
  };

  return NextResponse.json({ queue, counts });
}
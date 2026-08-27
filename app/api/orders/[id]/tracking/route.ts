import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCustomerProductionCode } from "@/lib/operations/customer-order-production";
import { parseCustomerFulfillmentSummaryFromInternalNote } from "@/lib/orders/store-order-fulfillment";

export const dynamic = "force-dynamic";

type TrackingStepState = "done" | "current" | "upcoming" | "blocked";

function normalizeDispatchStage(status?: string | null) {
  const value = (status || "").toLowerCase();
  if (value === "delivered") return "delivered" as const;
  if (["sent", "shipped", "dispatched"].includes(value)) return "shipped" as const;
  if (["prepared", "picked", "packed"].includes(value)) return "prepared" as const;
  if (["pending_pick", "pending_preparation", "reserved", "released", "draft"].includes(value)) return "preparing" as const;
  return null;
}

function isProductionActive(status?: string | null) {
  return Boolean(status) && !["completed", "cancelled", "failed"].includes(String(status).toLowerCase());
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const order = await prisma.order.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        adminReviewStatus: true,
        adminReviewNotes: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const [commercialOrder, productionOrder, physicalUnits] = await Promise.all([
      prisma.operationCommercialOrder.findFirst({
        where: { sourceId: order.id },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          dispatch: {
            select: {
              id: true,
              code: true,
              status: true,
              carrierName: true,
              trackingReference: true,
              preparedAt: true,
              sentAt: true,
              deliveredAt: true,
            },
          },
        },
      }),
      prisma.operationProductionOrder.findFirst({
        where: { code: buildCustomerProductionCode(order.orderNumber) },
        select: {
          id: true,
          status: true,
          plannedQuantity: true,
          producedQuantity: true,
          updatedAt: true,
        },
      }),
      prisma.operationFinishedGoodUnit.findMany({
        where: { reservedOrderId: order.id },
        select: {
          status: true,
          qaStatus: true,
          activationStatus: true,
        },
      }),
    ]);

    const fulfillmentSummary = parseCustomerFulfillmentSummaryFromInternalNote(order.adminReviewNotes);
    const dispatch = commercialOrder?.dispatch || null;
    const dispatchStage = normalizeDispatchStage(dispatch?.status);
    const paymentApproved = order.paymentStatus === "paid" || order.adminReviewStatus === "approved";
    const paymentRejected = order.paymentStatus === "rejected" || order.adminReviewStatus === "rejected";
    const cancelled = order.orderStatus === "cancelled";
    const delivered = order.orderStatus === "completed" || dispatchStage === "delivered";
    const shipped = order.orderStatus === "shipped" || dispatchStage === "shipped";
    const prepared = dispatchStage === "prepared" || dispatchStage === "preparing";
    const productionActive = isProductionActive(productionOrder?.status);
    const productionRequired = Boolean(fulfillmentSummary?.hasBackorder || productionOrder);
    const reservedUnitCount = physicalUnits.filter((unit) => ["reserved", "dispatched", "delivered", "activated"].includes(unit.status)).length;
    const qaReadyUnitCount = physicalUnits.filter((unit) => unit.qaStatus === "passed").length;

    let stage:
      | "cancelled"
      | "payment_rejected"
      | "payment_pending"
      | "payment_review"
      | "production"
      | "stock_reserved"
      | "preparing"
      | "shipped"
      | "delivered" = "payment_pending";
    let label = "Pago pendiente";
    let message = "Completa el pago para que podamos procesar tu pedido.";

    if (cancelled) {
      stage = "cancelled";
      label = "Pedido cancelado";
      message = "Este pedido fue cancelado y ya no continúa en el flujo operativo.";
    } else if (paymentRejected) {
      stage = "payment_rejected";
      label = "Pago requiere corrección";
      message = "El comprobante fue rechazado. Revisa el motivo y vuelve a enviar la información solicitada.";
    } else if (!paymentApproved && order.paymentStatus === "under_review") {
      stage = "payment_review";
      label = "Pago en revisión";
      message = "Recibimos tu comprobante y está siendo validado.";
    } else if (!paymentApproved) {
      stage = "payment_pending";
      label = "Pago pendiente";
      message = "Completa el pago para que podamos procesar tu pedido.";
    } else if (delivered) {
      stage = "delivered";
      label = "Pedido entregado";
      message = "La entrega fue confirmada. Ya puedes continuar con la activación cuando corresponda.";
    } else if (shipped) {
      stage = "shipped";
      label = "Pedido enviado";
      message = "Tu pedido salió de nuestras manos y está en camino.";
    } else if (prepared) {
      stage = "preparing";
      label = dispatchStage === "prepared" ? "Pedido preparado" : "Preparando tu pedido";
      message = dispatchStage === "prepared"
        ? "Las unidades correctas fueron separadas y el pedido está listo para salir."
        : "Estamos separando y verificando las unidades físicas de tu pedido.";
    } else if (productionActive || (productionRequired && reservedUnitCount === 0)) {
      stage = "production";
      label = productionActive ? "Producto en producción" : "En cola de producción";
      message = fulfillmentSummary?.customerMessage || "Tu pedido requiere producción antes de pasar a preparación y despacho.";
    } else if (reservedUnitCount > 0 || commercialOrder?.fulfillmentStatus === "reserved") {
      stage = "stock_reserved";
      label = "Unidades reservadas";
      message = "Ya separamos inventario físico para tu pedido. El siguiente paso es preparar el despacho.";
    } else {
      stage = "stock_reserved";
      label = "Pago aprobado";
      message = "Tu pago fue aprobado. Estamos asignando stock o preparando la producción necesaria.";
    }

    const stepIds = ["payment", "fulfillment", "preparation", "shipping", "delivery"] as const;
    const currentIndex = (() => {
      if (["cancelled", "payment_rejected", "payment_pending", "payment_review"].includes(stage)) return 0;
      if (["production", "stock_reserved"].includes(stage)) return 1;
      if (stage === "preparing") return 2;
      if (stage === "shipped") return 3;
      return 4;
    })();

    const blocked = stage === "cancelled" || stage === "payment_rejected";
    const steps = stepIds.map((stepId, index) => {
      let state: TrackingStepState = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
      if (blocked && index === currentIndex) state = "blocked";
      return {
        id: stepId,
        label: {
          payment: "Pago",
          fulfillment: productionRequired ? "Stock / Producción" : "Stock",
          preparation: "Preparación",
          shipping: "Envío",
          delivery: "Entrega",
        }[stepId],
        state,
      };
    });

    return NextResponse.json({
      tracking: {
        stage,
        label,
        message,
        steps,
        payment: {
          status: order.paymentStatus,
          approved: paymentApproved,
          rejected: paymentRejected,
        },
        fulfillment: {
          productionRequired,
          productionStatus: productionOrder?.status || null,
          productionEstimateDays: fulfillmentSummary?.productionEstimateDays || null,
          reservedUnitCount,
          qaReadyUnitCount,
        },
        dispatch: dispatch
          ? {
              status: dispatch.status,
              carrierName: dispatch.carrierName,
              trackingReference: dispatch.trackingReference,
              preparedAt: dispatch.preparedAt,
              sentAt: dispatch.sentAt,
              deliveredAt: dispatch.deliveredAt,
            }
          : null,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("CUSTOMER_ORDER_TRACKING_ERROR", error);
    return NextResponse.json({ error: "No se pudo cargar el seguimiento del pedido" }, { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";

export function deriveCommercialHistoryStatus(input: {
  orderStatus: string;
  fulfillmentStatus: string;
  dispatchStatus?: string | null;
  deliveredAt?: Date | string | null;
}) {
  if (input.dispatchStatus === "delivered" || input.deliveredAt) return "delivered";
  if (input.dispatchStatus === "sent" || input.dispatchStatus === "in_transit") return "dispatched";
  if (["delivered", "completed", "closed"].includes(input.fulfillmentStatus)) return "delivered";
  if (["completed", "closed"].includes(input.orderStatus)) return "completed";
  return input.orderStatus;
}

export async function getCommercialOrderHistoryDetail(id: string) {
  const order = await prisma.operationCommercialOrder.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      sourceType: true,
      sourceId: true,
      status: true,
      customerType: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customerReference: true,
      salesChannel: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          productCode: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          unit: true,
          createdAt: true,
        },
      },
      dispatch: {
        select: {
          id: true,
          code: true,
          status: true,
          destinationType: true,
          destinationName: true,
          destinationReference: true,
          destinationAddress: true,
          carrierName: true,
          trackingReference: true,
          scheduledAt: true,
          sentAt: true,
          dispatchedAt: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              internalLabel: true,
              productCode: true,
              productName: true,
              quantity: true,
              unit: true,
              status: true,
              pickedAt: true,
              packedAt: true,
              dispatchedAt: true,
              deliveredAt: true,
              unitRecord: {
                select: {
                  id: true,
                  internalLabel: true,
                  productCode: true,
                  productName: true,
                  productType: true,
                  status: true,
                  qaStatus: true,
                  activationStatus: true,
                  reservedAt: true,
                  dispatchedAt: true,
                  deliveredAt: true,
                  activatedAt: true,
                  createdAt: true,
                  chip: {
                    select: {
                      serialPublic: true,
                      shortCode: true,
                      nfcUrl: true,
                      qrUrl: true,
                      status: true,
                      serviceStatus: true,
                      activatedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  const effectiveStatus = deriveCommercialHistoryStatus({
    orderStatus: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    dispatchStatus: order.dispatch?.status,
    deliveredAt: order.dispatch?.deliveredAt,
  });

  return {
    order: {
      id: order.id,
      code: order.code,
      sourceType: order.sourceType,
      sourceId: order.sourceId,
      status: order.status,
      effectiveStatus,
      customerType: order.customerType,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerReference: order.customerReference,
      salesChannel: order.salesChannel,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus:
        effectiveStatus === "delivered" ? "delivered" : order.fulfillmentStatus,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        createdAt: item.createdAt.toISOString(),
      })),
    },
    dispatch: order.dispatch
      ? {
          ...order.dispatch,
          scheduledAt: order.dispatch.scheduledAt?.toISOString() || null,
          sentAt: order.dispatch.sentAt?.toISOString() || null,
          dispatchedAt: order.dispatch.dispatchedAt?.toISOString() || null,
          deliveredAt: order.dispatch.deliveredAt?.toISOString() || null,
          createdAt: order.dispatch.createdAt.toISOString(),
          updatedAt: order.dispatch.updatedAt.toISOString(),
          items: order.dispatch.items.map((item) => ({
            ...item,
            pickedAt: item.pickedAt?.toISOString() || null,
            packedAt: item.packedAt?.toISOString() || null,
            dispatchedAt: item.dispatchedAt?.toISOString() || null,
            deliveredAt: item.deliveredAt?.toISOString() || null,
            unitRecord: item.unitRecord
              ? {
                  ...item.unitRecord,
                  reservedAt: item.unitRecord.reservedAt?.toISOString() || null,
                  dispatchedAt: item.unitRecord.dispatchedAt?.toISOString() || null,
                  deliveredAt: item.unitRecord.deliveredAt?.toISOString() || null,
                  activatedAt: item.unitRecord.activatedAt?.toISOString() || null,
                  createdAt: item.unitRecord.createdAt.toISOString(),
                  chip: item.unitRecord.chip
                    ? {
                        ...item.unitRecord.chip,
                        activatedAt: item.unitRecord.chip.activatedAt?.toISOString() || null,
                      }
                    : null,
                }
              : null,
          })),
        }
      : null,
  };
}

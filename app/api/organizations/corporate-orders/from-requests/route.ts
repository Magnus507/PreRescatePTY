import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import { enqueueCommerceOrderSyncOutbox } from "@/lib/operations/commerce-order-sync-outbox";
import { normalizePaymentProofUrl } from "@/lib/payment-proof";
import { rateLimit } from "@/lib/rateLimit";

type RequestSelection = {
  requestIds: string[];
  paymentProofUrl: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId || !session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;

  // Verify the user is an owner of this account (not just a member)
  if (session.user.role !== "owner") {
    return NextResponse.json(
      { error: "Solo el administrador de la cuenta puede crear órdenes corporativas." },
      { status: 403 }
    );
  }

  const limitResult = await rateLimit("corporate-order-create", userId, { limit: 10, windowMs: 60_000 });
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." },
      { status: 429 }
    );
  }

  // 1. Verify organization
  const organization = await prisma.organization.findFirst({
    where: { accountId: session.user.accountId },
    select: { id: true, status: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }
  if (organization.status !== "active") {
    return NextResponse.json({ error: "Organización inactiva" }, { status: 400 });
  }

  // 2. Parse body
  const body = await req.json();
  const { requestIds, paymentProofUrl } = body as RequestSelection;

  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una solicitud" }, { status: 400 });
  }

  if (!paymentProofUrl || typeof paymentProofUrl !== "string") {
    return NextResponse.json({ error: "Debes adjuntar un comprobante de pago" }, { status: 400 });
  }

  const normalizedProofUrl = normalizePaymentProofUrl(paymentProofUrl);
  if (!normalizedProofUrl) {
    return NextResponse.json({ error: "El comprobante de pago no es válido" }, { status: 400 });
  }

  // 3. Fetch all requests and validate
  const requests = await prisma.corporateProductRequest.findMany({
    where: { id: { in: requestIds } },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              operationalMapping: {
                select: {
                  id: true,
                  productCode: true,
                  finishedGoodId: true,
                  finishedGood: {
                    select: { id: true, code: true, name: true },
                  },
                },
              },
            },
          },
        },
      },
      organizationMember: {
        select: { id: true, corporateStatus: true },
      },
    },
  });

  if (requests.length !== requestIds.length) {
    return NextResponse.json({ error: "Una o más solicitudes no fueron encontradas" }, { status: 400 });
  }

  // Validate all requests belong to this organization
  for (const request of requests) {
    if (request.organizationId !== organization.id) {
      return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
    }
    if (request.status !== "approved_pending_payment") {
      return NextResponse.json({ error: "Solo se pueden incluir solicitudes aprobadas pendientes de pago" }, { status: 400 });
    }
    if (request.orderId) {
      return NextResponse.json({ error: "Una o más solicitudes ya están vinculadas a una orden" }, { status: 400 });
    }
  }

  // 4. Calculate total and prepare corporate items
  let totalAmount = 0;
  const corporateItems: Array<{
    organizationMemberId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }> = [];

  for (const request of requests) {
    for (const item of request.items) {
      const unitPrice = item.unitPrice;
      const quantity = item.quantity;
      const mapping = item.product.operationalMapping;
      if (!mapping?.productCode || !mapping?.finishedGoodId || !mapping?.finishedGood) {
        return NextResponse.json({ error: "Uno o más productos no tienen un mapping operativo válido" }, { status: 400 });
      }
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;

      corporateItems.push({
        organizationMemberId: request.organizationMemberId,
        productId: item.productId,
        quantity,
        unitPrice,
        subtotal,
      });
    }
  }

  // 5. Create Order + CorporateOrderEmployeeItems + update requests in transaction
  const orderNumber = await generateOrderNumber();
  const organizationDetails = await prisma.organization.findUnique({
    where: { id: organization.id },
    select: { legalName: true, displayName: true, contactEmail: true, contactPhone: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        userId,
        organizationId: organization.id,
        orderType: "corporate_employee_purchase",
        orderNumber,
        amount: totalAmount,
        provider: "manual",
        paymentMethod: "manual",
        orderStatus: "pending",
        paymentStatus: "under_review",
        adminReviewStatus: "pending",
        paymentProofUrl: normalizedProofUrl,
      },
    });

    // Create corporate order employee items
    await tx.corporateOrderEmployeeItem.createMany({
      data: corporateItems.map((item) => ({
        orderId: createdOrder.id,
        organizationMemberId: item.organizationMemberId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        fulfillmentStatus: "pending_assignment",
      })),
    });

    // Link requests to order and update status
    await tx.corporateProductRequest.updateMany({
      where: { id: { in: requestIds } },
      data: {
        orderId: createdOrder.id,
        status: "payment_under_review",
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        entityType: "Order",
        entityId: createdOrder.id,
        action: "corporate_order_created_from_requests",
        newValuesJson: JSON.stringify({
          requestIds,
          totalAmount,
          itemCount: corporateItems.length,
        }),
      },
    });

    const requestItemSnapshots = requests.flatMap((request) =>
      request.items.map((requestItem) => ({
        productId: requestItem.product.id,
        productCode: requestItem.product.operationalMapping?.productCode || null,
        productName: requestItem.product.operationalMapping?.finishedGood?.name || requestItem.product.name,
        quantity: requestItem.quantity,
        unitPrice: requestItem.unitPrice,
        unit: "unit",
        finishedGoodId: requestItem.product.operationalMapping?.finishedGoodId || null,
        operationalMappingId: requestItem.product.operationalMapping?.id || null,
        operationalMappingStatus:
          requestItem.product.operationalMapping?.id &&
          requestItem.product.operationalMapping?.finishedGoodId &&
          requestItem.product.operationalMapping?.productCode
            ? "mapped"
            : "unmapped",
        operationalProductCode: requestItem.product.operationalMapping?.productCode || null,
        operationalProductName: requestItem.product.operationalMapping?.finishedGood?.name || requestItem.product.name,
        operationalFinishedGoodId: requestItem.product.operationalMapping?.finishedGoodId || null,
      }))
    );

    await enqueueCommerceOrderSyncOutbox(tx, {
      sourceType: "organization_order",
      sourceId: createdOrder.id,
      sourceCode: createdOrder.orderNumber,
      orderType: "enterprise",
      companyName: organizationDetails?.displayName || organizationDetails?.legalName || null,
      contactName: organizationDetails?.displayName || organizationDetails?.legalName || null,
      contactEmail: organizationDetails?.contactEmail || null,
      contactPhone: organizationDetails?.contactPhone || null,
      customerReference: normalizedProofUrl || createdOrder.orderNumber,
      paymentStatus: createdOrder.paymentStatus,
      paymentReference: normalizedProofUrl,
      currency: createdOrder.currency,
      notes: "Sincronización pendiente hacia Operaciones",
      totalAmount: totalAmount,
      organizationId: organization.id,
      salesChannel: "organization",
      items: requestItemSnapshots,
    });

    return createdOrder;
  });

  return NextResponse.json(
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.amount,
      itemCount: corporateItems.length,
      requestCount: requests.length,
      operationsSyncStatus: "queued",
      operationsSyncWarning: null,
    },
    { status: 201 }
  );
}

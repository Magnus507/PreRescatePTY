import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import { enqueueCommerceOrderSyncOutbox } from "@/lib/operations/commerce-order-sync-outbox";
import { requireActiveAccountSession } from "@/lib/rbac";
import { addMoney, multiplyMoney, parseMoney, serializeMoney } from "@/lib/money";

type ProductSelection = {
  productId: string;
  quantity?: number;
};

type MemberSelection = {
  organizationMemberId: string;
  products: ProductSelection[];
};

export async function GET() {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;

  const organization = await prisma.organization.findFirst({
    where: { accountId: auth.current.accountId },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const orders = await prisma.order.findMany({
    where: {
      organizationId: organization.id,
      orderType: "corporate_employee_purchase",
    },
    orderBy: { createdAt: "desc" },
    include: {
      corporateEmployeeItems: {
        include: {
          product: { select: { id: true, name: true, price: true, productType: true } },
          chip: { select: { id: true, shortCode: true, serialPublic: true, status: true, activatedAt: true } },
          organizationMember: {
            select: {
              id: true,
              corporateStatus: true,
              employeeNationalId: true,
              employeePhone: true,
              employeePosition: true,
              employeeDepartment: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      ...order,
      amount: serializeMoney(order.amount),
      corporateEmployeeItems: order.corporateEmployeeItems.map((item) => ({
        ...item,
        unitPrice: serializeMoney(item.unitPrice),
        subtotal: serializeMoney(item.subtotal),
        product: {
          ...item.product,
          price: serializeMoney(item.product.price),
        },
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireActiveAccountSession();
  if (!auth.authorized) return auth.response;

  if (auth.current.role !== "owner") {
    return NextResponse.json(
      { error: "Solo el administrador de la cuenta puede crear órdenes corporativas." },
      { status: 403 }
    );
  }

  const organization = await prisma.organization.findFirst({
    where: { accountId: auth.current.accountId },
    select: { id: true, status: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }
  if (organization.status !== "active") {
    return NextResponse.json({ error: "Organización inactiva" }, { status: 400 });
  }

  const body = await req.json();
  const paymentProofUrl = typeof body.paymentProofUrl === "string" ? body.paymentProofUrl : null;
  const members = Array.isArray(body.members) ? (body.members as MemberSelection[]) : [];

  if (members.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un empleado" }, { status: 400 });
  }

  const memberIds = members.map((m) => m.organizationMemberId);
  const dbMembers = await prisma.organizationMember.findMany({
    where: { id: { in: memberIds }, organizationId: organization.id },
    select: { id: true, corporateStatus: true },
  });

  if (dbMembers.length !== memberIds.length) {
    return NextResponse.json({ error: "Hay empleados inválidos para esta organización" }, { status: 403 });
  }

  for (const member of dbMembers) {
    if (member.corporateStatus !== "approved_unpaid") {
      return NextResponse.json({ error: "Solo se permiten empleados aprobados sin pagar" }, { status: 400 });
    }
  }

  const allProductIds = Array.from(
    new Set(
      members.flatMap((m) => (Array.isArray(m.products) ? m.products : []).map((p) => p.productId))
    )
  );
  if (allProductIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un producto" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: allProductIds }, isActive: true },
    select: {
      id: true,
      price: true,
      name: true,
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
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  if (products.length !== allProductIds.length) {
    return NextResponse.json({ error: "Hay productos inactivos o inválidos" }, { status: 400 });
  }

  const existingPending = await prisma.corporateOrderEmployeeItem.findFirst({
    where: {
      organizationMemberId: { in: memberIds },
      order: {
        organizationId: organization.id,
        orderType: "corporate_employee_purchase",
        adminReviewStatus: "pending",
      },
    },
    select: { id: true },
  });
  if (existingPending) {
    return NextResponse.json({ error: "Uno o más empleados ya tienen una compra corporativa pendiente" }, { status: 409 });
  }

  const corporateItems: Array<{
    orderId: string;
    organizationMemberId: string;
    productId: string;
    quantity: number;
    unitPrice: ReturnType<typeof parseMoney>;
    subtotal: ReturnType<typeof parseMoney>;
  }> = [];

  let amount = parseMoney(0);
  for (const member of members) {
    for (const selection of member.products || []) {
      const quantity = Math.max(1, Number(selection.quantity || 1));
      const product = productMap.get(selection.productId);
      if (!product) {
        return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
      }
      const mapping = product.operationalMapping;
      if (!mapping?.productCode || !mapping?.finishedGoodId || !mapping?.finishedGood) {
        return NextResponse.json({ error: "El producto no tiene un mapping operativo válido" }, { status: 400 });
      }
      const subtotal = multiplyMoney(product.price, quantity);
      amount = addMoney(amount, subtotal);
      corporateItems.push({
        orderId: "",
        organizationMemberId: member.organizationMemberId,
        productId: selection.productId,
        quantity,
        unitPrice: product.price,
        subtotal,
      });
    }
  }

  if (amount.lessThanOrEqualTo(0) || corporateItems.length === 0) {
    return NextResponse.json({ error: "La compra no contiene productos válidos" }, { status: 400 });
  }

  const orderNumber = await generateOrderNumber();
  const organizationDetails = await prisma.organization.findUnique({
    where: { id: organization.id },
    select: { legalName: true, displayName: true, contactEmail: true, contactPhone: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: auth.session.user.id,
        organizationId: organization.id,
        orderType: "corporate_employee_purchase",
        orderNumber,
        amount,
        provider: "manual",
        paymentMethod: "manual",
        orderStatus: "pending",
        paymentStatus: "under_review",
        adminReviewStatus: "pending",
        paymentProofUrl,
      },
    });

    await tx.corporateOrderEmployeeItem.createMany({
      data: corporateItems.map((item) => ({ ...item, orderId: created.id })),
    });

    const itemSnapshots = corporateItems.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        productCode: product?.operationalMapping?.productCode || null,
        productName: product?.name || item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: "unit",
        finishedGoodId: product?.operationalMapping?.finishedGoodId || null,
        operationalMappingId: product?.operationalMapping?.id || null,
        operationalMappingStatus:
          product?.operationalMapping?.id && product?.operationalMapping?.finishedGoodId && product?.operationalMapping?.productCode
            ? "mapped"
            : "unmapped",
        operationalProductCode: product?.operationalMapping?.productCode || null,
        operationalProductName: product?.operationalMapping?.finishedGood?.name || product?.name || item.productId,
        operationalFinishedGoodId: product?.operationalMapping?.finishedGoodId || null,
      };
    });

    await tx.organizationMember.updateMany({
      where: { id: { in: memberIds }, organizationId: organization.id },
      data: { corporateStatus: "approved_unpaid" },
    });

    await enqueueCommerceOrderSyncOutbox(tx, {
      sourceType: "organization_order",
      sourceId: created.id,
      sourceCode: created.orderNumber,
      orderType: "enterprise",
      companyName: organizationDetails?.displayName || organizationDetails?.legalName || null,
      contactName: organizationDetails?.displayName || organizationDetails?.legalName || null,
      contactEmail: organizationDetails?.contactEmail || null,
      contactPhone: organizationDetails?.contactPhone || null,
      customerReference: paymentProofUrl || created.orderNumber,
      paymentStatus: created.paymentStatus,
      paymentReference: paymentProofUrl || null,
      currency: created.currency,
      notes: "Sincronización pendiente hacia Operaciones",
      totalAmount: created.amount,
      organizationId: organization.id,
      salesChannel: "organization",
      items: itemSnapshots,
    });

    return created;
  });

  return NextResponse.json(
    {
      order: {
        ...order,
        amount: serializeMoney(order.amount),
      },
      totalAmount: serializeMoney(order.amount),
      operationsSyncStatus: "queued",
      operationsSyncWarning: null,
    },
    { status: 201 }
  );
}

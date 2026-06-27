import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organization = await prisma.organization.findFirst({
    where: { accountId: session.user.accountId },
    select: { id: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      organization: {
        select: { id: true, displayName: true, legalName: true },
      },
      corporateEmployeeItems: {
        include: {
          product: {
            select: { id: true, name: true, productType: true, image: true },
          },
          chip: {
            select: {
              id: true,
              shortCode: true,
              serialPublic: true,
              status: true,
              activatedAt: true,
            },
          },
          organizationMember: {
            select: {
              id: true,
              corporateStatus: true,
              employeeNationalId: true,
              employeePhone: true,
              employeePosition: true,
              employeeDepartment: true,
              employeeInternalId: true,
              profile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  bloodType: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order || order.organizationId !== organization.id) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.orderType !== "corporate_employee_purchase") {
    return NextResponse.json({ error: "Esta orden no es corporativa" }, { status: 400 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      amount: order.amount,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      adminReviewStatus: order.adminReviewStatus,
      corporateDeliveryStatus: order.corporateDeliveryStatus,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      deliveryNote: order.deliveryNote,
      createdAt: order.createdAt,
      organization: order.organization,
      items: order.corporateEmployeeItems,
    },
  });
}

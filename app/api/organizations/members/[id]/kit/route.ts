import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organization = await prisma.organization.findFirst({
    where: { accountId: session.user.accountId },
    select: { id: true, status: true },
  });
  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const { id: memberId } = await params;

  const member = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      corporateProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          bloodType: true,
          phone: true,
          profileType: true,
        },
      },
      corporateOrderItems: {
        select: {
          id: true,
          fulfillmentStatus: true,
          activatedAt: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              productType: true,
              image: true,
            },
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
          order: {
            select: {
              id: true,
              orderNumber: true,
              amount: true,
              orderStatus: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      productRequests: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  productType: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    memberId: member.id,
    corporateProfile: member.corporateProfile,
    corporateOrderItems: member.corporateOrderItems,
    productRequests: member.productRequests,
  });
}
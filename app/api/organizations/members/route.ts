import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() || "";

  const allowedStatuses = [
    "pending_company_review",
    "approved_unpaid",
    "rejected_by_company",
    "paid_active",
    "suspended",
    "archived",
  ];

  const whereStatus = status && allowedStatuses.includes(status) ? status : undefined;

  let whereObj: Prisma.OrganizationMemberWhereInput = { organizationId: organization.id };
  if (whereStatus) {
    whereObj = { ...whereObj, corporateStatus: whereStatus };
  }

  // Search by name, email, or cédula
  if (search) {
    const searchUpper = search.toUpperCase();
    whereObj = {
      ...whereObj,
      OR: [
        { profile: { firstName: { contains: searchUpper, mode: "insensitive" } } },
        { profile: { lastName: { contains: searchUpper, mode: "insensitive" } } },
        { profile: { user: { email: { contains: search, mode: "insensitive" } } } },
        { employeeNationalId: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const members = await prisma.organizationMember.findMany({
    where: whereObj,
    include: {
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      },
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ organization, members });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const where: any = {
    organizationId: organization.id,
  };

  if (whereStatus) {
    where.corporateStatus = whereStatus;
  }

  // Search by name, email, or cédula
  if (search) {
    const searchUpper = search.toUpperCase();
    where.OR = [
      { profile: { firstName: { contains: searchUpper, mode: "insensitive" } } },
      { profile: { lastName: { contains: searchUpper, mode: "insensitive" } } },
      { profile: { user: { email: { contains: search, mode: "insensitive" } } } },
      { employeeNationalId: { contains: search, mode: "insensitive" } },
    ];
  }

  const members = await prisma.organizationMember.findMany({
    where,
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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ organization, members });
}

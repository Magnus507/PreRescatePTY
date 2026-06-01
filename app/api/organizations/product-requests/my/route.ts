import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/organizations/product-requests/my
// Employee sees their own product requests.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;

  const requests = await prisma.corporateProductRequest.findMany({
    where: { requestedByUserId: userId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, price: true, productType: true, image: true },
          },
        },
      },
      organization: {
        select: { id: true, displayName: true, legalName: true },
      },
      companyReviewedBy: {
        select: { id: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}
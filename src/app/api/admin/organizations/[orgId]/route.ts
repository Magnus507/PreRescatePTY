import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

// GET organization detail with chips, members, account
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { orgId } = await params;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      account: {
        include: {
          package: true,
          chips: {
            orderBy: { createdAt: "desc" },
            include: {
              owner: { select: { email: true } },
              assignedProfile: { select: { firstName: true, lastName: true } },
              claimTokens: { select: { activationCode: true, usedAt: true } },
              _count: { select: { scanEvents: true } },
            },
          },
          users: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
              profile: {
                select: { firstName: true, lastName: true, bloodType: true },
              },
              _count: { select: { chips: true } },
            },
          },
        },
      },
      members: {
        include: {
          profile: {
            select: { firstName: true, lastName: true, bloodType: true },
          },
        },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ organization: org });
}

// PATCH - update organization fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { orgId } = await params;
  const body = await req.json();
  const { legalName, displayName, contactEmail, contactPhone, taxId, address, status } = body;

  const updateData: Record<string, string> = {};
  if (legalName !== undefined) updateData.legalName = legalName;
  if (displayName !== undefined) updateData.displayName = displayName;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
  if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
  if (taxId !== undefined) updateData.taxId = taxId;
  if (address !== undefined) updateData.address = address;
  if (status === "active" || status === "suspended") updateData.status = status;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: updateData,
  });

  return NextResponse.json({ organization: org });
}

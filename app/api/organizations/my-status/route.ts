import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          organizationMembers: {
            include: {
              organization: {
                select: {
                  id: true,
                  legalName: true,
                  displayName: true,
                  companyCode: true,
                  status: true,
                },
              },
              corporateProfile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profileType: true,
                  bloodType: true,
                  phone: true,
                },
              },
              corporateOrderItems: {
                select: {
                  id: true,
                  fulfillmentStatus: true,
                  activatedAt: true,
                  product: { select: { id: true, name: true, productType: true } },
                  chip: { select: { id: true, shortCode: true, status: true, serialPublic: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  let requests = user.profile?.organizationMembers || [];

  // Nota: corporateProfile debe ser creado por el endpoint de approve
  // (members/[id]) o por join-request. Este endpoint solo reporta el estado
  // actual sin crear perfiles automáticamente.

  return NextResponse.json({
    hasProfile: Boolean(user.profile),
    profile: user.profile,
    requests,
  });
}
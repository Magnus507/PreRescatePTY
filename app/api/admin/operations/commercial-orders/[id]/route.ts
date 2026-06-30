import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const finishedGoodSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  status: true,
  unit: true,
} as const;

const dispatchSelect = {
  id: true,
  code: true,
  status: true,
  destinationType: true,
  destinationName: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const commercialOrder = await prisma.operationCommercialOrder.findUnique({
      where: { id },
      include: {
        dispatch: {
          select: dispatchSelect,
        },
        items: {
          include: {
            finishedGood: {
              select: finishedGoodSelect,
            },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!commercialOrder) {
      return NextResponse.json(
        { error: "Pedido comercial no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ commercialOrder });
  } catch (error) {
    console.error("[operations/commercial-orders/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al obtener pedido comercial" },
      { status: 500 }
    );
  }
}

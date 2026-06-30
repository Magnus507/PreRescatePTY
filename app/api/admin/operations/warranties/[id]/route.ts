import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const commercialOrderSelect = {
  id: true,
  code: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  paymentStatus: true,
  fulfillmentStatus: true,
} as const;

const commercialOrderItemSelect = {
  id: true,
  productCode: true,
  productName: true,
  quantity: true,
  unit: true,
} as const;

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
    const warranty = await prisma.operationWarranty.findUnique({
      where: { id },
      include: {
        commercialOrder: {
          select: commercialOrderSelect,
        },
        commercialOrderItem: {
          select: commercialOrderItemSelect,
        },
        finishedGood: {
          select: finishedGoodSelect,
        },
        dispatch: {
          select: dispatchSelect,
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

    if (!warranty) {
      return NextResponse.json(
        { error: "Garantia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ warranty });
  } catch (error) {
    console.error("[operations/warranties/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al obtener garantia" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { calculateFinishedGoodBalance } from "../finished-goods.helpers";

export const dynamic = "force-dynamic";

const packingBatchSelect = {
  id: true,
  code: true,
  status: true,
  packageType: true,
  plannedQuantity: true,
  packedQuantity: true,
  rejectedQuantity: true,
  labelCode: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const finishedGood = await prisma.operationFinishedGood.findUnique({
      where: { id },
      include: {
        packingBatch: {
          select: packingBatchSelect,
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

    if (!finishedGood) {
      return NextResponse.json(
        { error: "Producto terminado no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      finishedGood: {
        ...finishedGood,
        balance: calculateFinishedGoodBalance(finishedGood.events),
      },
    });
  } catch (error) {
    console.error("[operations/finished-goods/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar producto terminado" },
      { status: 500 }
    );
  }
}

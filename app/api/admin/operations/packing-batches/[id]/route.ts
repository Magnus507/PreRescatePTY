import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const productionOrderSelect = {
  id: true,
  code: true,
  title: true,
  status: true,
  plannedQuantity: true,
  producedQuantity: true,
  outputType: true,
} as const;

const qcInspectionSelect = {
  id: true,
  code: true,
  status: true,
  inspectionType: true,
  inspectedQuantity: true,
  passedQuantity: true,
  failedQuantity: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const packingBatch = await prisma.operationPackingBatch.findUnique({
      where: { id },
      include: {
        productionOrder: {
          select: productionOrderSelect,
        },
        qcInspection: {
          select: qcInspectionSelect,
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

    if (!packingBatch) {
      return NextResponse.json(
        { error: "Batch de empaque no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ packingBatch });
  } catch (error) {
    console.error("[operations/packing-batches/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar batch de empaque" },
      { status: 500 }
    );
  }
}

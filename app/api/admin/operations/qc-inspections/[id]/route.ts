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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const qcInspection = await prisma.operationQcInspection.findUnique({
      where: { id },
      include: {
        productionOrder: {
          select: productionOrderSelect,
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

    if (!qcInspection) {
      return NextResponse.json(
        { error: "Inspeccion QC no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ qcInspection });
  } catch (error) {
    console.error("[operations/qc-inspections/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar inspeccion QC" },
      { status: 500 }
    );
  }
}

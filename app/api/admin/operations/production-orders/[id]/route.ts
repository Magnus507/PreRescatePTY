import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const productionOrder = await prisma.operationProductionOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: true,
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

    if (!productionOrder) {
      return NextResponse.json(
        { error: "Orden de produccion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ productionOrder });
  } catch (error) {
    console.error("[operations/production-orders/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar orden de produccion" },
      { status: 500 }
    );
  }
}

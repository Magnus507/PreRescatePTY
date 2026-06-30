import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { calculateMaterialBalance } from "../materials.helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const material = await prisma.operationMaterial.findUnique({
      where: { id },
      include: {
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

    if (!material) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      material: {
        ...material,
        balance: calculateMaterialBalance(material.events),
      },
    });
  } catch (error) {
    console.error("[operations/materials/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar material" },
      { status: 500 }
    );
  }
}

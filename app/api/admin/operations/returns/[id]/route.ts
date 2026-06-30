import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { returnInclude } from "../route";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const operationReturn = await prisma.operationReturn.findUnique({
      where: { id },
      include: {
        ...returnInclude,
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

    if (!operationReturn) {
      return NextResponse.json(
        { error: "Devolucion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ return: operationReturn });
  } catch (error) {
    console.error("[operations/returns/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar devolucion" },
      { status: 500 }
    );
  }
}

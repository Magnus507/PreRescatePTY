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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const dispatch = await prisma.operationDispatch.findUnique({
      where: { id },
      include: {
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

    if (!dispatch) {
      return NextResponse.json(
        { error: "Despacho no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ dispatch });
  } catch (error) {
    console.error("[operations/dispatches/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar despacho" },
      { status: 500 }
    );
  }
}

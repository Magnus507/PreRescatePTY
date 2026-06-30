import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { replacementInclude } from "../route";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const replacement = await prisma.operationReplacement.findUnique({
      where: { id },
      include: {
        ...replacementInclude,
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

    if (!replacement) {
      return NextResponse.json(
        { error: "Reemplazo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ replacement });
  } catch (error) {
    console.error("[operations/replacements/:id] GET error:", error);
    return NextResponse.json(
      { error: "Error al cargar reemplazo" },
      { status: 500 }
    );
  }
}

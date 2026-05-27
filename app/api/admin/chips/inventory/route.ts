import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const chips = await prisma.chip.findMany({
      where: {
        status: "inventory",
        ownerUserId: null,
        isPhysical: true,
      },
      select: {
        id: true,
        serialPublic: true,
        shortCode: true,
        internalLabel: true,
        isPhysical: true,
        claimTokens: {
          select: { activationCode: true, usedAt: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ chips });
  } catch (error) {
    console.error("Fetch inventory error:", error);
    return NextResponse.json({ error: "Error al cargar inventario" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const { id, internalLabel } = await req.json();

    if (!id) return NextResponse.json({ error: "ID de chip requerido" }, { status: 400 });

    const updatedChip = await prisma.chip.update({
      where: { id },
      data: { internalLabel },
    });

    return NextResponse.json({ chip: updatedChip });
  } catch (error) {
    console.error("Update chip error:", error);
    return NextResponse.json({ error: "Error al actualizar chip" }, { status: 500 });
  }
}

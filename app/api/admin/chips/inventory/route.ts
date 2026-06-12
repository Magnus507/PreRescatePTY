import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// USER_ROLES not used here
import { TOKEN_RESERVED_WHERE } from "@/domains/chips/token-lifecycle.helpers";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = session.user.role;
  return role === "admin" || role === "superadmin" || role === "imprenta";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const now = new Date();
    const chips = await prisma.chip.findMany({
      where: {
        status: "inventory",
        ownerUserId: null,
        isPhysical: true,
        claimTokens: {
          none: TOKEN_RESERVED_WHERE(now),
        }
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
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

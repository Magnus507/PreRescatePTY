import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
        claimTokens: {
          none: TOKEN_RESERVED_WHERE(now),
        }
      },
      select: {
        id: true,
        shortCode: true,
        serialPublic: true,
        internalLabel: true,
        status: true,
        isPhysical: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ chips });
  } catch (error) {
    console.error("Fetch available chips error:", error);
    return NextResponse.json({ error: "Error al cargar chips disponibles" }, { status: 500 });
  }
}
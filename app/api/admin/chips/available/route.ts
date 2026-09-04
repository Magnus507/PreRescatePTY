import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOKEN_RESERVED_WHERE } from "@/domains/chips/token-lifecycle.helpers";
import { ORDER_FULFILLMENT_ROLES, requireRole } from "@/lib/rbac";

export async function GET() {
  const auth = await requireRole(ORDER_FULFILLMENT_ROLES);
  if (!auth.authorized) return auth.response;

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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin" || role === "imprenta";
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "100");

  const where = {
    status: "inventory",
    ownerUserId: null,
    accountId: null
  };

  const [chips, total] = await Promise.all([
    prisma.chip.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        claimTokens: {
          select: { activationCode: true }
        }
      }
    }),
    prisma.chip.count({ where }),
  ]);

  return NextResponse.json({ chips, total, page, limit });
}

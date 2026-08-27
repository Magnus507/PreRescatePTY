import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";
import { revealActivationCode } from "@/domains/chips/activation-code.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

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

  return NextResponse.json({
    chips: chips.map((chip) => ({
      ...chip,
      claimTokens: chip.claimTokens.map((token) => ({
        ...token,
        activationCode: revealActivationCode(token.activationCode),
      })),
    })),
    total,
    page,
    limit,
  });
}

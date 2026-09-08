import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreshSession } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: {
      mfaEnabled: true,
      mfaSecret: true,
      isAdmin: true,
      adminRole: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const recoveryRows = user.mfaEnabled
    ? await prisma.$queryRaw<Array<{ remaining: bigint }>>`
        SELECT COUNT(*)::bigint AS "remaining"
        FROM "MfaRecoveryCode"
        WHERE "userId" = ${auth.session.user.id}
          AND "usedAt" IS NULL
      `.catch(() => [{ remaining: 0n }])
    : [{ remaining: 0n }];

  const configured = user.mfaEnabled && Boolean(user.mfaSecret);
  const inconsistent = user.mfaEnabled !== Boolean(user.mfaSecret);

  return NextResponse.json(
    {
      enabled: user.mfaEnabled,
      configured,
      inconsistent,
      recoveryCodesRemaining: Number(recoveryRows[0]?.remaining || 0n),
      admin: user.isAdmin,
      adminRole: user.adminRole,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

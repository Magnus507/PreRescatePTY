import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreshSession } from "@/lib/rbac";
import { countRemainingMfaRecoveryCodes } from "@/domains/users/services/mfa.service";

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

  const recoveryCodesRemaining = user.mfaEnabled
    ? await countRemainingMfaRecoveryCodes(prisma, auth.session.user.id)
    : 0;

  const configured = user.mfaEnabled && Boolean(user.mfaSecret);
  const inconsistent = user.mfaEnabled !== Boolean(user.mfaSecret);

  return NextResponse.json(
    {
      enabled: user.mfaEnabled,
      configured,
      inconsistent,
      recoveryCodesRemaining,
      admin: user.isAdmin,
      adminRole: user.adminRole,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

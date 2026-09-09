import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreshSession } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: { id: true, accountId: true, status: true, deletedAt: true },
  });
  if (!user || user.status !== "active" || user.deletedAt) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const requestId = getAuditRequestId(req);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });
    await writeAuditLog(tx, {
      accountId: user.accountId,
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "sessions.revoked",
      requestId,
      after: { allSessionsRevoked: true },
    });
  });

  return NextResponse.json({ success: true, sessionRevoked: true });
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireFreshSession } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req, "password-change");
  const limiter = await rateLimit("password:change", `${auth.session.user.id}:${ip}`, {
    limit: 5,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Contraseña actual y nueva son requeridas" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: {
      id: true,
      email: true,
      accountId: true,
      passwordHash: true,
      status: true,
      deletedAt: true,
    },
  });
  if (!user || user.status !== "active" || user.deletedAt) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 403 });
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "La nueva contraseña debe ser distinta de la actual" }, { status: 400 });
  }

  const policy = await validatePasswordPolicy(newPassword, { email: user.email });
  if (!policy.ok) {
    return NextResponse.json(
      { error: policy.error, code: policy.reason },
      { status: policy.reason === "breach_check_unavailable" ? 503 : 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const requestId = getAuditRequestId(req);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
    await writeAuditLog(tx, {
      accountId: user.accountId,
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "password.changed",
      requestId,
      after: { sessionRevoked: true },
    });
  });

  return NextResponse.json({ success: true, sessionRevoked: true });
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireFreshSession } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { encrypt } from "@/lib/encryption";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import {
  consumeVerifiedMfaTotp,
  generateMfaRecoveryCodes,
  openMfaSetupChallenge,
  replaceMfaRecoveryCodes,
  verifyMfaToken,
} from "@/domains/users/services/mfa.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req, "mfa-enable");
  const limiter = await rateLimit("mfa:enable", `${auth.session.user.id}:${ip}`, {
    limit: 5,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const challenge = typeof body.challenge === "string" ? body.challenge : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!currentPassword || !challenge || !code) {
    return NextResponse.json({ error: "Contraseña, challenge y código MFA son requeridos" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: {
      id: true,
      accountId: true,
      passwordHash: true,
      mfaEnabled: true,
      mfaSecret: true,
      status: true,
      deletedAt: true,
    },
  });
  if (!user || user.status !== "active" || user.deletedAt) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (user.mfaEnabled || user.mfaSecret) {
    return NextResponse.json({ error: "MFA ya está configurado o requiere reconciliación" }, { status: 409 });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 403 });
  }

  const opened = openMfaSetupChallenge(challenge, user.id);
  if (!opened) {
    return NextResponse.json({ error: "El challenge MFA no es válido o expiró" }, { status: 400 });
  }
  if (!verifyMfaToken(code, opened.secret)) {
    return NextResponse.json({ error: "Código MFA inválido" }, { status: 400 });
  }

  const recoveryCodes = generateMfaRecoveryCodes();
  const requestId = getAuditRequestId(req);
  const encryptedSecret = encrypt(opened.secret);

  try {
    await prisma.$transaction(async (tx) => {
      // Enrollment verification is a successful OTP validation too. Persist it
      // in the same replay ledger used by login/disable so the just-used TOTP
      // cannot be reused immediately after enrollment.
      const consumed = await consumeVerifiedMfaTotp(tx, user.id, code);
      if (!consumed) throw new Error("MFA_CODE_REUSED");

      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          mfaEnabled: false,
          mfaSecret: null,
          status: "active",
          deletedAt: null,
        },
        data: {
          mfaEnabled: true,
          mfaSecret: encryptedSecret,
          sessionVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("MFA_STATE_CHANGED");

      await replaceMfaRecoveryCodes(tx, user.id, recoveryCodes);
      await writeAuditLog(tx, {
        accountId: user.accountId,
        actorUserId: user.id,
        entityType: "User",
        entityId: user.id,
        action: "mfa.enabled",
        requestId,
        before: { mfaEnabled: false },
        after: { mfaEnabled: true, recoveryCodeCount: recoveryCodes.length },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MFA_CODE_REUSED") {
      return NextResponse.json({ error: "El código MFA ya fue utilizado; espera uno nuevo" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "MFA_STATE_CHANGED") {
      return NextResponse.json({ error: "El estado MFA cambió; vuelve a iniciar el proceso" }, { status: 409 });
    }
    console.error("[users/security/mfa/enable] error:", error);
    return NextResponse.json({ error: "No se pudo activar MFA" }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      recoveryCodes,
      sessionRevoked: true,
      message: "MFA activado. Guarda estos códigos una sola vez y vuelve a iniciar sesión.",
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

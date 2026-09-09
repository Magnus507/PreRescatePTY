import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireFreshSession } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { decrypt } from "@/lib/encryption";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import {
  consumeMfaRecoveryCode,
  consumeVerifiedMfaTotp,
  deleteMfaSecurityArtifacts,
  isRecoveryCode,
  verifyMfaToken,
} from "@/domains/users/services/mfa.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req, "mfa-disable");
  const limiter = await rateLimit("mfa:disable", `${auth.session.user.id}:${ip}`, {
    limit: 5,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!currentPassword || !code) {
    return NextResponse.json({ error: "Contraseña y segundo factor son requeridos" }, { status: 400 });
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
  if (!user.mfaEnabled) {
    return NextResponse.json({ error: "MFA no está activado" }, { status: 409 });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 403 });
  }

  let verifiedTotp = false;
  if (!isRecoveryCode(code)) {
    if (!user.mfaSecret) {
      return NextResponse.json({ error: "Configuración MFA inconsistente" }, { status: 409 });
    }
    try {
      verifiedTotp = verifyMfaToken(code, decrypt(user.mfaSecret));
    } catch {
      return NextResponse.json({ error: "Configuración MFA inconsistente" }, { status: 409 });
    }
    if (!verifiedTotp) {
      return NextResponse.json({ error: "Código MFA inválido" }, { status: 400 });
    }
  }

  const requestId = getAuditRequestId(req);
  try {
    await prisma.$transaction(async (tx) => {
      if (isRecoveryCode(code)) {
        const recoveryValid = await consumeMfaRecoveryCode(tx, user.id, code);
        if (!recoveryValid) throw new Error("INVALID_SECOND_FACTOR");
      } else {
        const consumed = await consumeVerifiedMfaTotp(tx, user.id, code);
        if (!consumed) throw new Error("INVALID_SECOND_FACTOR");
      }

      const updated = await tx.user.updateMany({
        where: { id: user.id, mfaEnabled: true },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          sessionVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error("MFA_STATE_CHANGED");

      await deleteMfaSecurityArtifacts(tx, user.id);
      await writeAuditLog(tx, {
        accountId: user.accountId,
        actorUserId: user.id,
        entityType: "User",
        entityId: user.id,
        action: "mfa.disabled",
        requestId,
        before: { mfaEnabled: true },
        after: { mfaEnabled: false },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SECOND_FACTOR") {
      return NextResponse.json({ error: "Segundo factor inválido, reutilizado o ya consumido" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "MFA_STATE_CHANGED") {
      return NextResponse.json({ error: "El estado MFA cambió; recarga e inténtalo de nuevo" }, { status: 409 });
    }
    console.error("[users/security/mfa/disable] error:", error);
    return NextResponse.json({ error: "No se pudo desactivar MFA" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sessionRevoked: true });
}

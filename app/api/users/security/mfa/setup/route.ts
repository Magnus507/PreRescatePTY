import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireFreshSession } from "@/lib/rbac";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { encrypt } from "@/lib/encryption";
import {
  buildMfaProvisioningUri,
  generateMfaSecret,
} from "@/domains/users/services/mfa.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req, "mfa-setup");
  const limiter = await rateLimit("mfa:setup", `${auth.session.user.id}:${ip}`, {
    limit: 5,
    windowMs: 60_000 * 15,
  });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) {
    return NextResponse.json({ error: "Confirma tu contraseña actual" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: {
      email: true,
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

  const secret = generateMfaSecret();
  const challenge = encrypt(secret);
  const provisioningUri = buildMfaProvisioningUri(user.email, secret);

  return NextResponse.json(
    {
      secret,
      challenge,
      provisioningUri,
      message: "Escanea el URI en tu aplicación autenticadora y confirma un código antes de activar MFA.",
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

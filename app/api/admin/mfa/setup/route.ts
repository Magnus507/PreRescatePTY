import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMfaSecret, generateOtpAuthUrl, generateQrCodeDataUrl } from "@/domains/users/services/mfa.service";
import { USER_ROLES } from "@/domains/shared/constants";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.role || ![USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Generate a temporary secret (not saved yet, saved only after verification)
  const secret = generateMfaSecret();
  const otpAuthUrl = generateOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl);

  return NextResponse.json({
    secret,
    qrCodeDataUrl
  });
}

/**
 * Confirm and enable MFA
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { secret, token } = await req.json();
  
  const { verifyMfaToken } = await import("@/domains/users/services/mfa.service");
  const isValid = verifyMfaToken(token, secret);

  if (!isValid) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaSecret: encrypt(secret),
      mfaEnabled: true
    }
  });

  return NextResponse.json({ message: "MFA habilitado correctamente" });
}

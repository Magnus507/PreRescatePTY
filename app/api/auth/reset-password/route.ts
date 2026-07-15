import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { hashPasswordResetToken } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    const ip = getClientIp(req, "reset-password");
    const limiter = await rateLimit("reset-password:ip", ip, { limit: 10, windowMs: 60_000 * 15 });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo mas tarde." },
        { status: 429 }
      );
    }

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña son requeridos" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(String(token));
    const now = new Date();

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "El enlace es inválido o ya ha sido utilizado." }, { status: 400 });
    }

    if (resetRecord.consumedAt || resetRecord.expiresAt < now) {
      return NextResponse.json({ error: "El enlace ha expirado. Por favor solicita uno nuevo." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailLower = resetRecord.email;

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetRecord.id,
          token: tokenHash,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (claimed.count !== 1) {
        return { status: 400 as const, body: { error: "El enlace es inválido o ya ha sido utilizado." } };
      }

      const updatedUser = await tx.user.updateMany({
        where: { email: emailLower },
        data: {
          passwordHash: hashedPassword,
          sessionVersion: { increment: 1 },
        },
      });

      if (updatedUser.count !== 1) {
        return { status: 400 as const, body: { error: "El enlace es inválido o ya ha sido utilizado." } };
      }

      await tx.passwordResetToken.deleteMany({
        where: {
          email: emailLower,
          id: { not: resetRecord.id },
        },
      });

      return { status: 200 as const, body: { success: true, message: "Contraseña actualizada exitosamente." } };
    });

    if (result.status !== 200) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(result.body);
  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json(
      { error: "Error al cambiar la contraseña." },
      { status: 500 }
    );
  }
}

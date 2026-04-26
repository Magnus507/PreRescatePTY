import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña son requeridos" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "El enlace es inválido o ya ha sido utilizado." }, { status: 400 });
    }

    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "El enlace ha expirado. Por favor solicita uno nuevo." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailLower = resetRecord.email;

    // Unified: single table update
    const user = await prisma.user.findUnique({ where: { email: emailLower } });

    if (user) {
      await prisma.user.update({
        where: { email: emailLower },
        data: { passwordHash: hashedPassword },
      });
    } else {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    // Delete token after successful use
    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });

    return NextResponse.json({ success: true, message: "Contraseña actualizada exitosamente." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json(
      { error: "Error al cambiar la contraseña." },
      { status: 500 }
    );
  }
}

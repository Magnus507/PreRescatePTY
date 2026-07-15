import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { SafeDeleteService } from "@/domains/users/services/safe-delete.service";
import { getClientIp } from "@/lib/request-ip";
import { requireFreshSession } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFreshSession();
    if (!auth.authorized) return auth.response;

    const userId = auth.session.user.id;
    const ip = getClientIp(req, `account-delete:${userId}`);
    const limiter = await rateLimit("account-delete", `${userId}:${ip}`, {
      limit: 5,
      windowMs: 60_000 * 15,
    });
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta mas tarde." }, { status: 429 });
    }

    const { confirmation, password } = await req.json();

    if (confirmation !== "BORRAR CUENTA") {
      return NextResponse.json({ error: "Confirmacion invalida" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || typeof password !== "string") {
      return NextResponse.json({ error: "Contrasena requerida" }, { status: 400 });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json({ error: "Contrasena incorrecta" }, { status: 403 });
    }

    const success = await SafeDeleteService.deleteUserAccount(userId, userId);

    if (!success) {
      return NextResponse.json({ error: "Error al ejecutar el borrado seguro" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Cuenta borrada satisfactoriamente" });
  } catch (error: unknown) {
    console.error("[AccountDeleteAPI] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

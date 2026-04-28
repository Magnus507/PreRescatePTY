import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SafeDeleteService } from "@/domains/users/services/safe-delete.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { confirmation } = await req.json();

    if (confirmation !== "BORRAR CUENTA") {
      return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
    }

    const userId = session.user.id;
    
    // Perform safe delete
    // We treat the current user as the actor
    const success = await SafeDeleteService.deleteUserAccount(userId, userId);

    if (!success) {
      return NextResponse.json({ error: "Error al ejecutar el borrado seguro" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Cuenta borrada satisfactoriamente" });
  } catch (error: any) {
    console.error("[AccountDeleteAPI] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

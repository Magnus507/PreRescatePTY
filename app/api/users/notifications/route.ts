import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const notifications = await prisma.appNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json({ error: "Error al cargar notificaciones" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { id, readAll } = await req.json();

  try {
    if (readAll) {
      await prisma.appNotification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ message: "Todas marcadas como leídas" });
    }

    if (id) {
      await prisma.appNotification.update({
        where: { id, userId },
        data: { read: true },
      });
      return NextResponse.json({ message: "Notificación leída" });
    }

    return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ error: "Error al actualizar notificación" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  
    const userId = (session.user as { id: string }).id;
    const { id } = await req.json();
  
    try {
      if (id) {
        await prisma.appNotification.delete({
          where: { id, userId },
        });
        return NextResponse.json({ message: "Notificación eliminada" });
      }
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    } catch (error) {
      console.error("Delete notification error:", error);
      return NextResponse.json({ error: "Error al eliminar notificación" }, { status: 500 });
    }
}

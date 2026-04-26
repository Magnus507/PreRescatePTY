import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "superadmin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Solo superadmin puede modificar administradores" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, role } = body;

  const updateData: Record<string, string | boolean> = {};
  if (status === "active" || status === "suspended") updateData.status = status;
  if (["admin", "superadmin", "imprenta"].includes(role)) updateData.adminRole = role;

  const currentAdmin = await prisma.user.findUnique({ where: { id } });
  if (!currentAdmin?.isAdmin) {
    return NextResponse.json({ error: "Usuario no es administrador" }, { status: 404 });
  }
  if (currentAdmin?.email === "admin@prerescatepty.com") {
    return NextResponse.json({ error: "La cuenta maestra no puede ser modificada" }, { status: 403 });
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const admin = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      admin: { 
        id: admin.id, 
        email: admin.email, 
        role: admin.adminRole, 
        status: admin.status, 
        createdAt: admin.createdAt 
      } 
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar administrador" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Solo superadmin puede eliminar administradores" }, { status: 403 });
  }

  const { id } = await params;

  const currentAdmin = await prisma.user.findUnique({ where: { id } });
  if (!currentAdmin?.isAdmin) {
    return NextResponse.json({ error: "Usuario no es administrador" }, { status: 404 });
  }
  if (currentAdmin?.email === "admin@prerescatepty.com") {
    return NextResponse.json({ error: "La cuenta maestra es vitalicia y no puede ser eliminada" }, { status: 403 });
  }

  try {
    // Don't delete the user - just remove admin privileges
    await prisma.user.update({
      where: { id },
      data: { isAdmin: false, adminRole: null },
    });

    return NextResponse.json({ message: "Administrador eliminado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar administrador" }, { status: 500 });
  }
}

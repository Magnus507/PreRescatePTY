import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "superadmin";
}

// List all admin users
export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Solo superadmin puede gestionar administradores" }, { status: 403 });
  }

  const admins = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ admins });
}

// Create a new admin user
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Solo superadmin puede crear administradores" }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  const validRoles = ["admin", "superadmin"];
  const adminRole = validRoles.includes(role) ? role : "admin";

  // Check if admin already exists
  const existing = await prisma.adminUser.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "Este email ya está registrado como admin" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.create({
    data: {
      email: emailLower,
      passwordHash,
      role: adminRole,
      status: "active",
    },
  });

  return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.role, status: admin.status, createdAt: admin.createdAt } }, { status: 201 });
}

// Update admin (status, role)
export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Solo superadmin puede modificar administradores" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, role } = body;

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const updateData: Record<string, string> = {};
  if (status === "active" || status === "suspended") updateData.status = status;
  if (role === "admin" || role === "superadmin") updateData.role = role;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const admin = await prisma.adminUser.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.role, status: admin.status, createdAt: admin.createdAt } });
}

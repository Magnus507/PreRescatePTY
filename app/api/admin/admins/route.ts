import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { adminCreateSchema, adminUpdateSchema, validateOrNull } from "@/lib/validations";

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

  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      adminRole: true,
      status: true,
      createdAt: true,
    },
  });

  // Map to expected shape for frontend compatibility
  const mapped = admins.map(a => ({
    id: a.id,
    email: a.email,
    role: a.adminRole || a.role,
    status: a.status,
    createdAt: a.createdAt,
  }));

  return NextResponse.json({ admins: mapped });
}

// Create a new admin user
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Solo superadmin puede crear administradores" }, { status: 403 });
  }

  const body = await req.json();
  const { data: validated, error } = validateOrNull(adminCreateSchema, body);
  if (error || !validated) {
    return NextResponse.json({ error: error || "Datos inválidos" }, { status: 400 });
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: validated.email } });
  if (existing) {
    if (existing.isAdmin) {
      return NextResponse.json({ error: "Este email ya está registrado como admin" }, { status: 409 });
    }
    // Upgrade existing user to admin
    const admin = await prisma.user.update({
      where: { id: existing.id },
      data: { isAdmin: true, adminRole: validated.role as string },
    });
    return NextResponse.json({
      admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt }
    }, { status: 200 });
  }

  const passwordHash = await bcrypt.hash(validated.password, 12);

  const admin = await prisma.user.create({
    data: {
      email: validated.email,
      passwordHash,
      role: "owner",
      isAdmin: true,
      adminRole: validated.role as string,
      status: "active",
    },
  });

  return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt } }, { status: 201 });
}

// Update admin (status, role)
export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Solo superadmin puede modificar administradores" }, { status: 403 });
  }

  const body = await req.json();
  const { data: validated, error } = validateOrNull(adminUpdateSchema, body);
  if (error || !validated) {
    return NextResponse.json({ error: error || "Datos inválidos" }, { status: 400 });
  }

  const currentAdmin = await prisma.user.findUnique({ where: { id: validated.id } });
  if (currentAdmin?.email === "admin@prerescatepty.com") {
    return NextResponse.json({ error: "La cuenta maestra no puede ser modificada" }, { status: 403 });
  }

  const updateData: any = {};
  if (validated.status) updateData.status = validated.status as string;
  if (validated.role) updateData.adminRole = validated.role as string;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const admin = await prisma.user.update({
    where: { id: validated.id },
    data: updateData,
  });

  return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt } });
}

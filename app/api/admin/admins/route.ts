import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { adminCreateSchema, adminUpdateSchema, validateOrNull } from "@/lib/validations";
import { bumpUserSessionVersion, requireRole, SUPERADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// List all admin users
export async function GET() {
  const auth = await requireRole(SUPERADMIN_ROLES);
  if (!auth.authorized) return auth.response;

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
  const auth = await requireRole(SUPERADMIN_ROLES);
  if (!auth.authorized) return auth.response;

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
    await bumpUserSessionVersion(admin.id);
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

  await bumpUserSessionVersion(admin.id);

  return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt } }, { status: 201 });
}

// Update admin (status, role)
export async function PATCH(req: NextRequest) {
  const auth = await requireRole(SUPERADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { data: validated, error } = validateOrNull(adminUpdateSchema, body);
  if (error || !validated) {
    return NextResponse.json({ error: error || "Datos inválidos" }, { status: 400 });
  }

  const currentAdmin = await prisma.user.findUnique({ where: { id: validated.id } });
  if (currentAdmin?.email === "admin@prerescatepty.com") {
    return NextResponse.json({ error: "La cuenta maestra no puede ser modificada" }, { status: 403 });
  }

  const updateData: Partial<{ status: string; adminRole: string }> = {};
  if (validated.status) updateData.status = validated.status as string;
  if (validated.role) updateData.adminRole = validated.role as string;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const admin = await prisma.user.update({
    where: { id: validated.id },
    data: updateData,
  });
  await bumpUserSessionVersion(admin.id);

  return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt } });
}

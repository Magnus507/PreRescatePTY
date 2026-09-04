import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { adminCreateSchema, adminUpdateSchema, validateOrNull } from "@/lib/validations";
import { requireRole, SUPERADMIN_ROLES } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

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
    try {
      const admin = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            isAdmin: true,
            adminRole: validated.role as string,
            sessionVersion: { increment: 1 },
          },
        });
        await writeAuditLog(tx, {
          accountId: updated.accountId,
          actorUserId: auth.session.user.id,
          entityType: "User",
          entityId: updated.id,
          action: "admin_access_granted",
          requestId: getAuditRequestId(req),
          before: { isAdmin: existing.isAdmin, adminRole: existing.adminRole, status: existing.status },
          after: { isAdmin: true, adminRole: updated.adminRole, status: updated.status },
        });
        return updated;
      });
      return NextResponse.json({
        admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt }
      }, { status: 200 });
    } catch {
      return NextResponse.json({ error: "Error al otorgar acceso administrativo" }, { status: 500 });
    }
  }

  try {
    const passwordHash = await bcrypt.hash(validated.password, 12);
    const admin = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: validated.email,
          passwordHash,
          role: "owner",
          isAdmin: true,
          adminRole: validated.role as string,
          status: "active",
          sessionVersion: 1,
        },
      });
      await writeAuditLog(tx, {
        accountId: created.accountId,
        actorUserId: auth.session.user.id,
        entityType: "User",
        entityId: created.id,
        action: "admin_created",
        requestId: getAuditRequestId(req),
        after: { isAdmin: true, adminRole: created.adminRole, status: created.status },
      });
      return created;
    });
    return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt } }, { status: 201 });
  } catch (mutationError) {
    if (mutationError instanceof Prisma.PrismaClientKnownRequestError && mutationError.code === "P2002") {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear administrador" }, { status: 500 });
  }
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
  if (!currentAdmin?.isAdmin) {
    return NextResponse.json({ error: "Usuario no es administrador" }, { status: 404 });
  }
  if (currentAdmin?.email === "admin@prerescatepty.com") {
    return NextResponse.json({ error: "La cuenta maestra no puede ser modificada" }, { status: 403 });
  }

  const updateData: Partial<{ status: string; adminRole: string }> = {};
  if (validated.status) updateData.status = validated.status as string;
  if (validated.role) updateData.adminRole = validated.role as string;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const admin = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: validated.id },
        data: { ...updateData, sessionVersion: { increment: 1 } },
      });
      await writeAuditLog(tx, {
        accountId: updated.accountId,
        actorUserId: auth.session.user.id,
        entityType: "User",
        entityId: updated.id,
        action: "admin_access_updated",
        requestId: getAuditRequestId(req),
        before: { isAdmin: currentAdmin.isAdmin, adminRole: currentAdmin.adminRole, status: currentAdmin.status },
        after: { isAdmin: updated.isAdmin, adminRole: updated.adminRole, status: updated.status },
      });
      return updated;
    });
    return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.adminRole, status: admin.status, createdAt: admin.createdAt } });
  } catch {
    return NextResponse.json({ error: "Error al actualizar administrador" }, { status: 500 });
  }
}

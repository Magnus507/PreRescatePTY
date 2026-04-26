import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

// POST - create a user assigned to this organization's account
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { orgId } = await params;
  const body = await req.json();
  const { email, password, phone, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
  }

  // Get the organization and its account
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { accountId: true, legalName: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const emailLower = email.toLowerCase().trim();

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const validRoles = ["owner", "manager", "member"];
  const userRole = validRoles.includes(role) ? role : "member";

  const user = await prisma.user.create({
    data: {
      email: emailLower,
      phone: phone || null,
      passwordHash,
      role: userRole,
      status: "active",
      accountId: org.accountId,
    },
  });

  // Audit
  const session2 = await getServerSession(authOptions);
  await prisma.auditLog.create({
    data: {
      actorUserId: (session2?.user as { id: string }).id,
      accountId: org.accountId,
      entityType: "user",
      entityId: user.id,
      action: "create",
      newValuesJson: JSON.stringify({ email: emailLower, role: userRole, organization: org.legalName }),
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
  }, { status: 201 });
}

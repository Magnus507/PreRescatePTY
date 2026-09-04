import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/domains/users/repositories/user.repository";
import { z } from "zod";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// PATCH schema validation
const updateStatusSchema = z.object({
  id: z.string().cuid().optional().or(z.string().uuid()), // Support both cuid and uuid
  status: z.enum(["active", "suspended"]),
});

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { searchParams } = new URL(req.url);
  
  // Sanitize pagination
  const rawPage = parseInt(searchParams.get("page") || "1");
  const rawLimit = parseInt(searchParams.get("limit") || "50");
  
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 || rawLimit > 100 ? 50 : rawLimit;
  const search = searchParams.get("search") || "";

  try {
    const { users, total } = await UserRepository.findPersonalUsers({ 
      page, 
      limit, 
      search 
    });

    return NextResponse.json({ users, total, page, limit });
  } catch (error) {
    console.error("Admin Users GET Error:", error);
    return NextResponse.json({ error: "Error al cargar usuarios" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  try {
    const body = await req.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: result.error.format() },
        { status: 400 }
      );
    }

    const { id, status } = result.data;

    const user = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id },
        select: { id: true, accountId: true, email: true, status: true, isAdmin: true },
      });
      if (!current || current.isAdmin) {
        const mutationError = new Error("USER_NOT_ELIGIBLE");
        Object.assign(mutationError, { code: "P2025" });
        throw mutationError;
      }

      const updated = await tx.user.update({
        where: { id },
        data: { status, sessionVersion: { increment: 1 } },
        select: { id: true, accountId: true, email: true, status: true },
      });
      await writeAuditLog(tx, {
        accountId: updated.accountId,
        actorUserId: auth.session.user.id,
        entityType: "User",
        entityId: updated.id,
        action: "user_status_updated",
        requestId: getAuditRequestId(req),
        before: { status: current.status },
        after: { status: updated.status },
      });
      return { id: updated.id, email: updated.email, status: updated.status };
    });
    return NextResponse.json({ user });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2025') {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("Admin Users PATCH Error:", err);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

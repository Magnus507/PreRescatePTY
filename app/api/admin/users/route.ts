import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/domains/users/repositories/user.repository";
import { z } from "zod";
import { requireRole, ORDER_ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// PATCH schema validation
const updateStatusSchema = z.object({
  id: z.string().cuid().optional().or(z.string().uuid()), // Support both cuid and uuid
  status: z.enum(["active", "suspended"]),
});

export async function GET(req: NextRequest) {
  const auth = await requireRole(ORDER_ADMIN_ROLES);
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
  const auth = await requireRole(ORDER_ADMIN_ROLES);
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

    const user = await UserRepository.updateStatus(id!, status);
    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    console.error("Admin Users PATCH Error:", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}


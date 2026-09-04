import { NextResponse } from "next/server";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const configs = await ConfigRepository.getAll();
  return NextResponse.json({ configs });
}

export async function PATCH(req: Request) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  try {
    const body = await req.json();
    const configs = body.configs;
    
    if (!configs || typeof configs !== "object") {
      return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
    }

    await ConfigRepository.setMany(configs);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_ADMIN_CONFIG_PATCH]", error);
    return NextResponse.json({ error: "Error al actualizar la configuración" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/guards";
import { ConfigRepository } from "@/domains/shared/repositories/config.repository";

export const GET = withAdminAuth(async () => {
  const configs = await ConfigRepository.getAll();
  return NextResponse.json({ configs });
});

export const PATCH = withAdminAuth(async (req) => {
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
});

import { NextResponse } from "next/server";
import { redis, isRedisConfigured } from "@/lib/redis";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    if (redis && isRedisConfigured()) {
      // Flush all keys (or specific patterns)
      // Since it's Upstash, we can use flushdb or keys + del
      await redis.flushdb();
      return NextResponse.json({ success: true, message: "Caché del sistema purgada con éxito." });
    } else {
      return NextResponse.json({ success: true, message: "Redis no configurado, nada que purgar." });
    }
  } catch (error) {
    console.error("[Maintenance] Clear Cache Error:", error);
    return NextResponse.json(
      { error: "Error al purgar la caché" },
      { status: 500 }
    );
  }
}

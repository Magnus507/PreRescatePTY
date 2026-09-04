import { NextRequest, NextResponse } from "next/server";
import { redis, isRedisConfigured } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    if (redis && isRedisConfigured()) {
      // Flush all keys (or specific patterns)
      // Since it's Upstash, we can use flushdb or keys + del
      await redis.flushdb();
      await writeAuditLog(prisma, {
        accountId: auth.session.user.accountId || null,
        actorUserId: auth.session.user.id || null,
        entityType: "system_cache",
        entityId: "redis",
        action: "system_cache.flushed",
        requestId: getAuditRequestId(req),
        after: { configured: true },
      });
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

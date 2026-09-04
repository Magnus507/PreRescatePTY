import { NextResponse } from "next/server";
import { CONFIG_KEYS, ConfigRepository, type ConfigKey } from "@/domains/shared/repositories/config.repository";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

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

    const entries = Object.entries(configs);
    const allowedKeys = new Set<string>(CONFIG_KEYS);
    if (
      entries.length === 0 ||
      entries.some(([key, value]) => !allowedKeys.has(key) || typeof value !== "string")
    ) {
      return NextResponse.json({ error: "Configuración no válida" }, { status: 400 });
    }

    const keys = entries.map(([key]) => key as ConfigKey);
    const requestId = getAuditRequestId(req);
    await prisma.$transaction(async (tx) => {
      const current = await tx.systemConfig.findMany({ where: { key: { in: keys } } });
      await Promise.all(entries.map(([key, value]) =>
        tx.systemConfig.upsert({
          where: { key },
          update: { value: value as string },
          create: { key, value: value as string },
        })
      ));
      await writeAuditLog(tx, {
        accountId: auth.session.user.accountId,
        actorUserId: auth.session.user.id,
        entityType: "SystemConfig",
        entityId: "global",
        action: "config_updated",
        requestId,
        before: Object.fromEntries(current.map((item) => [item.key, item.value])),
        after: configs,
      });
    });
    await ConfigRepository.invalidateMany(keys);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_ADMIN_CONFIG_PATCH]", error);
    return NextResponse.json({ error: "Error al actualizar la configuración" }, { status: 500 });
  }
}

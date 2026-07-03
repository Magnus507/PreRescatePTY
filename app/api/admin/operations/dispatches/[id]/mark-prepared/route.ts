import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: { items: true, events: { orderBy: { createdAt: "asc" }, select: { metadataJson: true } } },
      });
      if (!dispatch) throw new Error("NOT_FOUND");
      if (!["draft", "pending_pick", "pending_preparation"].includes(dispatch.status)) throw new Error("LOCKED");
      const pickedIds = new Set<string>();
      for (const event of dispatch.events) {
        if (!event.metadataJson) continue;
        try {
          const meta = JSON.parse(event.metadataJson) as { unitId?: string; picked?: boolean };
          if (meta.unitId && meta.picked) pickedIds.add(meta.unitId);
        } catch {}
      }
      const totalUnits = dispatch.items.length;
      if (pickedIds.size < totalUnits) throw new Error("NOT_READY");
      await tx.operationDispatch.update({ where: { id }, data: { status: "prepared" } });
      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: id,
          eventType: "PACKED",
          reason: "Pedido preparado",
          referenceType: "dispatch",
          referenceId: id,
          metadataJson: JSON.stringify({ preparedAt: new Date().toISOString() }),
          createdById: auth.session.user.id || null,
        },
      });
      return { status: "prepared" as const };
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = { NOT_FOUND: "Despacho no encontrado", LOCKED: "El despacho no permite prepararse", NOT_READY: "Todas las unidades deben estar separadas" };
    if (map[message]) return NextResponse.json({ error: map[message] }, { status: 400 });
    console.error("[operations/dispatches/:id/mark-prepared] POST error:", error);
    return NextResponse.json({ error: "No se pudo marcar preparado" }, { status: 500 });
  }
}

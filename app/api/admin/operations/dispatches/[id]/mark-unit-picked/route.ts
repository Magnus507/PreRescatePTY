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
  const body = await req.json().catch(() => ({}));
  const unitId = typeof body.unitId === "string" ? body.unitId.trim() : "";
  const picked = Boolean(body.picked);

  if (!unitId) {
    return NextResponse.json({ error: "unitId es requerido" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.operationDispatch.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              unitRecord: true,
            },
          },
          events: {
            orderBy: { createdAt: "asc" },
            select: { metadataJson: true, eventType: true, createdAt: true },
          },
        },
      });

      if (!dispatch) throw new Error("DISPATCH_NOT_FOUND");
      if (!["draft", "pending_pick", "pending_preparation"].includes(dispatch.status)) {
        throw new Error("DISPATCH_LOCKED");
      }

      const item = dispatch.items.find((row) => row.unitId === unitId);
      if (!item || !item.unitRecord) throw new Error("UNIT_NOT_IN_DISPATCH");

      const unit = item.unitRecord;
      if (!unit.internalLabel?.trim()) throw new Error("NO_INTERNAL_LABEL");
      if (unit.activationStatus !== "not_activated") throw new Error("UNIT_ACTIVATED");
      if (["dispatched", "delivered"].includes(unit.status)) throw new Error("UNIT_ALREADY_SHIPPED");
      if (unit.reservedOrderId && dispatch.events.some((event) => event.metadataJson?.includes(unit.reservedOrderId || ""))) {
        // keep compatibility without extra enforcement
      }

      const pickedUnits: Array<{ unitId: string; pickedAt: string }> = [];
      for (const event of dispatch.events) {
        if (!event.metadataJson) continue;
        try {
          const meta = JSON.parse(event.metadataJson) as { unitId?: string; picked?: boolean; pickedAt?: string };
          if (meta.unitId && meta.picked) {
            pickedUnits.push({ unitId: meta.unitId, pickedAt: meta.pickedAt || event.createdAt.toISOString() });
          }
        } catch {
          continue;
        }
      }

      const existingIndex = pickedUnits.findIndex((entry) => entry.unitId === unitId);
      if (picked) {
        const pickedAt = new Date().toISOString();
        if (existingIndex >= 0) {
          pickedUnits[existingIndex] = { unitId, pickedAt };
        } else {
          pickedUnits.push({ unitId, pickedAt });
        }
      } else if (existingIndex >= 0) {
        pickedUnits.splice(existingIndex, 1);
      }

      await tx.operationDispatchEvent.create({
        data: {
          dispatchId: dispatch.id,
          eventType: "PICKED",
          reason: picked ? "Unidad separada físicamente" : "Unidad desmarcada",
          referenceType: "dispatch",
          referenceId: dispatch.id,
          metadataJson: JSON.stringify({
            unitId,
            picked,
            pickedAt: picked ? new Date().toISOString() : null,
            pickedUnitIds: pickedUnits.map((entry) => entry.unitId),
            pickedUnits,
            orderId: dispatch.events
              .map((event) => {
                if (!event.metadataJson) return null;
                try {
                  const meta = JSON.parse(event.metadataJson) as { orderId?: string; referenceId?: string };
                  return meta.orderId || meta.referenceId || null;
                } catch {
                  return null;
                }
              })
              .find(Boolean) || null,
          }),
          createdById: auth.session.user.id || null,
        },
      });

      return { unitId, picked };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const map: Record<string, string> = {
      DISPATCH_NOT_FOUND: "Despacho no encontrado",
      DISPATCH_LOCKED: "El despacho ya no permite separar unidades",
      UNIT_NOT_IN_DISPATCH: "La unidad no pertenece a este despacho",
      NO_INTERNAL_LABEL: "La unidad no tiene internalLabel",
      UNIT_ACTIVATED: "La unidad ya fue activada",
      UNIT_ALREADY_SHIPPED: "La unidad ya fue enviada o entregada",
    };
    if (map[message]) {
      return NextResponse.json({ error: map[message] }, { status: 400 });
    }
    console.error("[operations/dispatches/:id/mark-unit-picked] POST error:", error);
    return NextResponse.json({ error: "No se pudo marcar la unidad" }, { status: 500 });
  }
}

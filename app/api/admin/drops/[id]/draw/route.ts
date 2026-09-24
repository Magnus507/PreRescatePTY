import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { executeDropDraw } from "@/lib/drops/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const draw = await executeDropDraw(id, auth.session.user.id);

    try {
      await prisma.$transaction(async (tx) => {
        await writeAuditLog(tx, {
          actorUserId: auth.session.user.id,
          accountId: auth.session.user.accountId ?? null,
          entityType: "DropDraw",
          entityId: draw.id,
          action: "drop.draw_execute",
          requestId: getAuditRequestId(req),
          after: {
            dropId: id,
            entryCount: draw.entryCount,
            purchaseEntryCount: draw.purchaseEntryCount,
            bonusEntryCount: draw.bonusEntryCount,
            manifestHash: draw.manifestHash,
            winnerIndex: draw.winnerIndex,
            winnerEntryCode: draw.winnerEntryCode,
          },
        });
      });
    } catch {
      console.error("DROP_DRAW_SECONDARY_AUDIT_FAILED", draw.id);
    }

    return NextResponse.json({ draw });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      DROP_NOT_FOUND: ["Drop no encontrado.", 404],
      DROP_NOT_READY_FOR_DRAW: [
        "El Drop todavía no está listo para sortearse.",
        409,
      ],
      DROP_ALREADY_DRAWN: ["Este Drop ya fue sorteado.", 409],
      DROP_GOAL_NOT_VERIFIED: [
        "La meta de pases pagados no está completa.",
        409,
      ],
    };

    const [message, status] =
      map[code] || ["No se pudo ejecutar el sorteo.", 500];
    if (status === 500) console.error("DROP_DRAW_FAILED");
    return NextResponse.json({ error: message }, { status });
  }
}

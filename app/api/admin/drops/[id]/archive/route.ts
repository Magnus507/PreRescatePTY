import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const requestId = getAuditRequestId(req);

  if (!["archive", "restore"].includes(action)) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  try {
    const drop = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          title: string;
          status: string;
          archivedAt: Date | null;
          archivedByUserId: string | null;
        }>
      >`
        SELECT "id", "title", "status"::text AS "status",
               "archivedAt", "archivedByUserId"
        FROM "Drop"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const current = rows[0];
      if (!current) throw new Error("DROP_NOT_FOUND");

      if (action === "archive") {
        if (current.archivedAt) throw new Error("DROP_ALREADY_ARCHIVED");
        if (!["drawn", "finalized"].includes(current.status)) {
          throw new Error("DROP_ARCHIVE_REQUIRES_RESULT");
        }

        const updated = await tx.drop.update({
          where: { id },
          data: {
            archivedAt: new Date(),
            archivedByUserId: auth.session.user.id,
          },
        });

        await writeAuditLog(tx, {
          actorUserId: auth.session.user.id,
          accountId: auth.session.user.accountId ?? null,
          entityType: "Drop",
          entityId: id,
          action: "drop.archive",
          requestId,
          before: {
            status: current.status,
            archivedAt: current.archivedAt,
          },
          after: {
            status: updated.status,
            archivedAt: updated.archivedAt,
          },
        });

        return updated;
      }

      if (!current.archivedAt) throw new Error("DROP_NOT_ARCHIVED");

      const updated = await tx.drop.update({
        where: { id },
        data: {
          archivedAt: null,
          archivedByUserId: null,
        },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "Drop",
        entityId: id,
        action: "drop.restore_archive",
        requestId,
        before: {
          status: current.status,
          archivedAt: current.archivedAt,
        },
        after: {
          status: updated.status,
          archivedAt: null,
        },
      });

      return updated;
    });

    return NextResponse.json({ drop });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      DROP_NOT_FOUND: ["Drop no encontrado.", 404],
      DROP_ALREADY_ARCHIVED: ["Ese Drop ya está archivado.", 409],
      DROP_NOT_ARCHIVED: ["Ese Drop no está archivado.", 409],
      DROP_ARCHIVE_REQUIRES_RESULT: [
        "Solo se pueden archivar Drops sorteados o finalizados. El historial y el resultado se conservan.",
        409,
      ],
    };
    const [message, status] = map[code] || ["No se pudo actualizar el archivo del Drop.", 500];
    if (status === 500) console.error("DROP_ARCHIVE_UPDATE_FAILED");
    return NextResponse.json({ error: message }, { status });
  }
}

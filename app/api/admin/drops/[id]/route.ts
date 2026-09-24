import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

function normalizeImageUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("DROP_IMAGE_INVALID");
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  throw new Error("DROP_IMAGE_INVALID");
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const requestId = getAuditRequestId(req);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Drop"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!lock[0]) throw new Error("DROP_NOT_FOUND");

      const current = await tx.drop.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              passes: true,
              bonusEntries: true,
              bonusCredits: { where: { claimedAt: { not: null } } },
            },
          },
          draw: { select: { id: true } },
        },
      });
      if (!current) throw new Error("DROP_NOT_FOUND");
      if (["drawn", "finalized"].includes(current.status)) {
        throw new Error("DROP_EDIT_LOCKED");
      }

      const title =
        typeof body.title === "string" ? body.title.trim().slice(0, 120) : current.title;
      const description =
        body.description === null
          ? null
          : typeof body.description === "string"
            ? body.description.trim().slice(0, 1000) || null
            : current.description;
      const prizeLabel =
        typeof body.prizeLabel === "string"
          ? body.prizeLabel.trim().slice(0, 160)
          : current.prizeLabel;
      const imageUrl =
        Object.prototype.hasOwnProperty.call(body, "imageUrl")
          ? normalizeImageUrl(body.imageUrl)
          : current.imageUrl;
      const targetPasses =
        Object.prototype.hasOwnProperty.call(body, "targetPasses")
          ? Number(body.targetPasses)
          : current.targetPasses;

      if (
        !title ||
        !prizeLabel ||
        !Number.isInteger(targetPasses) ||
        targetPasses < 1 ||
        targetPasses > 100000
      ) {
        throw new Error("DROP_EDIT_INVALID");
      }

      const hasParticipation =
        current._count.passes > 0 ||
        current._count.bonusEntries > 0 ||
        current._count.bonusCredits > 0 ||
        Boolean(current.draw);

      if (
        hasParticipation &&
        (prizeLabel !== current.prizeLabel || targetPasses !== current.targetPasses)
      ) {
        throw new Error("DROP_COMMERCIAL_FIELDS_LOCKED");
      }

      const before = {
        title: current.title,
        description: current.description,
        prizeLabel: current.prizeLabel,
        imageUrl: current.imageUrl,
        targetPasses: current.targetPasses,
      };

      const drop = await tx.drop.update({
        where: { id },
        data: { title, description, prizeLabel, imageUrl, targetPasses },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "Drop",
        entityId: id,
        action: "drop.edit",
        requestId,
        before,
        after: { title, description, prizeLabel, imageUrl, targetPasses },
      });

      return drop;
    });

    return NextResponse.json({ drop: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      DROP_NOT_FOUND: ["Drop no encontrado.", 404],
      DROP_EDIT_LOCKED: ["Un Drop sorteado o finalizado ya no puede editarse.", 409],
      DROP_EDIT_INVALID: ["Datos del Drop inválidos.", 400],
      DROP_IMAGE_INVALID: ["La imagen debe ser una URL https o una ruta interna.", 400],
      DROP_COMMERCIAL_FIELDS_LOCKED: [
        "El premio y la meta ya no pueden cambiarse después de existir participación.",
        409,
      ],
    };
    const [message, status] = map[code] || ["No se pudo editar el Drop.", 500];
    if (status === 500) console.error("DROP_EDIT_FAILED");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const requestId = getAuditRequestId(req);

  try {
    await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Drop"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!lock[0]) throw new Error("DROP_NOT_FOUND");

      const current = await tx.drop.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              passes: true,
              bonusEntries: true,
            },
          },
          bonusCredits: {
            select: { id: true, claimedAt: true },
          },
          draw: { select: { id: true } },
        },
      });
      if (!current) throw new Error("DROP_NOT_FOUND");
      if (current.status !== "draft") throw new Error("DROP_DELETE_REQUIRES_DRAFT");

      const hasParticipation =
        current._count.passes > 0 ||
        current._count.bonusEntries > 0 ||
        current.bonusCredits.some((credit) => credit.claimedAt !== null) ||
        Boolean(current.draw);

      if (hasParticipation) throw new Error("DROP_DELETE_NOT_EMPTY");

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: auth.session.user.accountId ?? null,
        entityType: "Drop",
        entityId: id,
        action: "drop.delete",
        requestId,
        before: {
          title: current.title,
          prizeLabel: current.prizeLabel,
          targetPasses: current.targetPasses,
          status: current.status,
          unclaimedBonusCredits: current.bonusCredits.length,
        },
      });

      if (current.bonusCredits.length > 0) {
        await tx.dropBonusCredit.deleteMany({
          where: { dropId: id, claimedAt: null },
        });
      }
      await tx.drop.delete({ where: { id } });
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      DROP_NOT_FOUND: ["Drop no encontrado.", 404],
      DROP_DELETE_REQUIRES_DRAFT: ["Primero desactiva el Drop para devolverlo a borrador.", 409],
      DROP_DELETE_NOT_EMPTY: [
        "No se puede eliminar un Drop que ya tenga participación o historial.",
        409,
      ],
    };
    const [message, status] = map[code] || ["No se pudo eliminar el Drop.", 500];
    if (status === 500) console.error("DROP_DELETE_FAILED");
    return NextResponse.json({ error: message }, { status });
  }
}

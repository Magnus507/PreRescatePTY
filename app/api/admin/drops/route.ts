import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

function normalizeImageUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("DROP_IMAGE_INVALID");
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("https://")) return trimmed;
  throw new Error("DROP_IMAGE_INVALID");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const drops = await prisma.drop.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      prizeLabel: true,
      imageUrl: true,
      targetPasses: true,
      displayOrder: true,
      status: true,
      opensAt: true,
      goalReachedAt: true,
      closedAt: true,
      createdAt: true,
      _count: {
        select: {
          passes: { where: { status: "assigned" } },
          bonusEntries: { where: { revokedAt: null } },
          bonusCredits: true,
        },
      },
      bonusCredits: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          code: true,
          campaign: true,
          claimedByUserId: true,
          claimedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      },
      draw: {
        select: {
          entryCount: true,
          purchaseEntryCount: true,
          bonusEntryCount: true,
          winnerEntryCode: true,
          winnerUserId: true,
          manifestHash: true,
          randomHex: true,
          winnerIndex: true,
          drawnAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      drops: drops.map((drop) => ({
        id: drop.id,
        slug: drop.slug,
        title: drop.title,
        description: drop.description,
        prizeLabel: drop.prizeLabel,
        imageUrl: drop.imageUrl,
        targetPasses: drop.targetPasses,
        displayOrder: drop.displayOrder,
        status: drop.status,
        opensAt: drop.opensAt,
        goalReachedAt: drop.goalReachedAt,
        closedAt: drop.closedAt,
        createdAt: drop.createdAt,
        assignedPurchasePasses: drop._count.passes,
        bonusEntries: drop._count.bonusEntries,
        bonusCreditCount: drop._count.bonusCredits,
        bonusCredits: drop.bonusCredits,
        draw: drop.draw,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const prizeLabel =
    typeof body.prizeLabel === "string"
      ? body.prizeLabel.trim().slice(0, 160)
      : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 1000)
      : null;
  let imageUrl: string | null;
  try {
    imageUrl = normalizeImageUrl(body.imageUrl);
  } catch {
    return NextResponse.json(
      { error: "La imagen debe ser una URL https o una ruta interna." },
      { status: 400 }
    );
  }
  const targetPasses = Number(body.targetPasses);

  if (
    !title ||
    !prizeLabel ||
    !Number.isInteger(targetPasses) ||
    targetPasses < 1 ||
    targetPasses > 100000
  ) {
    return NextResponse.json(
      { error: "Datos del Drop inválidos." },
      { status: 400 }
    );
  }

  const slugBase = slugify(title) || "drop";
  const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;
  const requestId = getAuditRequestId(req);

  const drop = await prisma.$transaction(async (tx) => {
    const maxOrder = await tx.drop.aggregate({ _max: { displayOrder: true } });
    const displayOrder = (maxOrder._max.displayOrder ?? -10) + 10;
    const created = await tx.drop.create({
      data: {
        slug,
        title,
        prizeLabel,
        description: description || null,
        imageUrl: imageUrl || null,
        targetPasses,
        displayOrder,
      },
    });

    await writeAuditLog(tx, {
      actorUserId: auth.session.user.id,
      accountId: auth.session.user.accountId ?? null,
      entityType: "Drop",
      entityId: created.id,
      action: "drop.create",
      requestId,
      after: {
        title,
        prizeLabel,
        targetPasses,
        displayOrder: created.displayOrder,
        status: created.status,
      },
    });

    return created;
  });

  return NextResponse.json({ drop }, { status: 201 });
}


export async function PATCH(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const orderedIds = Array.isArray(body.orderedIds)
    ? body.orderedIds.filter(
        (value: unknown): value is string =>
          typeof value === "string" && Boolean(value.trim())
      )
    : [];

  if (
    orderedIds.length === 0 ||
    new Set(orderedIds).size !== orderedIds.length
  ) {
    return NextResponse.json(
      { error: "Orden de Drops inválido." },
      { status: 400 }
    );
  }

  const current = await prisma.drop.findMany({ select: { id: true } });
  const currentIds = new Set(current.map((drop) => drop.id));
  if (
    current.length !== orderedIds.length ||
    orderedIds.some((id: string) => !currentIds.has(id))
  ) {
    return NextResponse.json(
      { error: "El orden debe incluir todos los Drops existentes." },
      { status: 409 }
    );
  }

  const requestId = getAuditRequestId(req);
  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx.drop.update({
        where: { id: orderedIds[index] },
        data: { displayOrder: index * 10 },
      });
    }

    await writeAuditLog(tx, {
      actorUserId: auth.session.user.id,
      accountId: auth.session.user.accountId ?? null,
      entityType: "DropOrder",
      entityId: "global",
      action: "drop.reorder",
      requestId,
      after: { orderedIds },
    });
  });

  return NextResponse.json({ success: true, orderedIds });
}

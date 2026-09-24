import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

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
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      prizeLabel: true,
      imageUrl: true,
      targetPasses: true,
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
  const imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 500) : null;
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
    const created = await tx.drop.create({
      data: {
        slug,
        title,
        prizeLabel,
        description: description || null,
        imageUrl: imageUrl || null,
        targetPasses,
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
        status: created.status,
      },
    });

    return created;
  });

  return NextResponse.json({ drop }, { status: 201 });
}

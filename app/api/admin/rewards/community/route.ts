import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { COMMUNITY_METRICS } from "@/lib/rewards/rules";

const UNLOCK_TYPES = [
  "community_drop",
  "limited_product",
  "special_mission",
  "event",
  "platform_benefit",
] as const;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 1000) || null : null;
  const metricType = typeof body.metricType === "string" ? body.metricType : "";
  const target = Number(body.target);
  const unlockType = typeof body.unlockType === "string" ? body.unlockType : "";
  const rewardTitle =
    typeof body.rewardTitle === "string" ? body.rewardTitle.trim().slice(0, 160) : "";
  const rewardDescription =
    typeof body.rewardDescription === "string"
      ? body.rewardDescription.trim().slice(0, 1000) || null
      : null;
  const linkedDropId =
    typeof body.linkedDropId === "string" && body.linkedDropId.trim()
      ? body.linkedDropId.trim()
      : null;

  if (
    !title ||
    !COMMUNITY_METRICS.includes(metricType as (typeof COMMUNITY_METRICS)[number]) ||
    !Number.isInteger(target) ||
    target < 1 ||
    target > 10000000 ||
    !UNLOCK_TYPES.includes(unlockType as (typeof UNLOCK_TYPES)[number]) ||
    !rewardTitle
  ) {
    return NextResponse.json({ error: "Datos de Community Unlock inválidos." }, { status: 400 });
  }

  if (unlockType === "community_drop" && !linkedDropId) {
    return NextResponse.json(
      { error: "Un Community Drop necesita un Drop vinculado." },
      { status: 400 }
    );
  }

  if (linkedDropId) {
    const drop = await prisma.drop.findUnique({
      where: { id: linkedDropId },
      select: { id: true, status: true, title: true },
    });
    if (!drop) {
      return NextResponse.json({ error: "Drop vinculado no encontrado." }, { status: 404 });
    }
    if (unlockType === "community_drop" && drop.status !== "draft") {
      return NextResponse.json(
        { error: "El Drop comunitario debe estar en borrador antes de vincularlo." },
        { status: 409 }
      );
    }
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (
    (startsAt && !Number.isFinite(startsAt.getTime())) ||
    (endsAt && !Number.isFinite(endsAt.getTime())) ||
    (startsAt && endsAt && endsAt <= startsAt)
  ) {
    return NextResponse.json({ error: "Fechas de Community Unlock inválidas." }, { status: 400 });
  }

  const slug = `${slugify(title) || "community"}-${randomBytes(3).toString("hex")}`;
  const requestId = getAuditRequestId(req);

  const unlock = await prisma.$transaction(async (tx) => {
    const created = await tx.communityUnlock.create({
      data: {
        slug,
        title,
        description,
        metricType,
        target,
        unlockType,
        rewardTitle,
        rewardDescription,
        linkedDropId,
        startsAt,
        endsAt,
        createdByUserId: auth.session.user.id,
      },
    });

    await writeAuditLog(tx, {
      actorUserId: auth.session.user.id,
      accountId: auth.session.user.accountId ?? null,
      entityType: "CommunityUnlock",
      entityId: created.id,
      action: "reward.community.create",
      requestId,
      after: {
        title,
        metricType,
        target,
        unlockType,
        linkedDropId,
        status: created.status,
      },
    });

    return created;
  });

  return NextResponse.json({ unlock }, { status: 201 });
}

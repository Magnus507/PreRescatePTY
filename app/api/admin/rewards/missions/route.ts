import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { REWARD_MISSION_KINDS } from "@/lib/rewards/rules";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function normalizeImageUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("MISSION_IMAGE_INVALID");
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("https://")) return trimmed;
  throw new Error("MISSION_IMAGE_INVALID");
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 1000) || null : null;
  const kind = typeof body.kind === "string" ? body.kind : "";
  const rewardCredits = Number(body.rewardCredits);
  let imageUrl: string | null;
  try {
    imageUrl = normalizeImageUrl(body.imageUrl);
  } catch {
    return NextResponse.json({ error: "Imagen de misión inválida." }, { status: 400 });
  }

  if (
    !title ||
    !REWARD_MISSION_KINDS.includes(kind as (typeof REWARD_MISSION_KINDS)[number]) ||
    !Number.isInteger(rewardCredits) ||
    rewardCredits < 1 ||
    rewardCredits > 50
  ) {
    return NextResponse.json({ error: "Datos de misión inválidos." }, { status: 400 });
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (
    (startsAt && !Number.isFinite(startsAt.getTime())) ||
    (endsAt && !Number.isFinite(endsAt.getTime())) ||
    (startsAt && endsAt && endsAt <= startsAt)
  ) {
    return NextResponse.json({ error: "Fechas de misión inválidas." }, { status: 400 });
  }

  const slug = `${slugify(title) || "mission"}-${randomBytes(3).toString("hex")}`;
  const requestId = getAuditRequestId(req);

  const mission = await prisma.$transaction(async (tx) => {
    const created = await tx.rewardMission.create({
      data: {
        slug,
        title,
        description,
        imageUrl,
        kind,
        rewardCredits,
        startsAt,
        endsAt,
        createdByUserId: auth.session.user.id,
      },
    });

    await writeAuditLog(tx, {
      actorUserId: auth.session.user.id,
      accountId: auth.session.user.accountId ?? null,
      entityType: "RewardMission",
      entityId: created.id,
      action: "reward.mission.create",
      requestId,
      after: { title, kind, rewardCredits, status: created.status },
    });

    return created;
  });

  return NextResponse.json({ mission }, { status: 201 });
}

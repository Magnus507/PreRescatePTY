import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GENERAL_ADMIN_ROLES, requireRole } from "@/lib/rbac";
import { getAuditRequestId, writeAuditLog } from "@/lib/audit";
import { assignDropPassToDrop } from "@/lib/drops/service";
import { spendRewardCredit } from "@/lib/rewards/service";

export const dynamic = "force-dynamic";

function passCode() {
  return `DP-${randomBytes(8).toString("hex").toUpperCase()}`;
}

async function findUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, accountId: true },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const email = (req.nextUrl.searchParams.get("email") || "")
    .trim()
    .toLowerCase();

  const drops = await prisma.drop.findMany({
    where: {
      status: { in: ["active", "goal_reached", "closed", "drawn", "finalized"] },
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      prizeLabel: true,
      status: true,
      targetPasses: true,
    },
  });

  if (!email) {
    return NextResponse.json(
      { user: null, drops },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const user = await findUser(email);
  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [passes, creditAggregate, ledger, allocations] = await Promise.all([
    prisma.dropPass.findMany({
      where: { userId: user.id, status: { in: ["available", "assigned"] } },
      orderBy: { earnedAt: "desc" },
      take: 50,
      select: {
        id: true,
        code: true,
        status: true,
        earnedAt: true,
        assignedAt: true,
        drop: { select: { id: true, title: true, prizeLabel: true } },
      },
    }),
    prisma.rewardCreditLedger.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
    prisma.rewardCreditLedger.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        amount: true,
        sourceType: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.drop.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        prizeLabel: true,
        status: true,
        _count: {
          select: {
            passes: {
              where: { userId: user.id, status: "assigned" },
            },
            bonusEntries: {
              where: { userId: user.id, revokedAt: null },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        availablePassCount: passes.filter((row) => row.status === "available")
          .length,
        bonusCreditBalance: creditAggregate._sum.amount ?? 0,
      },
      passes,
      ledger,
      allocations: allocations.map((drop) => ({
        id: drop.id,
        title: drop.title,
        prizeLabel: drop.prizeLabel,
        status: drop.status,
        assignedPasses: drop._count.passes,
        assignedBonusEntries: drop._count.bonusEntries,
      })),
      drops,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const count = Number(body.count ?? 1);
  const dropId = typeof body.dropId === "string" ? body.dropId.trim() : "";
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 300)
      : "Corrección administrativa";
  const requestId = getAuditRequestId(req);

  if (!email) {
    return NextResponse.json({ error: "Correo requerido." }, { status: 400 });
  }
  const user = await findUser(email);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (action === "grant_pass") {
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return NextResponse.json({ error: "Cantidad inválida." }, { status: 400 });
    }

    const batch = `admin:${randomUUID()}`;
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.dropPass.createMany({
        data: Array.from({ length: count }, (_, index) => ({
          code: passCode(),
          userId: user.id,
          sourceOrderId: batch,
          sourceOrdinal: index + 1,
          earnedAt: new Date(),
        })),
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: user.accountId,
        entityType: "DropPass",
        entityId: batch,
        action: "drop.pass_admin_grant",
        requestId,
        after: { userId: user.id, count: created.count, reason },
      });
      return created;
    });

    return NextResponse.json({ action, created: result.count });
  }

  if (action === "grant_credit") {
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return NextResponse.json({ error: "Cantidad inválida." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${`reward-credit:${user.id}`}))
      `;

      await tx.rewardCreditLedger.create({
        data: {
          userId: user.id,
          amount: count,
          sourceKey: `admin-grant:${randomUUID()}`,
          sourceType: "admin_grant",
          description: reason,
          createdByUserId: auth.session.user.id,
        },
      });

      const balance = await tx.rewardCreditLedger.aggregate({
        where: { userId: user.id },
        _sum: { amount: true },
      });

      await writeAuditLog(tx, {
        actorUserId: auth.session.user.id,
        accountId: user.accountId,
        entityType: "RewardCreditLedger",
        entityId: user.id,
        action: "drop.bonus_credit_admin_grant",
        requestId,
        after: { userId: user.id, count, reason, balance: balance._sum.amount ?? 0 },
      });

      return balance._sum.amount ?? 0;
    });

    return NextResponse.json({ action, balance: result });
  }

  if (action === "assign_pass") {
    if (!dropId) {
      return NextResponse.json({ error: "Drop requerido." }, { status: 400 });
    }
    const pass = await prisma.dropPass.findFirst({
      where: { userId: user.id, status: "available", dropId: null },
      orderBy: { earnedAt: "asc" },
      select: { id: true, code: true },
    });
    if (!pass) {
      return NextResponse.json(
        { error: "El usuario no tiene Drop Pass disponibles." },
        { status: 409 }
      );
    }

    try {
      const result = await assignDropPassToDrop(user.id, pass.id, dropId);
      await writeAuditLog(prisma, {
        actorUserId: auth.session.user.id,
        accountId: user.accountId,
        entityType: "DropPass",
        entityId: pass.id,
        action: "drop.pass_admin_assign",
        requestId,
        after: { userId: user.id, dropId, code: pass.code },
      });
      return NextResponse.json({ action, pass, result });
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      const map: Record<string, [string, number]> = {
        DROP_NOT_FOUND: ["Drop no encontrado.", 404],
        DROP_NOT_OPEN: ["Ese Drop no está abierto.", 409],
        DROP_GOAL_REACHED: ["Ese Drop ya alcanzó la meta.", 409],
        DROP_PASS_NOT_AVAILABLE: ["Ese pase ya no está disponible.", 409],
      };
      const [message, status] = map[key] || ["No se pudo asignar el Drop Pass.", 500];
      return NextResponse.json({ error: message }, { status });
    }
  }

  if (action === "assign_credit") {
    if (!dropId) {
      return NextResponse.json({ error: "Drop requerido." }, { status: 400 });
    }

    try {
      const result = await spendRewardCredit(
        user.id,
        dropId,
        auth.session.user.id,
        `Asignación administrativa · ${reason}`
      );
      await writeAuditLog(prisma, {
        actorUserId: auth.session.user.id,
        accountId: user.accountId,
        entityType: "RewardCreditLedger",
        entityId: result.entry.id,
        action: "drop.bonus_credit_admin_assign",
        requestId,
        after: {
          userId: user.id,
          dropId,
          entryCode: result.entry.code,
          balance: result.balance,
          reason,
        },
      });
      return NextResponse.json({ action, ...result });
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      const map: Record<string, [string, number]> = {
        DROP_NOT_FOUND: ["Drop no encontrado.", 404],
        DROP_NOT_OPEN: ["Ese Drop no está abierto.", 409],
        REWARD_CREDIT_INSUFFICIENT: [
          "El usuario no tiene Bonus Credits disponibles.",
          409,
        ],
      };
      const [message, status] =
        map[key] || ["No se pudo asignar el Bonus Credit.", 500];
      return NextResponse.json({ error: message }, { status });
    }
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}

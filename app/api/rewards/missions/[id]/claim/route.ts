import { NextRequest, NextResponse } from "next/server";
import { requireFreshSession } from "@/lib/rbac";
import { claimMission } from "@/lib/rewards/service";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const ip = getClientIp(req, `mission-claim:${auth.session.user.id}`);
  const limiter = await rateLimit(
    "reward-mission-claim",
    `${auth.session.user.id}:${ip}`,
    { limit: 30, windowMs: 15 * 60_000 }
  );
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta nuevamente más tarde." },
      { status: 429 }
    );
  }

  try {
    const result = await claimMission(auth.session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      MISSION_NOT_FOUND: ["Misión no encontrada.", 404],
      MISSION_NOT_ACTIVE: ["Esta misión no está disponible.", 409],
      MISSION_ALREADY_COMPLETED: ["Ya completaste esta misión.", 409],
      MISSION_NOT_ELIGIBLE: ["Todavía no cumples los requisitos de esta misión.", 409],
    };
    const [message, status] = map[key] || ["No se pudo reclamar la misión.", 500];
    if (status === 500) console.error("REWARD_MISSION_CLAIM_FAILED", error);
    return NextResponse.json({ error: message }, { status });
  }
}

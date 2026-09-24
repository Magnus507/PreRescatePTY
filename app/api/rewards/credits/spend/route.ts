import { NextRequest, NextResponse } from "next/server";
import { requireFreshSession } from "@/lib/rbac";
import { spendRewardCredit } from "@/lib/rewards/service";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req, `reward-spend:${auth.session.user.id}`);
  const limiter = await rateLimit(
    "reward-credit-spend",
    `${auth.session.user.id}:${ip}`,
    { limit: 30, windowMs: 15 * 60_000 }
  );
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta nuevamente más tarde." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const dropId = typeof body.dropId === "string" ? body.dropId.trim() : "";
  if (!dropId) {
    return NextResponse.json({ error: "Selecciona un Drop." }, { status: 400 });
  }

  try {
    const result = await spendRewardCredit(auth.session.user.id, dropId);
    return NextResponse.json(result);
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      DROP_NOT_FOUND: ["Drop no encontrado.", 404],
      DROP_NOT_OPEN: ["Ese Drop ya no está abierto.", 409],
      REWARD_CREDIT_INSUFFICIENT: ["No tienes Bonus Credits disponibles.", 409],
    };
    const [message, status] = map[key] || ["No se pudo usar el Bonus Credit.", 500];
    if (status === 500) console.error("REWARD_CREDIT_SPEND_FAILED", error);
    return NextResponse.json({ error: message }, { status });
  }
}

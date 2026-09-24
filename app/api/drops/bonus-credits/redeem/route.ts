import { NextRequest, NextResponse } from "next/server";
import { requireFreshSession } from "@/lib/rbac";
import { redeemBonusCredit } from "@/lib/drops/bonus-credits";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req, `bonus-credit:${auth.session.user.id}`);
  const limiter = await rateLimit(
    "bonus-credit-redeem",
    `${auth.session.user.id}:${ip}`,
    { limit: 20, windowMs: 15 * 60_000 }
  );
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta nuevamente más tarde." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ error: "Ingresa un Bonus Credit." }, { status: 400 });
  }

  try {
    const result = await redeemBonusCredit(auth.session.user.id, code);
    return NextResponse.json(result);
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      BONUS_CREDIT_INVALID: ["El formato del Bonus Credit no es válido.", 400],
      BONUS_CREDIT_NOT_FOUND: ["Ese Bonus Credit no existe.", 404],
      BONUS_CREDIT_REVOKED: ["Ese Bonus Credit fue revocado.", 409],
      BONUS_CREDIT_ALREADY_CLAIMED: ["Ese Bonus Credit ya fue reclamado.", 409],
      BONUS_CREDIT_DROP_CLOSED: ["Ese Bonus Credit ya no puede reclamarse porque el Drop no está activo.", 409],
      DROP_NOT_FOUND: ["El Drop asociado ya no existe.", 404],
    };
    const [message, status] = map[key] || ["No se pudo reclamar el Bonus Credit.", 500];
    if (status === 500) console.error("BONUS_CREDIT_REDEEM_FAILED");
    return NextResponse.json({ error: message }, { status });
  }
}

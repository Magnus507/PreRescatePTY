import { NextRequest, NextResponse } from "next/server";
import { requireFreshSession } from "@/lib/rbac";
import { redeemDropPassGrantCode } from "@/lib/drops/pass-grant-codes";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";

export async function POST(req: NextRequest) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const ip = getClientIp(req, `drop-pass-grant:${auth.session.user.id}`);
  const limiter = await rateLimit(
    "drop-pass-grant-redeem",
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
    return NextResponse.json(
      { error: "Ingresa un código especial de Drop Pass." },
      { status: 400 }
    );
  }

  try {
    const result = await redeemDropPassGrantCode(auth.session.user.id, code);
    return NextResponse.json(result);
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      DROP_PASS_GRANT_CODE_INVALID: ["El formato del código no es válido.", 400],
      DROP_PASS_GRANT_CODE_NOT_FOUND: ["Ese código no existe.", 404],
      DROP_PASS_GRANT_CODE_REVOKED: ["Ese código fue revocado.", 409],
      DROP_PASS_GRANT_CODE_ALREADY_CLAIMED: ["Ese código ya fue utilizado.", 409],
    };
    const [message, status] =
      map[key] || ["No se pudo reclamar el Drop Pass.", 500];
    if (status === 500) console.error("DROP_PASS_GRANT_REDEEM_FAILED");
    return NextResponse.json({ error: message }, { status });
  }
}

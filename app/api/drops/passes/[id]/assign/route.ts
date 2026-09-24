import { NextRequest, NextResponse } from "next/server";
import { requireFreshSession } from "@/lib/rbac";
import { assignDropPassToDrop } from "@/lib/drops/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const dropId = typeof body.dropId === "string" ? body.dropId.trim() : "";

  if (!dropId) {
    return NextResponse.json({ error: "Drop requerido." }, { status: 400 });
  }

  try {
    const result = await assignDropPassToDrop(
      auth.session.user.id,
      id,
      dropId
    );
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const map: Record<string, [string, number]> = {
      DROP_NOT_FOUND: ["Drop no encontrado.", 404],
      DROP_NOT_OPEN: ["Este Drop ya no acepta pases.", 409],
      DROP_GOAL_REACHED: ["La meta de este Drop ya fue alcanzada.", 409],
      DROP_PASS_NOT_AVAILABLE: ["Este pase ya no está disponible.", 409],
    };
    const [message, status] =
      map[code] || ["No se pudo asignar el pase.", 500];

    if (status === 500) console.error("DROP_PASS_ASSIGN_FAILED");
    return NextResponse.json({ error: message }, { status });
  }
}

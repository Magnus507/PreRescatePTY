import { NextResponse } from "next/server";
import { requireFreshSession } from "@/lib/rbac";
import { getUserDropsSnapshot } from "@/lib/drops/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  try {
    const snapshot = await getUserDropsSnapshot(auth.session.user.id);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("DROP_SNAPSHOT_FAILED");
    return NextResponse.json(
      { error: "No se pudieron cargar los Drops." },
      { status: 500 }
    );
  }
}

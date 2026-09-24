import { NextResponse } from "next/server";
import { requireFreshSession } from "@/lib/rbac";
import { getRewardsSnapshot } from "@/lib/rewards/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireFreshSession();
  if (!auth.authorized) return auth.response;

  try {
    const snapshot = await getRewardsSnapshot(auth.session.user.id);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("REWARDS_SNAPSHOT_FAILED", error);
    return NextResponse.json(
      { error: "No se pudieron cargar tus Rewards." },
      { status: 500 }
    );
  }
}

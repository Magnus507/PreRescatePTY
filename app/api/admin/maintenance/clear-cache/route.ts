import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redis, isRedisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    if (redis && isRedisConfigured()) {
      // Flush all keys (or specific patterns)
      // Since it's Upstash, we can use flushdb or keys + del
      await redis.flushdb();
      return NextResponse.json({ success: true, message: "Caché del sistema purgada con éxito." });
    } else {
      return NextResponse.json({ success: true, message: "Redis no configurado, nada que purgar." });
    }
  } catch (error) {
    console.error("[Maintenance] Clear Cache Error:", error);
    return NextResponse.json(
      { error: "Error al purgar la caché" },
      { status: 500 }
    );
  }
}

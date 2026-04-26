import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminStatsService } from "@/domains/admin/services/admin-stats.service";
import { redis, isRedisConfigured } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === "admin" || role === "superadmin";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const CACHE_KEY = "admin_stats_v1";
    const CACHE_TTL = 60; // 60 seconds

    // Try to get from cache first
    if (isRedisConfigured()) {
      try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          return NextResponse.json(cached);
        }
      } catch (e) {
        console.error("[Admin Stats] Cache fetch error:", e);
        // Fall through to fresh fetch if cache fails
      }
    }

    // Fetch fresh stats if not cached
    const stats = await AdminStatsService.getDashboardStats();

    const response = {
      stats: {
        totalUsers: stats.totalUsers,
        totalChips: stats.totalChips,
        totalProfiles: stats.totalProfiles,
        totalScans: stats.totalScans,
        totalNotifications: stats.totalNotifications,
        chipsByStatus: stats.chipsByStatus,
        chipsByService: stats.chipsByService,
        productivity: stats.productivity,
      },
      recentScans: stats.recentScans,
      recentUsers: stats.recentUsers,
      recentOrgs: stats.recentOrgs,
    };

    // Cache the response
    if (isRedisConfigured()) {
      try {
        await redis.set(CACHE_KEY, response, { ex: CACHE_TTL });
      } catch (e) {
        console.error("[Admin Stats] Cache set error:", e);
        // Still return response even if cache fails
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Admin Stats API Error:", error);
    return NextResponse.json(
      { error: "Error al cargar estadísticas administrativas" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { AdminStatsService } from "@/domains/admin/services/admin-stats.service";
import { redis, isRedisConfigured } from "@/lib/redis";
import { requireRole, GENERAL_ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireRole(GENERAL_ADMIN_ROLES);
  if (!auth.authorized) return auth.response;

  try {
    const CACHE_KEY = "admin_stats_v1";
    const CACHE_TTL = 60; // 60 seconds

    // Try to get from cache first
    if (redis && isRedisConfigured()) {
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
        storageUsage: stats.storageUsage,
        alerts: stats.alerts,
        ecosystem: stats.ecosystem,
        commerce: stats.commerce,
        corporate: stats.corporate,
        movement: stats.movement,
      },
      recentScans: stats.recentScans,
      recentUsers: stats.recentUsers,
      recentOrgs: stats.recentOrgs,
    };

    // Cache the response
    if (redis && isRedisConfigured()) {
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

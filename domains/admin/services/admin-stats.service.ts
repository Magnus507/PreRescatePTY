import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface DashboardAlert {
  id: string;
  type: "info" | "warning" | "critical";
  category: "storage" | "orders" | "hardware" | "security";
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalChips: number;
  totalProfiles: number;
  totalScans: number;
  totalNotifications: number;
  chipsByStatus: {
    activated: number;
    inventory: number;
    suspended: number;
    sold: number;
  };
  chipsByService: {
    active: number;
    limited: number;
  };
  recentScans: unknown[]; // Type inferred from Prisma query
  recentUsers: { id: string; email: string; createdAt: Date; status: string }[];
  recentOrgs: { id: string; legalName: string; createdAt: Date; status: string }[];
  productivity: {
    pendingOrders: number;
    usersWithoutChips: number;
    newUsersToday: number;
    inactiveActivatedChips: number;
  };
  storageUsage: {
    usedBytes: number;
    totalBytes: number;
    percentage: number;
  };
  alerts: DashboardAlert[];
  // ─── Dashboard v2: Centro de Control Ejecutivo ─────────────────────────
  ecosystem: {
    usersActive: number;
    usersBlocked: number;
    profilesCorporate: number;
    profilesWithoutChip: number;
    organizationsTotal: number;
  };
  commerce: {
    paymentsUnderReview: number;
    ordersProcessing: number;
    ordersShipped: number;
    ordersCompleted: number;
    ordersToday: number;
    ordersThisMonth: number;
  };
  corporate: {
    organizationsTotal: number;
    organizationsActive: number;
    pendingRequests: number;
    activeMembers: number;
  };
  movement: {
    newUsersToday: number;
    activationsThisMonth: number;
  };
}

export class AdminStatsService {
  /**
   * Retrieves all consolidated statistics for the admin overview.
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, 
      totalChips, 
      totalProfiles, 
      totalScans, 
      totalNotifications,
      activatedChips, 
      inventoryChips, 
      suspendedChips, 
      soldChips,
      activeService, 
      limitedService,
      recentScans,
      recentUsers,
      recentOrgs,
      pendingOrders,
      usersWithoutChips,
      newUsersToday,
      inactiveActivatedChips,
      storageRaw,
      // ─── Dashboard v2 queries ──────────────────────────────────────────
      usersActive,
      usersBlocked,
      profilesCorporate,
      profilesWithoutChip,
      organizationsTotal,
      paymentsUnderReview,
      ordersProcessing,
      ordersShipped,
      ordersCompleted,
      ordersToday,
      ordersThisMonth,
      organizationsActive,
      pendingRequests,
      activeMembers,
      activationsThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.chip.count(),
      prisma.profile.count(),
      prisma.scanEvent.count(),
      prisma.notification.count(),
      prisma.chip.count({ where: { status: "activated" } }),
      prisma.chip.count({ where: { status: "inventory" } }),
      prisma.chip.count({ where: { status: "suspended" } }),
      prisma.chip.count({ where: { status: "sold" } }),
      prisma.chip.count({ where: { serviceStatus: "active", status: "activated" } }),
      prisma.chip.count({ where: { serviceStatus: "limited" } }),
      prisma.scanEvent.findMany({
        orderBy: { scannedAt: "desc" },
        take: 10,
        include: {
          chip: {
            select: { shortCode: true, serialPublic: true },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, email: true, createdAt: true, status: true }
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, legalName: true, createdAt: true, status: true }
      }),
      prisma.order.count({ where: { orderStatus: "pending" } }),
      prisma.user.count({
        where: {
          role: "user",
          chips: { none: {} }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfToday }
        }
      }),
      prisma.chip.count({
        where: {
          status: "activated",
          assignedProfileId: null
        }
      }),
      // Query storage directly via postgres storage schema (metadata->'size' is typically bigint)
      prisma.$queryRawUnsafe<{ total: string }[]>(`
        SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) as total 
        FROM storage.objects 
        WHERE bucket_id IN ('profile-photos', 'payment-proofs')
      `).catch(err => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error("Storage query error (likely permission or schema):", errorMessage);
        return [{ total: "0" }];
      }),
      // ─── Dashboard v2: Ecosystem ──────────────────────────────────────
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { status: "blocked" } }),
      prisma.profile.count({ where: { profileType: "corporate" } }),
      prisma.profile.count({
        where: {
          assignedChips: { none: {} }
        }
      }),
      prisma.organization.count(),
      // ─── Dashboard v2: Commerce ───────────────────────────────────────
      prisma.order.count({ where: { paymentStatus: "under_review" } }),
      prisma.order.count({ where: { orderStatus: "processing" } }),
      prisma.order.count({ where: { orderStatus: "shipped" } }),
      prisma.order.count({ where: { orderStatus: "completed" } }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      // ─── Dashboard v2: Corporate ──────────────────────────────────────
      prisma.organization.count({ where: { status: "active" } }),
      prisma.organizationMember.count({ where: { corporateStatus: "pending_company_review" } }),
      prisma.organizationMember.count({ where: { corporateStatus: "active" } }),
      // ─── Dashboard v2: Movement ───────────────────────────────────────
      prisma.chip.count({ where: { activatedAt: { gte: startOfMonth } } }),
    ]);

    const usedBytes = Number(storageRaw[0]?.total || 0);
    const totalBytes = 1000 * 1000 * 1000; // 1GB (Supabase Free Tier)
    const percentage = Math.round((usedBytes / totalBytes) * 100);

    const stats: AdminDashboardStats = {
      totalUsers,
      totalChips,
      totalProfiles,
      totalScans,
      totalNotifications,
      chipsByStatus: {
        activated: activatedChips,
        inventory: inventoryChips,
        suspended: suspendedChips,
        sold: soldChips,
      },
      chipsByService: {
        active: activeService,
        limited: limitedService,
      },
      recentScans,
      recentUsers,
      recentOrgs,
      productivity: {
        pendingOrders,
        usersWithoutChips,
        newUsersToday,
        inactiveActivatedChips
      },
      storageUsage: {
        usedBytes,
        totalBytes,
        percentage
      },
      alerts: [], // We will populate this below
      // ─── Dashboard v2: Centro de Control Ejecutivo ────────────────────
      ecosystem: {
        usersActive,
        usersBlocked,
        profilesCorporate,
        profilesWithoutChip,
        organizationsTotal,
      },
      commerce: {
        paymentsUnderReview,
        ordersProcessing,
        ordersShipped,
        ordersCompleted,
        ordersToday,
        ordersThisMonth,
      },
      corporate: {
        organizationsTotal,
        organizationsActive,
        pendingRequests,
        activeMembers,
      },
      movement: {
        newUsersToday,
        activationsThisMonth,
      },
    };

    // Alert engine removed — alerts are now computed in the DashboardSection UI
    return stats;
  }
}

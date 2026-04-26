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
}

export class AdminStatsService {
  /**
   * Retrieves all consolidated statistics for the admin overview.
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
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
          createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
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
      })
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
      alerts: [] // We will populate this below
    };

    // ─── Alert Engine ────────────────────────────────────────────────────────
    const alerts: DashboardAlert[] = [];

    if (percentage > 80) {
      alerts.push({
        id: "storage-limit",
        type: percentage > 95 ? "critical" : "warning",
        category: "storage",
        title: "Almacenamiento Crítico",
        message: `El sistema ha superado el ${percentage}% de su capacidad (Plan Gratuito). Peligro de interrupción de carga de imágenes.`,
        actionLabel: "Ver Limpieza",
        actionUrl: "?tab=governance"
      });
    }

    if (pendingOrders > 0) {
      alerts.push({
        id: "pending-orders",
        type: "warning",
        category: "orders",
        title: "Pedidos Pendientes",
        message: `Hay ${pendingOrders} pedidos esperando validación de pago. Los clientes esperan sus códigos.`,
        actionLabel: "Validar ahora",
        actionUrl: "?tab=pedidos"
      });
    }

    if (inactiveActivatedChips > 0) {
      alerts.push({
        id: "orphan-chips",
        type: "info",
        category: "hardware",
        title: "Chips sin Perfil",
        message: `Hay ${inactiveActivatedChips} chips activados que aún no tienen un perfil médico asociado.`,
        actionLabel: "Ver Listado",
        actionUrl: "?tab=chips"
      });
    }

    stats.alerts = alerts;
    return stats;
  }
}

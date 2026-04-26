import { useState, useCallback } from "react";
import { statsService } from "../_services/domains/stats.service";
import { AdminStats, ScanEvent, UserAdmin, OrganizationAdmin } from "../_types/admin";
import { toast } from "sonner";

export function useAdminStats() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserAdmin[]>([]);
  const [recentOrgs, setRecentOrgs] = useState<OrganizationAdmin[]>([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statsService.getDashboardStats();
      setStats(data.stats);
      setRecentScans(data.recentScans);
      setRecentUsers(data.recentUsers);
      setRecentOrgs(data.recentOrgs);
    } catch (e: any) {
      toast.error(e.message || "Error al cargar estadísticas del sistema");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    stats,
    recentScans,
    recentUsers,
    recentOrgs,
    loadStats
  };
}

import { adminClient } from "../apiClient";
import { DashboardStats } from "../../_types/admin";

export const statsService = {
  async getDashboardStats() {
    return adminClient.get<DashboardStats>("/api/admin/stats");
  }
};

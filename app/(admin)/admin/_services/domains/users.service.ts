import { adminClient } from "../apiClient";
import { UserAdmin, AdminAccount } from "../../_types/admin";

export const usersService = {
  async getUsers(params: { limit?: number; search?: string }, signal?: AbortSignal) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleanParams as any).toString();
    return adminClient.get<{ users: UserAdmin[]; total: number }>(`/api/admin/users?${query}`, { signal });
  },

  async runUserAction(userId: string, action: string, data: any) {
    return adminClient.post<{ message: string }>(`/api/admin/users/${userId}/actions`, { action, data });
  },

  async updateUserStatus(userId: string, status: string) {
    return adminClient.patch(`/api/admin/users/${userId}/status`, { status });
  },

  async getAdminAccounts(signal?: AbortSignal) {
    return adminClient.get<{ admins: AdminAccount[] }>("/api/admin/admins", { signal });
  },

  async createAdmin(data: any) {
    return adminClient.post<{ admin: AdminAccount }>("/api/admin/admins", data);
  },

  async updateAdmin(id: string, data: { role?: string; status?: string }) {
    return adminClient.patch<{ admin: AdminAccount }>(`/api/admin/admins/${id}`, data);
  },

  async deleteAdmin(id: string) {
    return adminClient.delete<{ message: string }>(`/api/admin/admins/${id}`);
  }
};

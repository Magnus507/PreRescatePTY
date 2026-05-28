import { adminClient } from "../apiClient";
import { ChipAdmin, ChipDetail } from "../../_types/admin";

export const chipsService = {
  async getChips(params: { 
    limit?: number; 
    status?: string; 
    serviceStatus?: string; 
    search?: string; 
    accountId?: string;
    excludeStatus?: string;
    view?: "available" | "reserved" | "activated" | "returned" | "damaged";
  }, signal?: AbortSignal) {
    // Sanitize params to remove undefined/null/empty values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleanParams as any).toString();
    return adminClient.get<{
      chips: ChipAdmin[];
      items?: ChipAdmin[];
      total: number;
      page?: number;
      limit?: number;
      view?: string | null;
    }>(`/api/admin/chips?${query}`, { signal });
  },

  async getChipDetail(id: string, signal?: AbortSignal) {
    return adminClient.get<{ chip: ChipDetail }>(`/api/admin/chips/${id}`, { signal });
  },

  async reactivateChip(id: string) {
    return adminClient.post<{ chip: ChipAdmin }>(`/api/admin/chips/${id}/reactivate`);
  },

  async deleteChip(id: string) {
    return adminClient.patch(`/api/admin/chips/${id}`, { delete: true });
  },

  async createBatch(count: number, labelBase?: string, labelStart?: number) {
    return adminClient.post<{ chips: ChipAdmin[] }>("/api/admin/chips", { count, labelBase, labelStart });
  },

  async updatePhysicalStatus(id: string, isPhysical: boolean) {
    return adminClient.patch<{ chip: ChipAdmin }>(`/api/admin/chips/${id}`, { isPhysical });
  },

  async rehabilitateChip(id: string) {
    return adminClient.post<{ message: string; chip: ChipAdmin; token: { activationCode: string; expiresAt: string } }>(
      `/api/admin/chips/${id}/rehabilitate`
    );
  }
};

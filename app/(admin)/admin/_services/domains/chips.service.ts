import { adminClient } from "../apiClient";
import { ChipAdmin, ChipDetail } from "../../_types/admin";

export interface PointOfSaleOption {
  id: string;
  name: string;
  address?: string | null;
  isActive?: boolean;
  _count?: { chips: number };
}

export const chipsService = {
  async getChips(params: { 
    limit?: number; 
    status?: string; 
    serviceStatus?: string; 
    search?: string; 
    accountId?: string;
    excludeStatus?: string;
    view?: "available" | "reserved" | "activated" | "returned" | "damaged" | "pointOfSale";
    pointOfSaleId?: string;
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

  async getPointsOfSale() {
    return adminClient.get<{ points: PointOfSaleOption[] }>("/api/admin/points-of-sale?isActive=true");
  },

  async consignToPointOfSale(pointOfSaleId: string, chipIds: string[]) {
    return adminClient.post<{ ok: boolean; consigned: number; pointOfSale: { id: string; name: string }; chipIds: string[] }>(
      `/api/admin/points-of-sale/${pointOfSaleId}/consign`,
      { chipIds }
    );
  },

  async returnFromPointOfSale(pointOfSaleId: string, chipIds: string[]) {
    return adminClient.post<{ ok: boolean; returned: number; pointOfSale: { id: string; name: string }; chipIds: string[] }>(
      `/api/admin/points-of-sale/${pointOfSaleId}/return`,
      { chipIds }
    );
  },

  async markLostFromPointOfSale(pointOfSaleId: string, chipIds: string[], reason?: string) {
    return adminClient.post<{ ok: boolean; lost: number; pointOfSale: { id: string; name: string }; chipIds: string[] }>(
      `/api/admin/points-of-sale/${pointOfSaleId}/mark-lost`,
      { chipIds, reason }
    );
  },

  async rehabilitateChip(id: string) {
    return adminClient.post<{ message: string; chip: ChipAdmin; token: { activationCode: string; expiresAt: string } }>(
      `/api/admin/chips/${id}/rehabilitate`
    );
  },

  async assignDirect(
    chipId: string,
    payload: {
      targetUserId: string;
      targetProfileId: string;
      reason: "replacement" | "courtesy" | "warranty" | "internal_test" | "same_customer_reassign";
      notes?: string;
      capacityMode: "deny_if_no_capacity" | "consume_existing" | "grant_exception";
      autoActivate: false;
    }
  ) {
    return adminClient.post<{
      message: string;
      chip: { id: string; shortCode: string; status: string };
      order: { id: string; orderNumber: string };
      token: { activationCode: string; expiresAt: string };
      capacity: { maxChipsAllocated: number; maxProfilesAllocated: number };
    }>(`/api/admin/chips/${chipId}/assign-direct`, payload);
  }
};

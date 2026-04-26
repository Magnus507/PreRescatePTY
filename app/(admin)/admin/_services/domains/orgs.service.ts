import { adminClient } from "../apiClient";
import { OrganizationAdmin, UserAdmin } from "../../_types/admin";

export const orgsService = {
  async getOrganizations(signal?: AbortSignal) {
    return adminClient.get<{ organizations: OrganizationAdmin[] }>("/api/admin/organizations", { signal });
  },

  async getOrgDetail(id: string, signal?: AbortSignal) {
    return adminClient.get<{ organization: OrganizationAdmin }>(`/api/admin/organizations/${id}`, { signal });
  },

  async createOrganization(data: any) {
    return adminClient.post<{ organization: OrganizationAdmin }>("/api/admin/organizations", data);
  },

  async deleteOrganization(id: string) {
    return adminClient.delete<{ message: string }>(`/api/admin/organizations/${id}`);
  },

  async assignChipsBulk(orgId: string, count: number) {
    return adminClient.post<{ message: string }>(`/api/admin/organizations/${orgId}/assign-bulk`, { count });
  },

  async assignChipByShortCode(orgId: string, shortCode: string) {
    return adminClient.post<{ message: string }>(`/api/admin/organizations/${orgId}/assign-chip`, { shortCode });
  },

  async addMember(orgId: string, data: any) {
    return adminClient.post<{ user: UserAdmin }>(`/api/admin/organizations/${orgId}/users`, data);
  },

  // Metadata
  async getPackages(signal?: AbortSignal) {
    return adminClient.get<{ packages: any[] }>("/api/admin/packages", { signal });
  }
};

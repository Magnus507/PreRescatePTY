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

  async addMember(orgId: string, data: any) {
    return adminClient.post<{ user: UserAdmin }>(`/api/admin/organizations/${orgId}/users`, data);
  },

  async updateOrganization(orgId: string, data: any) {
    return adminClient.patch<{ organization: OrganizationAdmin }>(`/api/admin/organizations/${orgId}`, data);
  },

  // Metadata
  async getPackages(signal?: AbortSignal) {
    return adminClient.get<{ packages: any[] }>("/api/admin/packages", { signal });
  }
};

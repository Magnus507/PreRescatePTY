import { adminClient } from "../apiClient";
import { OrganizationAdmin, UserAdmin } from "../../_types/admin";
import type { OrgEditPayload } from "../../_components/modals/OrgEditModal";

export const orgsService = {
  async getOrganizations(signal?: AbortSignal) {
    return adminClient.get<{ organizations: OrganizationAdmin[] }>("/api/admin/organizations", { signal });
  },

  async getOrgDetail(id: string, signal?: AbortSignal) {
    return adminClient.get<{ organization: OrganizationAdmin }>(`/api/admin/organizations/${id}`, { signal });
  },

  async createOrganization(data: unknown) {
    return adminClient.post<{ organization: OrganizationAdmin }>("/api/admin/organizations", data);
  },

  async deleteOrganization(id: string) {
    return adminClient.delete<{ message: string }>(`/api/admin/organizations/${id}`);
  },

  async addMember(orgId: string, data: unknown) {
    return adminClient.post<{ user: UserAdmin }>(`/api/admin/organizations/${orgId}/users`, data);
  },

  async updateOrganization(orgId: string, data: OrgEditPayload) {
    return adminClient.patch<{ organization: OrganizationAdmin }>(`/api/admin/organizations/${orgId}`, data);
  },

  // Metadata
  async getPackages(signal?: AbortSignal) {
    return adminClient.get<{ packages: Record<string, unknown>[] }>("/api/admin/packages", { signal });
  }
};

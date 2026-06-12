import { useState, useCallback, useRef, useEffect } from "react";
import { orgsService } from "../_services/domains/orgs.service";
import { OrganizationAdmin } from "../_types/admin";
import type { OrgEditPayload } from "../_components/modals/OrgEditModal";
import { toast } from "sonner";

export function useAdminOrgs() {
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);

  const [organizations, setOrganizations] = useState<OrganizationAdmin[]>([]);
  const [, setOrgsLoadedAt] = useState<number | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationAdmin | null>(null);
  const [packages, setPackages] = useState<unknown[]>([]);
  
  // Abort Controllers
  const listAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const packageAbort = useRef<AbortController | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      listAbort.current?.abort();
      detailAbort.current?.abort();
      packageAbort.current?.abort();
    };
  }, []);

  const loadOrganizations = useCallback(async () => {
    if (listAbort.current) listAbort.current.abort();
    listAbort.current = new AbortController();

    setLoadingList(true);
    try {
      const data = await orgsService.getOrganizations(listAbort.current.signal);
      setOrganizations(data.organizations);
      setOrgsLoadedAt(Date.now()); // Track when data was loaded
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error(error instanceof Error ? error.message : "Error al cargar organizaciones");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadOrgDetail = useCallback(async (id: string) => {
    if (detailAbort.current) detailAbort.current.abort();
    detailAbort.current = new AbortController();
    
    setLoadingDetail(true);
    try {
      const data = await orgsService.getOrgDetail(id, detailAbort.current.signal);
      setSelectedOrg(data.organization);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el detalle de la empresa");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    if (packageAbort.current) packageAbort.current.abort();
    packageAbort.current = new AbortController();
    
    try {
      const data = await orgsService.getPackages(packageAbort.current.signal);
      setPackages(data.packages);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error loading packages:", error);
    }
  }, []);

  const createOrg = useCallback(async (orgData: Record<string, unknown>) => {
    setCreating(true);
    try {
      await orgsService.createOrganization(orgData);
      toast.success("Organización creada exitosamente");
      setOrgsLoadedAt(null); // Force reload
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al crear organización");
      return false;
    } finally {
      setCreating(false);
    }
  }, []);

  const deleteOrg = useCallback(async (id: string, name: string) => {
    if (!confirm(`⚠️ ¿Eliminar permanentemente la empresa "${name}"?`)) return;
    setCreating(true);
    try {
      await orgsService.deleteOrganization(id);
      toast.success("Organización eliminada");
      setSelectedOrg(null);
      setOrgsLoadedAt(null); // Force reload
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar organización");
      return false;
    } finally {
      setCreating(false);
    }
  }, []);

  const addMember = useCallback(async (orgId: string, memberData: Record<string, unknown>) => {
    setCreating(true);
    try {
      await orgsService.addMember(orgId, memberData);
      toast.success("Miembro añadido a la organización");
      await loadOrgDetail(orgId);
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al añadir miembro");
      return false;
    } finally {
      setCreating(false);
    }
  }, [loadOrgDetail]);

  const updateOrganization = useCallback(async (orgId: string, data: OrgEditPayload) => {
    setCreating(true);
    try {
      await orgsService.updateOrganization(orgId, data);
      toast.success("Organización actualizada");
      setOrgsLoadedAt(null); // Force reload
      await loadOrgDetail(orgId);
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar organización");
      return false;
    } finally {
      setCreating(false);
    }
  }, [loadOrgDetail]);

  return {
    loading: loadingList || loadingDetail,
    loadingList,
    loadingDetail,
    creating,
    organizations,
    selectedOrg,
    setSelectedOrg,
    packages,
    loadOrganizations,
    loadOrgDetail,
    loadPackages,
    createOrg,
    deleteOrg,
    addMember,
    updateOrganization
  };
}

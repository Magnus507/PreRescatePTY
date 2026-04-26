import { useState, useCallback, useRef, useEffect } from "react";
import { orgsService } from "../_services/domains/orgs.service";
import { OrganizationAdmin } from "../_types/admin";
import { toast } from "sonner";

export function useAdminOrgs() {
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);

  const [organizations, setOrganizations] = useState<OrganizationAdmin[]>([]);
  const [orgsLoadedAt, setOrgsLoadedAt] = useState<number | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationAdmin | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  
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

  // Check if data is stale (default 5 minutes)
  const isOrgsStale = (maxAgeMs = 300000) => !orgsLoadedAt || Date.now() - orgsLoadedAt > maxAgeMs;

  const loadOrganizations = useCallback(async () => {
    if (listAbort.current) listAbort.current.abort();
    listAbort.current = new AbortController();

    setLoadingList(true);
    try {
      const data = await orgsService.getOrganizations(listAbort.current.signal);
      setOrganizations(data.organizations);
      setOrgsLoadedAt(Date.now()); // Track when data was loaded
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      toast.error(e.message || "Error al cargar organizaciones");
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
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      toast.error(e.message || "No se pudo cargar el detalle de la empresa");
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
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error("Error loading packages:", e);
    }
  }, []);

  const createOrg = useCallback(async (orgData: any) => {
    setCreating(true);
    try {
      await orgsService.createOrganization(orgData);
      toast.success("Organización creada exitosamente");
      setOrgsLoadedAt(null); // Force reload
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al crear organización");
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
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar organización");
      return false;
    } finally {
      setCreating(false);
    }
  }, []);

  const assignBulkChips = useCallback(async (orgId: string, count: number) => {
    if (!confirm(`¿Transferir ${count} chips desde el inventario vírgen?`)) return;
    setCreating(true);
    try {
      const res = await orgsService.assignChipsBulk(orgId, count);
      toast.success(res.message);
      await loadOrgDetail(orgId);
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error en asignación masiva");
      return false;
    } finally {
      setCreating(false);
    }
  }, [loadOrgDetail]);

  const assignChipByShortCode = useCallback(async (orgId: string, shortCode: string) => {
    if (!shortCode) return;
    setCreating(true);
    try {
      const res = await orgsService.assignChipByShortCode(orgId, shortCode);
      toast.success(res.message);
      await loadOrgDetail(orgId);
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al asignar chip");
      return false;
    } finally {
      setCreating(false);
    }
  }, [loadOrgDetail]);

  const addMember = useCallback(async (orgId: string, memberData: any) => {
    setCreating(true);
    try {
      await orgsService.addMember(orgId, memberData);
      toast.success("Miembro añadido a la organización");
      await loadOrgDetail(orgId);
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al añadir miembro");
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
    assignBulkChips,
    assignChipByShortCode,
    addMember
  };
}

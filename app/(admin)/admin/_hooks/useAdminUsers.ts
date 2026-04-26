import { useState, useCallback, useRef, useEffect } from "react";
import { usersService } from "../_services/domains/users.service";
import { UserAdmin, AdminAccount } from "../_types/admin";
import { toast } from "sonner";

export interface GetUsersParams {
  limit?: number;
  search?: string;
}

export function useAdminUsers() {
  const [loadingList, setLoadingList] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [creating, setCreating] = useState(false);

  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [usersLoadedAt, setUsersLoadedAt] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminAccount[]>([]);
  const [adminsLoadedAt, setAdminsLoadedAt] = useState<number | null>(null);
  
  // Abort Controllers
  const userListAbort = useRef<AbortController | null>(null);
  const adminListAbort = useRef<AbortController | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      userListAbort.current?.abort();
      adminListAbort.current?.abort();
    };
  }, []);

  // Check if data is stale (default 5 minutes)
  const isUsersStale = (maxAgeMs = 300000) => !usersLoadedAt || Date.now() - usersLoadedAt > maxAgeMs;
  const isAdminsStale = (maxAgeMs = 300000) => !adminsLoadedAt || Date.now() - adminsLoadedAt > maxAgeMs;

  const loadUsers = useCallback(async (params: GetUsersParams = {}) => {
    if (userListAbort.current) userListAbort.current.abort();
    userListAbort.current = new AbortController();

    setLoadingList(true);
    try {
      const data = await usersService.getUsers(params, userListAbort.current.signal);
      setUsers(data.users);
      setTotal(data.total);
      setUsersLoadedAt(Date.now()); // Track when data was loaded
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      toast.error(e.message || "Error al cargar usuarios");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const reloadSelectedUser = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const data = await usersService.getUsers({ search: selectedUser.email });
      const updated = data.users.find((u: any) => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    } catch (e) {
      console.error("Error refreshing selected user:", e);
    }
  }, [selectedUser]);

  const handleAdminAction = useCallback(async (userId: string, action: string, data: any) => {
    setCreating(true);
    try {
      const result = await usersService.runUserAction(userId, action, data);
      toast.success(result.message);

      // Invalidate users list since it was modified
      setUsersLoadedAt(null);

      if (action === "delete-user" || action === "convert-to-org") {
        setSelectedUser(null);
      } else {
        await reloadSelectedUser();
      }
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al ejecutar acción");
      return false;
    } finally {
      setCreating(false);
    }
  }, [reloadSelectedUser]);

  const toggleUserStatus = useCallback(async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    if (!confirm(`¿Estás seguro de ${newStatus === "active" ? "activar" : "bloquear"} a este usuario?`)) return;
    
    setCreating(true);
    try {
      await usersService.updateUserStatus(userId, newStatus);
      toast.success(`Usuario ${newStatus === "active" ? "activado" : "bloqueado"}`);
      await reloadSelectedUser();
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar estado");
      return false;
    } finally {
      setCreating(false);
    }
  }, [reloadSelectedUser]);

  const loadAdminAccounts = useCallback(async () => {
    if (adminListAbort.current) adminListAbort.current.abort();
    adminListAbort.current = new AbortController();

    setLoadingAdmins(true);
    try {
      const data = await usersService.getAdminAccounts(adminListAbort.current.signal);
      setAdminUsers(data.admins);
      setAdminsLoadedAt(Date.now()); // Track when data was loaded
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      toast.error(e.message || "Error al cargar administradores");
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  const createAdmin = useCallback(async (data: any) => {
    setCreating(true);
    try {
      await usersService.createAdmin(data);
      toast.success("Nueva cuenta administrativa creada");
      await loadAdminAccounts();
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al crear administrador");
      return false;
    } finally {
      setCreating(false);
    }
  }, [loadAdminAccounts]);

  const updateAdmin = useCallback(async (id: string, data: any) => {
    setCreating(true);
    try {
      await usersService.updateAdmin(id, data);
      toast.success("Permisos actualizados");
      await loadAdminAccounts();
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar administrador");
      return false;
    } finally {
      setCreating(false);
    }
  }, [loadAdminAccounts]);

  const deleteAdmin = useCallback(async (id: string, email: string) => {
    if (!confirm(`¿Eliminar permanentemente la cuenta de ${email}?`)) return;
    setCreating(true);
    try {
      await usersService.deleteAdmin(id);
      toast.success("Administrador eliminado");
      await loadAdminAccounts();
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar administrador");
      return false;
    } finally {
      setCreating(false);
    }
  }, [loadAdminAccounts]);

  return {
    loading: loadingList || loadingAdmins,
    loadingList,
    loadingAdmins,
    creating,
    users,
    total,
    selectedUser,
    setSelectedUser,
    adminUsers,
    loadUsers,
    loadAdminAccounts,
    handleAdminAction,
    toggleUserStatus,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    reloadSelectedUser
  };
}

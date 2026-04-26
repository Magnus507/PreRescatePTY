import { useState, useCallback, useRef, useEffect } from "react";
import { chipsService } from "../_services/domains/chips.service";
import { ChipAdmin, ChipDetail, ChipStatus, ServiceStatus } from "../_types/admin";
import { toast } from "sonner";

export interface GetChipsParams {
  limit?: number;
  status?: ChipStatus | string;
  serviceStatus?: ServiceStatus | string;
  search?: string;
  accountId?: string;
  excludeStatus?: string;
}

export function useAdminChips() {
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);

  const [chips, setChips] = useState<ChipAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [chipsLoadedAt, setChipsLoadedAt] = useState<number | null>(null);
  const [selectedChip, setSelectedChip] = useState<ChipDetail | null>(null);
  
  // Abort Controllers for request cancelling
  const listAbortController = useRef<AbortController | null>(null);
  const detailAbortController = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      listAbortController.current?.abort();
      detailAbortController.current?.abort();
    };
  }, []);

  // Check if data is stale (default 5 minutes = 300000ms)
  const isChipsStale = (maxAgeMs = 300000) => !chipsLoadedAt || Date.now() - chipsLoadedAt > maxAgeMs;

  const loadChips = useCallback(async (params: GetChipsParams = {}) => {
    if (listAbortController.current) {
      listAbortController.current.abort();
    }
    
    listAbortController.current = new AbortController();
    setLoadingList(true);
    
    try {
      const data = await chipsService.getChips(params, listAbortController.current.signal);
      setChips(data.chips);
      setTotal(data.total);
      setChipsLoadedAt(Date.now()); // Track when data was loaded
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      toast.error(e.message || "Error al cargar dispositivos");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadChipDetail = useCallback(async (id: string) => {
    if (detailAbortController.current) {
        detailAbortController.current.abort();
    }
    
    detailAbortController.current = new AbortController();
    setLoadingDetail(true);
    
    try {
      const data = await chipsService.getChipDetail(id, detailAbortController.current.signal);
      setSelectedChip(data.chip);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      toast.error(e.message || "No se pudo cargar el detalle del chip");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const reactivateChip = useCallback(async (id: string) => {
    setCreating(true);
    try {
      await chipsService.reactivateChip(id);
      toast.success("Dispositivo reactivado por 2 años");

      // Force list reload since chip data changed
      setChipsLoadedAt(null);

      // Instead of merging partial data, we reload the full detail to ensure type safety
      if (selectedChip?.id === id) {
        await loadChipDetail(id);
      }
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al reactivar dispositivo");
      return false;
    } finally {
      setCreating(false);
    }
  }, [selectedChip, loadChipDetail]);

  const deleteChip = useCallback(async (id: string, serial: string) => {
    if (!confirm(`¿Eliminar permanentemente el chip ${serial}?`)) return;
    setCreating(true);
    try {
      await chipsService.deleteChip(id);
      toast.success("Chip eliminado del sistema");
      setChipsLoadedAt(null); // Force reload on next load
      return true;
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar dispositivo");
      return false;
    } finally {
      setCreating(false);
    }
  }, []);

  const createBatch = useCallback(async (count: number, labelBase?: string, labelStart?: number): Promise<ChipAdmin[] | null> => {
    setCreating(true);
    try {
      const data = await chipsService.createBatch(count, labelBase, labelStart);
      toast.success(`Lote de ${count} chips generado`);
      return data.chips;
    } catch (e: any) {
      toast.error(e.message || "Error al generar lote");
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    loading: loadingList || loadingDetail,
    loadingList,
    loadingDetail,
    creating,
    chips,
    total,
    selectedChip,
    setSelectedChip,
    loadChips,
    loadChipDetail,
    reactivateChip,
    deleteChip,
    createBatch
  };
}

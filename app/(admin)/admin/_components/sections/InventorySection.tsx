import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Copy, Cpu, Loader2, Package, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChipAdmin } from "../../_types/admin";
import { chipsService, PointOfSaleOption } from "../../_services/domains/chips.service";
import { CreateBatchSection } from "./CreateBatchSection";

type InventoryView = "available" | "reserved" | "activated" | "returned" | "damaged" | "pointOfSale";

interface InventorySectionProps {
  chips: ChipAdmin[];
  loading: boolean;
  loadChips: () => void;
  loadChipDetail: (id: string) => void;
  createCount: number;
  setCreateCount: (val: number) => void;
  createBatch: (labelBase?: string, labelStart?: number) => void;
  creating: boolean;
  createdBatch: ChipAdmin[] | null;
  exportCSV: () => void;
  role?: string;
}

interface InventoryItem extends ChipAdmin {
  activationCode?: string;
  updatedAt?: string;
  latestToken?: {
    orderId?: string | null;
    usedAt?: string | null;
    expiresAt?: string | null;
    createdAt?: string | null;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
  } | null;
  customer?: {
    name: string | null;
    email: string | null;
  } | null;
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const TABS: { key: InventoryView; label: string }[] = [
  { key: "available", label: "Disponibles" },
  { key: "pointOfSale", label: "En punto de venta" },
  { key: "reserved", label: "Vendidos / Reservados" },
  { key: "activated", label: "Activados" },
  { key: "returned", label: "Revertidos / Devueltos" },
  // PRE-LAUNCH: Dañados/Perdidos menos prominente y al final
  { key: "damaged", label: "Dañados / Perdidos (opcional)" },
];

export const InventorySection: React.FC<InventorySectionProps> = ({
  loadChipDetail,
  createCount,
  setCreateCount,
  createBatch,
  creating,
  createdBatch,
  exportCSV,
  role,
}) => {
  const isPrintRole = role === "imprenta";
  const [activeSubTab, setActiveSubTab] = useState<"list" | "create">("list");
  const [activeView, setActiveView] = useState<InventoryView>("available");
  const [physicalFilter, setPhysicalFilter] = useState<"all" | "physical" | "digital">("all");
  const [pointOfSaleFilter, setPointOfSaleFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loadingView, setLoadingView] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Record<InventoryView, number>>({
    available: 0,
    reserved: 0,
    activated: 0,
    returned: 0,
    damaged: 0,
    pointOfSale: 0,
  });
  const [selectedChipIds, setSelectedChipIds] = useState<string[]>([]);
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSaleOption[]>([]);
  const [consignModalOpen, setConsignModalOpen] = useState(false);
  const [selectedPointOfSaleId, setSelectedPointOfSaleId] = useState("");
  const [consignmentSubmitting, setConsignmentSubmitting] = useState(false);

  const loadView = useCallback(async (view: InventoryView, search = "") => {
    setLoadingView(true);
    try {
      const res = await chipsService.getChips({
        limit: 100,
        search: search || undefined,
        view,
        pointOfSaleId: view === "pointOfSale" ? pointOfSaleFilter || undefined : undefined,
      });
      setItems((res.items || res.chips || []) as InventoryItem[]);
      setSelectedChipIds([]);
    } catch {
      toast.error("Error al cargar inventario");
    } finally {
      setLoadingView(false);
    }
  }, [pointOfSaleFilter]);

  const loadSummary = useCallback(async () => {
    try {
      const responses = await Promise.all(
        TABS.map((tab) => chipsService.getChips({ limit: 1, view: tab.key }))
      );
      const next: Record<InventoryView, number> = {
        available: 0,
        reserved: 0,
        activated: 0,
        returned: 0,
        damaged: 0,
        pointOfSale: 0,
      };
      TABS.forEach((tab, idx) => {
        next[tab.key] = responses[idx].total || 0;
      });
      setSummary(next);
    } catch {
      // silent: summary is informative
    }
  }, []);

  useEffect(() => {
    if (activeSubTab !== "list") return;
    loadView(activeView, query);
  }, [activeView, activeSubTab, pointOfSaleFilter, query, loadView]);

  useEffect(() => {
    if (activeSubTab !== "list" || isPrintRole) return;
    chipsService.getPointsOfSale()
      .then((res) => setPointsOfSale(res.points || []))
      .catch(() => toast.error("No se pudieron cargar los puntos de venta"));
  }, [activeSubTab, isPrintRole]);

  useEffect(() => {
    if (activeSubTab === "list") {
      loadSummary();
    }
  }, [activeSubTab, loadSummary]);

  const filtered = useMemo(() => {
    let result = items;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((c) =>
        c.shortCode.toLowerCase().includes(q) ||
        c.serialPublic.toLowerCase().includes(q) ||
        (c.internalLabel || "").toLowerCase().includes(q)
      );
    }
    // Solo aplicar filtro físico/digital en la vista "available"
    if (activeView === "available" && physicalFilter !== "all") {
      result = result.filter((c) =>
        physicalFilter === "physical" ? c.isPhysical === true : c.isPhysical === false
      );
    }
    return result;
  }, [items, query, physicalFilter, activeView]);

  const selectedChips = useMemo(
    () => items.filter((chip) => selectedChipIds.includes(chip.id)),
    [items, selectedChipIds]
  );

  const toggleSelected = (chip: InventoryItem) => {
    if (activeView === "available" && (!chip.isPhysical || chip.status !== "inventory")) {
      toast.error("Solo se pueden seleccionar chips físicos disponibles");
      return;
    }
    if (activeView === "pointOfSale" && chip.status !== "consigned") {
      toast.error("Solo se pueden seleccionar chips consignados");
      return;
    }
    setSelectedChipIds((current) =>
      current.includes(chip.id) ? current.filter((id) => id !== chip.id) : [...current, chip.id]
    );
  };

  const validateSinglePointOfSale = () => {
    const pointIds = [...new Set(selectedChips.map((chip) => chip.pointOfSaleId).filter(Boolean))];
    if (selectedChips.length === 0) {
      toast.error("Selecciona al menos un chip");
      return null;
    }
    if (pointIds.length !== 1) {
      toast.error("Todos los chips seleccionados deben pertenecer al mismo punto de venta");
      return null;
    }
    return pointIds[0] as string;
  };

  const handleOpenConsignModal = () => {
    if (selectedChips.length === 0) return toast.error("Selecciona al menos un chip físico disponible");
    if (selectedChips.some((chip) => !chip.isPhysical || chip.status !== "inventory")) {
      return toast.error("No se permite consignar chips digitales o no disponibles");
    }
    setSelectedPointOfSaleId("");
    setConsignModalOpen(true);
  };

  const handleConsignSelected = async () => {
    if (!selectedPointOfSaleId) return toast.error("Selecciona un punto de venta existente");
    setConsignmentSubmitting(true);
    try {
      const res = await chipsService.consignToPointOfSale(selectedPointOfSaleId, selectedChipIds);
      toast.success(`${res.consigned} chip(s) consignado(s) a ${res.pointOfSale.name}`);
      setConsignModalOpen(false);
      setSelectedChipIds([]);
      await loadView(activeView, query);
      await loadSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudieron consignar los chips");
    } finally {
      setConsignmentSubmitting(false);
    }
  };

  const handleReturnSelected = async () => {
    const pointId = validateSinglePointOfSale();
    if (!pointId) return;
    if (!window.confirm("¿Devolver los chips seleccionados al inventario central?")) return;
    setConsignmentSubmitting(true);
    try {
      const res = await chipsService.returnFromPointOfSale(pointId, selectedChipIds);
      toast.success(`${res.returned} chip(s) devuelto(s) desde ${res.pointOfSale.name}`);
      setSelectedChipIds([]);
      await loadView(activeView, query);
      await loadSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudieron devolver los chips");
    } finally {
      setConsignmentSubmitting(false);
    }
  };

  const handleMarkLostSelected = async () => {
    const pointId = validateSinglePointOfSale();
    if (!pointId) return;
    const reason = window.prompt("Motivo opcional para marcar como perdidos:") || undefined;
    if (!window.confirm("Esta acción marcará los chips seleccionados como perdidos. ¿Continuar?")) return;
    setConsignmentSubmitting(true);
    try {
      const res = await chipsService.markLostFromPointOfSale(pointId, selectedChipIds, reason);
      toast.success(`${res.lost} chip(s) marcado(s) como perdidos`);
      setSelectedChipIds([]);
      await loadView(activeView, query);
      await loadSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudieron marcar como perdidos");
    } finally {
      setConsignmentSubmitting(false);
    }
  };

  const copy = (value?: string | null) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success("Código copiado");
  };

  const handleTogglePhysical = async (id: string, currentState: boolean) => {
    try {
      await chipsService.updatePhysicalStatus(id, !currentState);
      toast.success(!currentState ? "Marcado como Físico" : "Marcado como Digital");
      await loadView(activeView, query);
      await loadSummary();
    } catch {
      toast.error("No se pudo actualizar tipo físico/digital");
    }
  };

  const handleSaveInternalLabel = async (id: string, value: string) => {
    try {
      await fetch("/api/admin/chips/inventory", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, internalLabel: value }),
      });
      toast.success("Etiqueta interna guardada");
      await loadView(activeView, query);
    } catch {
      toast.error("No se pudo guardar la etiqueta interna");
    }
  };

  const handleRehabilitate = async (chipId: string) => {
    const confirmed = window.confirm(
      "Esto generará un nuevo código de activación y devolverá el chip a Disponibles. ¿Deseas continuar?"
    );
    if (!confirmed) return;

    try {
      const res = await chipsService.rehabilitateChip(chipId);
      toast.success(`Chip rehabilitado. Nuevo código: ${res.token.activationCode}`);
      await loadView(activeView, query);
      await loadSummary();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudo rehabilitar el chip");
    }
  };


  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async (chip: InventoryItem) => {
    const confirmed = window.confirm("Esta acción eliminará el chip disponible del inventario. No se puede deshacer.");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/chips/${chip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete: true }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Chip eliminado permanentemente");
      await loadView(activeView, query);
      await loadSummary();
    } catch {
      toast.error("No se pudo eliminar el chip");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" /> Almacén Central
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Inventario trazable por estado.
          </p>
        </div>

        {!isPrintRole && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveSubTab("list")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === "list"
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Package className="h-3.5 w-3.5" /> Inventario
            </button>
            <button
              onClick={() => setActiveSubTab("create")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === "create"
                  ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Plus className="h-3.5 w-3.5" /> Crear Lote
            </button>
          </div>
        )}
      </div>

      {activeSubTab === "create" ? (
        <CreateBatchSection
          createCount={createCount}
          setCreateCount={setCreateCount}
          createBatch={createBatch}
          creating={creating}
          createdBatch={createdBatch}
          exportCSV={exportCSV}
          loadChipDetail={loadChipDetail}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveView(tab.key); setPhysicalFilter("all"); }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  activeView === tab.key
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <Card label="Disponibles" value={summary.available} tone="blue" />
            <Card label="Punto de venta" value={summary.pointOfSale} tone="purple" />
            <Card label="Vendidos/Reservados" value={summary.reserved} tone="amber" />
            <Card label="Activados" value={summary.activated} tone="emerald" />
            <Card label="Revertidos (est.)" value={summary.returned} tone="indigo" />
            <Card label="Dañados/Perdidos" value={summary.damaged} tone="red" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 md:max-w-md">
              <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                placeholder="Buscar identificador..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-sm transition-all"
              />
            </div>
            <button
              onClick={() => {
                loadView(activeView, query);
                loadSummary();
              }}
              className="p-3 border border-border dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:bg-muted dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loadingView ? "animate-spin text-primary" : "text-slate-400"}`} />
            </button>
          </div>

          {!isPrintRole && (activeView === "available" || activeView === "pointOfSale") && (
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {activeView === "pointOfSale" && (
                  <select
                    value={pointOfSaleFilter}
                    onChange={(e) => setPointOfSaleFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold outline-none"
                  >
                    <option value="">Todos los puntos existentes</option>
                    {pointsOfSale.map((point) => (
                      <option key={point.id} value={point.id}>{point.name}</option>
                    ))}
                  </select>
                )}
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  {selectedChipIds.length} seleccionado(s)
                </span>
              </div>

              {activeView === "available" && (
                <button
                  onClick={handleOpenConsignModal}
                  disabled={selectedChipIds.length === 0 || consignmentSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Consignar seleccionados
                </button>
              )}

              {activeView === "pointOfSale" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReturnSelected}
                    disabled={selectedChipIds.length === 0 || consignmentSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Devolver seleccionados
                  </button>
                  <button
                    onClick={handleMarkLostSelected}
                    disabled={selectedChipIds.length === 0 || consignmentSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Marcar perdidos
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subtabs Físicos / Digitales solo en vista Disponibles */}
          {activeView === "available" && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl w-fit">
              <button
                onClick={() => setPhysicalFilter("all")}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  physicalFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPhysicalFilter("physical")}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  physicalFilter === "physical"
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Físicos
              </button>
              <button
                onClick={() => setPhysicalFilter("digital")}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  physicalFilter === "digital"
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Digitales
              </button>
            </div>
          )}

          {activeView === "returned" && (
            <p className="text-[11px] text-amber-700 font-semibold">
              Revertidos / Devueltos es una vista heurística estimada con datos históricos disponibles.
            </p>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-border overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  {activeView === "reserved" && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Código activación</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Orden</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Estado orden/pago</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha reserva</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Expira código</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                    </tr>
                  )}

                  {activeView === "activated" && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil vinculado</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha activación</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimiento servicio</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Estado servicio</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                    </tr>
                  )}

                  {activeView === "available" && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                      {!isPrintRole && <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Sel.</th>}
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Etiqueta interna</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Serial</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Código activación</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Lote</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                    </tr>
                  )}

                  {activeView === "pointOfSale" && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                      {!isPrintRole && <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Sel.</th>}
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Serial</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Punto de venta</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Consignado</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                    </tr>
                  )}

                  {activeView === "returned" && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Código activación</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Orden</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Actualizado</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                    </tr>
                  )}

                  {activeView === "damaged" && (
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Última actualización</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      {activeView === "reserved" && (
                        <>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900 dark:text-white">{c.shortCode}</div>
                            <div className="text-[11px] text-slate-400 font-mono">#{c.serialPublic}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{c.activationCode || c.claimTokens?.[0]?.activationCode || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.order?.orderNumber || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.customer?.name || c.customer?.email || "—"}</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="px-2 py-1 rounded bg-slate-100 font-bold uppercase text-[10px] mr-1">{c.order?.orderStatus || "—"}</span>
                            <span className="px-2 py-1 rounded bg-slate-100 font-bold uppercase text-[10px]">{c.order?.paymentStatus || "—"}</span>
                          </td>
                          <td className="px-6 py-4 text-xs">{formatDateTime(c.latestToken?.createdAt)}</td>
                          <td className="px-6 py-4 text-xs">{formatDate(c.latestToken?.expiresAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => copy(c.activationCode || c.claimTokens?.[0]?.activationCode || null)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" title="Copiar código">
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}

                      {activeView === "activated" && (
                        <>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900 dark:text-white">{c.shortCode}</div>
                            <div className="text-[11px] text-slate-400 font-mono">#{c.serialPublic}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">{c.customer?.name || c.customer?.email || c.owner?.email || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.profile ? `${c.profile.firstName} ${c.profile.lastName}` : c.assignedProfile ? `${c.assignedProfile.firstName} ${c.assignedProfile.lastName}` : "—"}</td>
                          <td className="px-6 py-4 text-xs">{formatDate(c.activatedAt)}</td>
                          <td className="px-6 py-4 text-xs">{formatDate(c.serviceEndDate)}</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="px-2 py-1 rounded bg-slate-100 font-bold uppercase text-[10px]">{c.serviceStatus || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => copy(c.shortCode)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" title="Copiar ID público">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button onClick={() => loadChipDetail(c.id)} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary">Ver</button>
                            </div>
                          </td>
                        </>
                      )}

                      {activeView === "available" && (
                        <>
                          {!isPrintRole && (
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedChipIds.includes(c.id)}
                                disabled={!c.isPhysical || c.status !== "inventory"}
                                onChange={() => toggleSelected(c)}
                                className="h-4 w-4 rounded border-slate-300"
                                title={!c.isPhysical ? "No se permite consignar digitales" : "Seleccionar"}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              defaultValue={c.internalLabel || ""}
                              placeholder="Ej: INICIAL 00010"
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next !== (c.internalLabel || "")) {
                                  handleSaveInternalLabel(c.id, next);
                                }
                              }}
                              className="bg-muted border-none rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest w-40 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900 dark:text-white">{c.shortCode}</div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">#{c.serialPublic}</td>
                          <td className="px-6 py-4 font-mono text-xs">{c.activationCode || c.claimTokens?.[0]?.activationCode || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.batchId || "—"}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => copy(c.shortCode)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" title="Copiar ID público">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button onClick={() => copy(c.activationCode || c.claimTokens?.[0]?.activationCode || null)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" title="Copiar código">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleTogglePhysical(c.id, c.isPhysical)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${c.isPhysical ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                                title={c.isPhysical ? "Marcar como digital" : "Marcar como físico"}
                              >
                                {c.isPhysical ? <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> : <Circle className="h-3.5 w-3.5 inline mr-1" />}
                                {c.isPhysical ? "Físico" : "Digital"}
                              </button>
                              <button onClick={() => loadChipDetail(c.id)} className="p-2 rounded-lg bg-primary/10 text-primary" title="Ver detalle">
                                <Cpu className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(c)}
                                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              {/* PRE-LAUNCH: Botón Asignar directo oculto */}
                            </div>
                          </td>
                        </>
                      )}

                      {activeView === "pointOfSale" && (
                        <>
                          {!isPrintRole && (
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedChipIds.includes(c.id)}
                                onChange={() => toggleSelected(c)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900 dark:text-white">{c.shortCode}</div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">#{c.serialPublic}</td>
                          <td className="px-6 py-4 text-xs font-bold">{c.pointOfSale?.name || "—"}</td>
                          <td className="px-6 py-4 text-xs">{formatDateTime(c.consignedAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => copy(c.shortCode)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" title="Copiar ID público">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button onClick={() => loadChipDetail(c.id)} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary">Ver</button>
                            </div>
                          </td>
                        </>
                      )}

                      {activeView === "returned" && (
                        <>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900 dark:text-white">{c.shortCode}</div>
                            <div className="text-[11px] text-slate-400 font-mono">#{c.serialPublic}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{c.activationCode || c.claimTokens?.[0]?.activationCode || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.order?.orderNumber || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.customer?.name || c.customer?.email || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.profile ? `${c.profile.firstName} ${c.profile.lastName}` : "—"}</td>
                          <td className="px-6 py-4 text-xs">{formatDate(c.updatedAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => copy(c.activationCode || c.claimTokens?.[0]?.activationCode || null)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" title="Copiar código">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRehabilitate(c.id)}
                                className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700"
                                title="Rehabilitar para stock"
                              >
                                Rehabilitar
                              </button>
                              <button onClick={() => loadChipDetail(c.id)} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary">Ver</button>
                            </div>
                          </td>
                        </>
                      )}

                      {activeView === "damaged" && (
                        <>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900 dark:text-white">{c.shortCode}</div>
                            <div className="text-[11px] text-slate-400 font-mono">#{c.serialPublic}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold uppercase text-[10px]">{c.status}</span>
                          </td>
                          <td className="px-6 py-4 text-xs">{c.customer?.name || c.customer?.email || c.owner?.email || "—"}</td>
                          <td className="px-6 py-4 text-xs">{c.profile ? `${c.profile.firstName} ${c.profile.lastName}` : c.assignedProfile ? `${c.assignedProfile.firstName} ${c.assignedProfile.lastName}` : "—"}</td>
                          <td className="px-6 py-4 text-xs">{formatDateTime(c.updatedAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => loadChipDetail(c.id)} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary">Ver</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {loadingView && (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!loadingView && filtered.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                  Sin resultados para esta vista.
                </div>
              )}
            </div>
          </div>

          {consignModalOpen && !isPrintRole && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-border p-6 shadow-2xl">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Consignar chips</h3>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Selecciona un punto de venta existente para consignar {selectedChipIds.length} chip(s) físico(s).
                </p>
                <select
                  value={selectedPointOfSaleId}
                  onChange={(e) => setSelectedPointOfSaleId(e.target.value)}
                  className="mt-4 w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none"
                >
                  <option value="">Seleccionar punto existente</option>
                  {pointsOfSale.map((point) => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setConsignModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConsignSelected}
                    disabled={!selectedPointOfSaleId || consignmentSubmitting}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {consignmentSubmitting ? "Consignando..." : "Consignar"}
                  </button>
                </div>
              </div>
            </div>
          )}

{/* PRE-LAUNCH: Modal Asignar directo completamente oculto */}
        </>
      )}
    </div>
  );
};

function Card({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "emerald" | "indigo" | "red" | "purple" }) {
  const styles: Record<typeof tone, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-700",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-700",
    red: "bg-red-500/10 border-red-500/20 text-red-700",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-700",
  };
  return (
    <div className={`px-4 py-3 rounded-2xl border ${styles[tone]}`}>
      <div className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</div>
      <div className="text-2xl font-black leading-none mt-1">{value}</div>
    </div>
  );
}
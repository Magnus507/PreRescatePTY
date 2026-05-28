import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Copy, Cpu, Loader2, Package, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { ChipAdmin } from "../../_types/admin";
import { chipsService } from "../../_services/domains/chips.service";
import { usersService, AdminUserProfileOption } from "../../_services/domains/users.service";
import { UserAdmin } from "../../_types/admin";
import { CreateBatchSection } from "./CreateBatchSection";

type InventoryView = "available" | "reserved" | "activated" | "returned" | "damaged";

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
  { key: "reserved", label: "Vendidos / Reservados" },
  { key: "activated", label: "Activados" },
  { key: "returned", label: "Revertidos / Devueltos" },
  { key: "damaged", label: "Dañados / Perdidos" },
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
  const [query, setQuery] = useState("");
  const [loadingView, setLoadingView] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Record<InventoryView, number>>({
    available: 0,
    reserved: 0,
    activated: 0,
    returned: 0,
    damaged: 0,
  });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignChip, setAssignChip] = useState<InventoryItem | null>(null);
  const [assignUsers, setAssignUsers] = useState<UserAdmin[]>([]);
  const [assignUserSearch, setAssignUserSearch] = useState("");
  const [assignProfiles, setAssignProfiles] = useState<AdminUserProfileOption[]>([]);
  const [assignLoadingProfiles, setAssignLoadingProfiles] = useState(false);
  const [assignForm, setAssignForm] = useState({
    targetUserId: "",
    targetProfileId: "",
    reason: "replacement" as "replacement" | "courtesy" | "warranty" | "internal_test" | "same_customer_reassign",
    notes: "",
    capacityMode: "deny_if_no_capacity" as "deny_if_no_capacity" | "consume_existing" | "grant_exception",
  });
  const [assignResult, setAssignResult] = useState<{
    orderNumber: string;
    activationCode: string;
    expiresAt: string;
  } | null>(null);

  const loadView = async (view: InventoryView, search = "") => {
    setLoadingView(true);
    try {
      const res = await chipsService.getChips({
        limit: 100,
        search: search || undefined,
        view,
      });
      setItems((res.items || res.chips || []) as InventoryItem[]);
    } catch {
      toast.error("Error al cargar inventario");
    } finally {
      setLoadingView(false);
    }
  };

  const loadSummary = async () => {
    try {
      const responses = await Promise.all(
        TABS.map((tab) => chipsService.getChips({ limit: 1, view: tab.key }))
      );
      const next = { ...summary };
      TABS.forEach((tab, idx) => {
        next[tab.key] = responses[idx].total || 0;
      });
      setSummary(next);
    } catch {
      // silent: summary is informative
    }
  };

  useEffect(() => {
    if (activeSubTab !== "list") return;
    loadView(activeView, query);
  }, [activeView, activeSubTab]);

  useEffect(() => {
    if (activeSubTab === "list") {
      loadSummary();
    }
  }, [activeSubTab]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((c) =>
      c.shortCode.toLowerCase().includes(q) ||
      c.serialPublic.toLowerCase().includes(q) ||
      (c.internalLabel || "").toLowerCase().includes(q)
    );
  }, [items, query]);

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
    } catch (e: any) {
      toast.error(e?.message || "No se pudo rehabilitar el chip");
    }
  };

  const loadAssignUsers = async (search = "") => {
    const res = await usersService.getUsers({ limit: 100, search: search || undefined });
    setAssignUsers(res.users || []);
  };

  const openAssignModal = async (chip: InventoryItem) => {
    setAssignChip(chip);
    setAssignOpen(true);
    setAssignResult(null);
    setAssignProfiles([]);
    setAssignForm({
      targetUserId: "",
      targetProfileId: "",
      reason: "replacement",
      notes: "",
      capacityMode: "deny_if_no_capacity",
    });
    try {
      await loadAssignUsers();
    } catch {
      toast.error("No se pudieron cargar los clientes");
    }
  };

  const loadProfilesForUser = async (userId: string) => {
    setAssignLoadingProfiles(true);
    try {
      const profiles = await usersService.getUserProfiles(userId);
      setAssignProfiles(profiles || []);
    } catch (e: any) {
      setAssignProfiles([]);
      toast.error(e?.message || "No se pudieron cargar los perfiles del cliente");
    } finally {
      setAssignLoadingProfiles(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignChip) return;
    if (!assignForm.targetUserId) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!assignForm.targetProfileId) {
      toast.error("Selecciona un perfil médico");
      return;
    }
    if (!assignForm.reason) {
      toast.error("Selecciona un motivo");
      return;
    }
    if (assignForm.capacityMode === "grant_exception" && !assignForm.notes.trim()) {
      toast.error("Debes agregar notas para grant_exception");
      return;
    }

    const confirmed = window.confirm(
      "Esta acción generará una orden administrativa $0 y reservará el chip para el cliente seleccionado."
    );
    if (!confirmed) return;

    setAssignSubmitting(true);
    try {
      const res = await chipsService.assignDirect(assignChip.id, {
        targetUserId: assignForm.targetUserId,
        targetProfileId: assignForm.targetProfileId,
        reason: assignForm.reason,
        notes: assignForm.notes || undefined,
        capacityMode: assignForm.capacityMode,
        autoActivate: false,
      });

      setAssignResult({
        orderNumber: res.order?.orderNumber || "—",
        activationCode: res.token?.activationCode || "",
        expiresAt: res.token?.expiresAt || "",
      });

      toast.success("Chip asignado directamente");
      await loadView(activeView, query);
      await loadSummary();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo asignar el chip");
    } finally {
      setAssignSubmitting(false);
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
                onClick={() => setActiveView(tab.key)}
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

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card label="Disponibles" value={summary.available} tone="blue" />
            <Card label="Vendidos/Reservados" value={summary.reserved} tone="amber" />
            <Card label="Activados" value={summary.activated} tone="emerald" />
            <Card label="Revertidos (est.)" value={summary.returned} tone="indigo" />
            <Card label="Dañados/Perdidos" value={summary.damaged} tone="red" />
          </div>

          <div className="flex items-center gap-2">
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
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Etiqueta interna</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Serial</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Código activación</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Lote</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha creación</th>
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
                          <td className="px-6 py-4 text-xs">{c.isPhysical ? "Físico" : "Digital"}</td>
                          <td className="px-6 py-4 text-xs">{formatDate(c.createdAt)}</td>
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
                                onClick={() => openAssignModal(c)}
                                className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-100 text-indigo-700"
                                title="Asignar directo"
                              >
                                Asignar directo
                              </button>
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

          {assignOpen && assignChip && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
                <h3 className="text-lg font-black">Asignar chip directamente</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div><span className="font-black">ShortCode:</span> {assignChip.shortCode}</div>
                  <div><span className="font-black">Etiqueta:</span> {assignChip.internalLabel || "—"}</div>
                  <div><span className="font-black">Serial:</span> {assignChip.serialPublic}</div>
                  <div><span className="font-black">Código actual:</span> {assignChip.activationCode || assignChip.claimTokens?.[0]?.activationCode || "—"}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Buscar cliente</label>
                  <div className="flex gap-2">
                    <input
                      value={assignUserSearch}
                      onChange={(e) => setAssignUserSearch(e.target.value)}
                      placeholder="Nombre o email"
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => loadAssignUsers(assignUserSearch)}
                      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black"
                    >
                      Buscar
                    </button>
                  </div>

                  <select
                    value={assignForm.targetUserId}
                    onChange={async (e) => {
                      const targetUserId = e.target.value;
                      setAssignForm((prev) => ({ ...prev, targetUserId, targetProfileId: "" }));
                      setAssignProfiles([]);
                      if (targetUserId) await loadProfilesForUser(targetUserId);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona cliente</option>
                    {assignUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Perfil médico</label>
                  <select
                    value={assignForm.targetProfileId}
                    onChange={(e) => setAssignForm((prev) => ({ ...prev, targetProfileId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    disabled={assignLoadingProfiles || !assignForm.targetUserId}
                  >
                    <option value="">Selecciona perfil</option>
                    {assignProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} — {p.displayName}{p.isOwnerProfile ? " (Owner)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Motivo</label>
                    <select
                      value={assignForm.reason}
                      onChange={(e) =>
                        setAssignForm((prev) => ({
                          ...prev,
                          reason: e.target.value as "replacement" | "courtesy" | "warranty" | "internal_test" | "same_customer_reassign",
                        }))
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="replacement">replacement</option>
                      <option value="courtesy">courtesy</option>
                      <option value="warranty">warranty</option>
                      <option value="internal_test">internal_test</option>
                      <option value="same_customer_reassign">same_customer_reassign</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Capacity mode</label>
                    <select
                      value={assignForm.capacityMode}
                      onChange={(e) =>
                        setAssignForm((prev) => ({
                          ...prev,
                          capacityMode: e.target.value as "deny_if_no_capacity" | "consume_existing" | "grant_exception",
                        }))
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="deny_if_no_capacity">deny_if_no_capacity</option>
                      <option value="consume_existing">consume_existing</option>
                      <option value="grant_exception">grant_exception</option>
                    </select>
                  </div>
                </div>

                {assignForm.capacityMode === "grant_exception" && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    Atención: grant_exception requiere notas y aumentará cupo de la cuenta.
                  </p>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Notas</label>
                  <textarea
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-24"
                    placeholder="Notas administrativas"
                  />
                </div>

                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Esta acción reservará el chip y generará una orden administrativa $0.
                </p>

                {assignResult && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                    <p className="text-sm font-black text-emerald-700">Asignación completada</p>
                    <p className="text-xs"><span className="font-black">Orden:</span> {assignResult.orderNumber}</p>
                    <p className="text-xs"><span className="font-black">Código:</span> {assignResult.activationCode}</p>
                    <p className="text-xs"><span className="font-black">Expira:</span> {formatDateTime(assignResult.expiresAt)}</p>
                    <button
                      onClick={() => copy(assignResult.activationCode)}
                      className="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700"
                    >
                      Copiar activationCode
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setAssignOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                    disabled={assignSubmitting}
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleAssignSubmit}
                    disabled={assignSubmitting}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-black disabled:opacity-60"
                  >
                    {assignSubmitting ? "Asignando..." : "Confirmar asignación"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function Card({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "emerald" | "indigo" | "red" }) {
  const styles: Record<typeof tone, string> = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-700",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-700",
    red: "bg-red-500/10 border-red-500/20 text-red-700",
  };
  return (
    <div className={`px-4 py-3 rounded-2xl border ${styles[tone]}`}>
      <div className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</div>
      <div className="text-2xl font-black leading-none mt-1">{value}</div>
    </div>
  );
}

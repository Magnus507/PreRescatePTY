import React, { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Package, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { ChipAdmin } from "../../_types/admin";
import { chipsService } from "../../_services/domains/chips.service";
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
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-border">
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ID público</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Código activación</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Orden</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Actualizado</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 dark:text-white">{c.shortCode}</div>
                        <div className="text-[11px] text-slate-400 font-mono">#{c.serialPublic}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{c.activationCode || c.claimTokens?.[0]?.activationCode || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-700">{c.status}</span>
                      </td>
                      <td className="px-6 py-4 text-xs">{c.order?.orderNumber || "—"}</td>
                      <td className="px-6 py-4 text-xs">{c.customer?.name || c.customer?.email || "—"}</td>
                      <td className="px-6 py-4 text-xs">{c.profile ? `${c.profile.firstName} ${c.profile.lastName}` : "—"}</td>
                      <td className="px-6 py-4 text-xs">{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copy(c.activationCode || c.claimTokens?.[0]?.activationCode || null)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                            title="Copiar código"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => loadChipDetail(c.id)}
                            className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-primary/10 text-primary"
                          >
                            Ver
                          </button>
                        </div>
                      </td>
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

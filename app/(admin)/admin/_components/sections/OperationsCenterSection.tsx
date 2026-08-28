"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes, Factory, History, RefreshCw, RotateCcw, ShoppingCart, Truck } from "lucide-react";
import { buildAdminOperationsUrl, parseOperationsTab, type OperationsTab } from "@/lib/admin/operations-routing";
import DirectProductionSection from "./DirectProductionSection";
import DirectInventorySection from "./DirectInventorySection";
import { DirectDispatchSection } from "./DirectDispatchSection";
import { HistorySection } from "./HistorySection";
import { PedidosSection } from "./PedidosSection";
import { WarrantySection } from "./WarrantySection";
import { ReplacementSection } from "./ReplacementSection";
import { ReturnSection } from "./ReturnSection";

type PostsalesTab = "warranties" | "replacements" | "returns";

interface OperationsCenterSectionProps {
  role?: string;
  initialTab?: OperationsTab;
  onTabChange?: (tab: OperationsTab) => void;
}

interface OperationsDashboard {
  commercial: { totalCommercialOrders: number; activePedidosOrders: number; commercialPaid: number };
  production: { totalProductionOrders: number; productionDraft: number; productionStarted: number; productionActive: number; productionCompleted: number };
  physicalUnits: { total: number; available: number; reserved: number; qaPending: number; qaFailed: number; dispatched: number; delivered: number; activated: number };
  dispatch: { totalDispatches: number; dispatchReserved: number; dispatchDispatched: number; dispatchDelivered: number; deliveredPendingActivation: number };
  warranties: { warrantiesClaimOpen: number };
  replacements: { replacementsApproved: number };
  returns: { returnsReceived: number };
}

const TABS: Array<{ id: OperationsTab; label: string; icon: React.ElementType; iconClass: string }> = [
  { id: "commercial", label: "Pedidos", icon: ShoppingCart, iconClass: "bg-blue-100 text-blue-700" },
  { id: "production", label: "Producción", icon: Factory, iconClass: "bg-violet-100 text-violet-700" },
  { id: "inventory", label: "Inventario", icon: Boxes, iconClass: "bg-emerald-100 text-emerald-700" },
  { id: "dispatch", label: "Despachos", icon: Truck, iconClass: "bg-cyan-100 text-cyan-700" },
  { id: "postsales", label: "Postventa", icon: RotateCcw, iconClass: "bg-amber-100 text-amber-800" },
  { id: "history", label: "Historial", icon: History, iconClass: "bg-slate-200 text-slate-700" },
];

const POSTSALES_TABS: Array<{ id: PostsalesTab; label: string }> = [
  { id: "warranties", label: "Garantías" },
  { id: "replacements", label: "Reemplazos" },
  { id: "returns", label: "Devoluciones" },
];

function compactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PA", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function OperationsCenterSection({ role, initialTab = "commercial", onTabChange }: OperationsCenterSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminTab = searchParams.get("tab") || "dashboard";
  const activeTab = adminTab === "inventory" ? parseOperationsTab(searchParams.get("op")) : initialTab;
  const [postsalesTab, setPostsalesTab] = useState<PostsalesTab>("warranties");
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const shouldRender = adminTab === "inventory" || adminTab === "pedidos" || adminTab === "tienda";

  const loadDashboard = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`/api/admin/operations/dashboard?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo cargar operaciones");
      setDashboard(data.dashboard || null);
    } catch (error) {
      console.error("OPERATIONS_DASHBOARD_LOAD_ERROR", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldRender) return;
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard({ silent: true }), 15_000);
    return () => window.clearInterval(interval);
  }, [loadDashboard, shouldRender]);

  const changeTab = useCallback((tab: OperationsTab) => {
    onTabChange?.(tab);
    router.push(buildAdminOperationsUrl(tab, searchParams.get("q")));
  }, [onTabChange, router, searchParams]);

  const postSalesOpen = useMemo(() => (dashboard?.warranties.warrantiesClaimOpen || 0) + (dashboard?.replacements.replacementsApproved || 0) + (dashboard?.returns.returnsReceived || 0), [dashboard]);

  const metrics = useMemo<Record<OperationsTab, { value: number; attention: number }>>(() => ({
    commercial: { value: dashboard?.commercial.activePedidosOrders || 0, attention: dashboard?.commercial.activePedidosOrders || 0 },
    production: { value: dashboard?.production.productionActive || 0, attention: dashboard?.production.productionActive || 0 },
    inventory: { value: dashboard?.physicalUnits.available || 0, attention: (dashboard?.physicalUnits.qaPending || 0) + (dashboard?.physicalUnits.qaFailed || 0) },
    dispatch: { value: dashboard?.dispatch.dispatchDispatched || 0, attention: dashboard?.dispatch.deliveredPendingActivation || 0 },
    postsales: { value: postSalesOpen, attention: postSalesOpen },
    history: { value: dashboard?.physicalUnits.delivered || 0, attention: 0 },
  }), [dashboard, postSalesOpen]);

  if (!shouldRender) return null;

  const renderContent = () => {
    if (activeTab === "commercial") return <PedidosSection />;
    if (activeTab === "production") return <DirectProductionSection />;
    if (activeTab === "inventory") return <DirectInventorySection />;
    if (activeTab === "dispatch") return <DirectDispatchSection />;
    if (activeTab === "history") return <HistorySection />;
    return <div className="space-y-4"><div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">{POSTSALES_TABS.map((tab) => <button key={tab.id} type="button" onClick={() => setPostsalesTab(tab.id)} className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest ${postsalesTab === tab.id ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}>{tab.label}</button>)}</div>{postsalesTab === "warranties" && <WarrantySection />}{postsalesTab === "replacements" && <ReplacementSection />}{postsalesTab === "returns" && <ReturnSection />}</div>;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-base font-black text-slate-950">Centro de Operaciones</h2><button type="button" onClick={() => loadDashboard({ silent: true })} disabled={refreshing} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-50" aria-label="Actualizar"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button></div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 lg:grid-cols-6 lg:divide-y-0">{TABS.map((tab) => { const Icon = tab.icon; const active = activeTab === tab.id; const metric = metrics[tab.id]; return <button key={tab.id} type="button" onClick={() => changeTab(tab.id)} className={`min-h-[96px] p-4 text-left transition ${active ? "bg-white shadow-[inset_0_-3px_0_#DA1A21]" : "bg-slate-50 hover:bg-white"}`}><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tab.iconClass}`}><Icon className="h-4 w-4" /></span>{metric.attention > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-black text-amber-700 ring-1 ring-amber-200">{metric.attention}</span>}</div><div className="mt-3 flex items-end justify-between gap-2"><span className="text-xl font-black text-slate-950">{loading ? "—" : compactNumber(metric.value)}</span><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{tab.label}</span></div></button>; })}</div>
      </section>
      <div role="tabpanel">{renderContent()}</div>
      {role === "imprenta" && <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700">Vista de imprenta</div>}
    </div>
  );
}

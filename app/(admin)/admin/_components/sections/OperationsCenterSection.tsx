"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  Factory,
  History,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { OperationsTab } from "@/lib/admin/operations-routing";
import ProductionQueueSection from "./ProductionQueueSection";
import { PhysicalInventorySection } from "./PhysicalInventorySection";
import { DispatchSection } from "./DispatchSection";
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
  commercial: {
    totalCommercialOrders: number;
    commercialConfirmed: number;
    commercialPaid: number;
    commercialTotalAmount: number;
  };
  production: {
    totalProductionOrders: number;
    productionDraft: number;
    productionStarted: number;
    productionCompleted: number;
  };
  physicalUnits: {
    total: number;
    available: number;
    reserved: number;
    qaPending: number;
    qaFailed: number;
    dispatched: number;
    delivered: number;
    activated: number;
  };
  dispatch: {
    totalDispatches: number;
    dispatchDraft: number;
    dispatchReserved: number;
    dispatchDispatched: number;
    dispatchDelivered: number;
    deliveredPendingActivation: number;
  };
  warranties: {
    totalWarranties: number;
    warrantiesActive: number;
    warrantiesClaimOpen: number;
  };
  replacements: {
    totalReplacements: number;
    replacementsApproved: number;
    replacementsCompleted: number;
  };
  returns: {
    totalReturns: number;
    returnsReceived: number;
    returnsCompleted: number;
  };
}

const TABS: Array<{
  id: OperationsTab;
  label: string;
  icon: React.ElementType;
  shortLabel: string;
  accent: string;
  iconClass: string;
}> = [
  { id: "commercial", label: "Pedidos", icon: ShoppingCart, shortLabel: "01 · Entrada", accent: "bg-blue-50 text-blue-700 border-blue-100", iconClass: "bg-blue-100 text-blue-700" },
  { id: "production", label: "Producción", icon: Factory, shortLabel: "02 · Fabricación", accent: "bg-violet-50 text-violet-700 border-violet-100", iconClass: "bg-violet-100 text-violet-700" },
  { id: "inventory", label: "Inventario", icon: Boxes, shortLabel: "03 · Stock físico", accent: "bg-emerald-50 text-emerald-700 border-emerald-100", iconClass: "bg-emerald-100 text-emerald-700" },
  { id: "dispatch", label: "Despachos", icon: Truck, shortLabel: "04 · Salida", accent: "bg-cyan-50 text-cyan-700 border-cyan-100", iconClass: "bg-cyan-100 text-cyan-700" },
  { id: "postsales", label: "Postventa", icon: RotateCcw, shortLabel: "05 · Soporte", accent: "bg-amber-50 text-amber-800 border-amber-100", iconClass: "bg-amber-100 text-amber-800" },
  { id: "history", label: "Historial", icon: History, shortLabel: "06 · Auditoría", accent: "bg-slate-50 text-slate-700 border-slate-200", iconClass: "bg-slate-200 text-slate-700" },
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
  const [activeTab, setActiveTab] = useState<OperationsTab>(initialTab);
  const [postsalesTab, setPostsalesTab] = useState<PostsalesTab>("warranties");
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const loadDashboard = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setDashboardRefreshing(true);
    else setDashboardLoading(true);

    try {
      const res = await fetch(`/api/admin/operations/dashboard?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el estado operativo");
      setDashboard(data.dashboard || null);
      setGeneratedAt(data.generatedAt || null);
    } catch (error) {
      console.error("OPERATIONS_DASHBOARD_LOAD_ERROR", error);
    } finally {
      setDashboardLoading(false);
      setDashboardRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(() => loadDashboard({ silent: true }), 30_000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const changeTab = useCallback((tab: OperationsTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  const postSalesOpen = useMemo(() => {
    if (!dashboard) return 0;
    return (
      dashboard.warranties.warrantiesClaimOpen +
      dashboard.replacements.replacementsApproved +
      dashboard.returns.returnsReceived
    );
  }, [dashboard]);

  const stageMetrics = useMemo<Record<OperationsTab, { value: number; detail: string; alert?: number }>>(() => {
    return {
      commercial: {
        value: dashboard?.commercial.totalCommercialOrders || 0,
        detail: `${compactNumber(dashboard?.commercial.commercialPaid)} pagos aprobados`,
      },
      production: {
        value: dashboard?.production.productionStarted || 0,
        detail: `${compactNumber(dashboard?.production.productionDraft)} pendientes · ${compactNumber(dashboard?.production.productionCompleted)} listas`,
        alert: dashboard?.production.productionStarted || 0,
      },
      inventory: {
        value: dashboard?.physicalUnits.available || 0,
        detail: `${compactNumber(dashboard?.physicalUnits.reserved)} reservadas · ${compactNumber(dashboard?.physicalUnits.qaPending)} QC`,
        alert: dashboard?.physicalUnits.qaFailed || 0,
      },
      dispatch: {
        value: dashboard?.dispatch.dispatchDispatched || 0,
        detail: `${compactNumber(dashboard?.dispatch.dispatchReserved)} preparadas · ${compactNumber(dashboard?.dispatch.dispatchDelivered)} entregadas`,
        alert: dashboard?.dispatch.deliveredPendingActivation || 0,
      },
      postsales: {
        value: postSalesOpen,
        detail: `${compactNumber(dashboard?.warranties.warrantiesClaimOpen)} garantías · ${compactNumber(dashboard?.returns.returnsReceived)} devoluciones`,
        alert: postSalesOpen,
      },
      history: {
        value: dashboard?.physicalUnits.delivered || 0,
        detail: `${compactNumber(dashboard?.physicalUnits.activated)} activadas`,
      },
    };
  }, [dashboard, postSalesOpen]);

  const renderContent = () => {
    if (activeTab === "commercial") return <PedidosSection />;
    if (activeTab === "production") return <ProductionQueueSection />;
    if (activeTab === "inventory") return <PhysicalInventorySection />;
    if (activeTab === "dispatch") return <DispatchSection />;
    if (activeTab === "history") return <HistorySection />;

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Garantías y devoluciones">
            {POSTSALES_TABS.map((tab) => {
              const active = postsalesTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPostsalesTab(tab.id)}
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? "bg-white text-primary shadow-sm dark:bg-slate-800"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {postsalesTab === "warranties" && <WarrantySection />}
        {postsalesTab === "replacements" && <ReplacementSection />}
        {postsalesTab === "returns" && <ReturnSection />}
      </div>
    );
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-58px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.45)]" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Operación en vivo</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Centro de Operaciones</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard({ silent: true })}
            disabled={dashboardRefreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-white hover:text-slate-950 disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dashboardRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const metric = stageMetrics[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeTab(tab.id)}
                className={`relative min-h-[132px] p-5 text-left transition-all ${
                  active
                    ? "z-10 bg-white shadow-[inset_0_-4px_0_#DA1A21]"
                    : "bg-slate-50 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tab.iconClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {metric.alert && metric.alert > 0 ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-700">
                      {compactNumber(metric.alert)} atención
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>

                <p className="mt-4 text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {tab.shortLabel}
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-2xl font-black tracking-tight text-slate-950">
                    {dashboardLoading ? "—" : compactNumber(metric.value)}
                  </span>
                  <span className={`mb-1 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${tab.accent}`}>
                    {tab.label}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-[9px] font-semibold text-slate-500">{metric.detail}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-5 py-3 text-[9px] font-semibold text-slate-500 sm:px-7">
          <span>
            Físicas {compactNumber(dashboard?.physicalUnits.total)} · disponibles {compactNumber(dashboard?.physicalUnits.available)} · reservadas {compactNumber(dashboard?.physicalUnits.reserved)}
          </span>
          <span>
            {generatedAt ? new Date(generatedAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" }) : "Sincronizando"}
          </span>
        </div>
      </section>

      <div role="tabpanel">{renderContent()}</div>

      {role === "imprenta" && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700">
          Vista de imprenta limitada al Centro de Operaciones.
        </div>
      )}
    </div>
  );
}

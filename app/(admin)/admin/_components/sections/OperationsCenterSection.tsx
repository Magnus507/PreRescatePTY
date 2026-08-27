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
import ProductionQueueSection from "./ProductionQueueSection";
import { PhysicalInventorySection } from "./PhysicalInventorySection";
import { DispatchSection } from "./DispatchSection";
import { HistorySection } from "./HistorySection";
import { PedidosSection } from "./PedidosSection";
import { WarrantySection } from "./WarrantySection";
import { ReplacementSection } from "./ReplacementSection";
import { ReturnSection } from "./ReturnSection";

type OperationsTab = "commercial" | "production" | "inventory" | "dispatch" | "postsales" | "history";
type PostsalesTab = "warranties" | "replacements" | "returns";

interface OperationsCenterSectionProps {
  role?: string;
  initialTab?: OperationsTab;
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
}> = [
  { id: "commercial", label: "Pedidos", icon: ShoppingCart, shortLabel: "01 · Entrada" },
  { id: "production", label: "Producción", icon: Factory, shortLabel: "02 · Fabricación" },
  { id: "inventory", label: "Inventario", icon: Boxes, shortLabel: "03 · Stock físico" },
  { id: "dispatch", label: "Despachos", icon: Truck, shortLabel: "04 · Salida" },
  { id: "postsales", label: "Postventa", icon: RotateCcw, shortLabel: "05 · Soporte" },
  { id: "history", label: "Historial", icon: History, shortLabel: "06 · Auditoría" },
];

const POSTSALES_TABS: Array<{ id: PostsalesTab; label: string }> = [
  { id: "warranties", label: "Garantías" },
  { id: "replacements", label: "Reemplazos" },
  { id: "returns", label: "Devoluciones" },
];

function compactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PA", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function OperationsCenterSection({ role, initialTab = "commercial" }: OperationsCenterSectionProps) {
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
        detail: `${compactNumber(dashboard?.commercial.commercialPaid)} con pago aprobado`,
      },
      production: {
        value: dashboard?.production.productionStarted || 0,
        detail: `${compactNumber(dashboard?.production.productionDraft)} por iniciar · ${compactNumber(dashboard?.production.productionCompleted)} terminadas`,
        alert: dashboard?.production.productionStarted || 0,
      },
      inventory: {
        value: dashboard?.physicalUnits.available || 0,
        detail: `${compactNumber(dashboard?.physicalUnits.reserved)} reservadas · ${compactNumber(dashboard?.physicalUnits.qaPending)} en QC`,
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
        detail: `${compactNumber(dashboard?.physicalUnits.activated)} unidades activadas`,
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-[0_30px_90px_-55px_rgba(15,23,42,0.65)]">
        <div className="border-b border-white/10 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Flujo operativo en vivo
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">De pedido a entrega, sin perder la unidad física</h2>
              <p className="mt-2 max-w-3xl text-xs font-semibold leading-relaxed text-slate-400 sm:text-sm">
                Pedido → pago → stock o producción → QA → reserva por etiqueta interna → despacho → entrega → activación.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard({ silent: true })}
              disabled={dashboardRefreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60 lg:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${dashboardRefreshing ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const metric = stageMetrics[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative min-h-[142px] border-b border-white/10 p-5 text-left transition-all sm:border-r xl:border-b-0 ${
                  index === TABS.length - 1 ? "sm:border-r-0" : ""
                } ${active ? "bg-white text-slate-950" : "bg-slate-950 hover:bg-slate-900"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-slate-950 text-white" : "bg-white/10 text-white"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {metric.alert && metric.alert > 0 ? (
                    <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider ${active ? "bg-amber-100 text-amber-800" : "bg-amber-400/15 text-amber-300"}`}>
                      {compactNumber(metric.alert)} atención
                    </span>
                  ) : (
                    <CheckCircle2 className={`h-4 w-4 ${active ? "text-emerald-600" : "text-emerald-400/70"}`} />
                  )}
                </div>

                <p className={`mt-4 text-[8px] font-black uppercase tracking-[0.22em] ${active ? "text-slate-500" : "text-slate-500"}`}>
                  {tab.shortLabel}
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-2xl font-black tracking-tight">{dashboardLoading ? "—" : compactNumber(metric.value)}</span>
                  <span className={`pb-1 text-[10px] font-black uppercase tracking-wider ${active ? "text-slate-700" : "text-slate-300"}`}>
                    {tab.label}
                  </span>
                </div>
                <p className={`mt-1 line-clamp-2 text-[9px] font-semibold leading-relaxed ${active ? "text-slate-500" : "text-slate-500"}`}>
                  {metric.detail}
                </p>

                {active && <span className="absolute inset-x-5 bottom-0 h-1 rounded-t-full bg-[#DA1A21]" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-[9px] font-semibold text-slate-500 sm:px-7">
          <span>
            Unidades físicas: {compactNumber(dashboard?.physicalUnits.total)} · disponibles {compactNumber(dashboard?.physicalUnits.available)} · reservadas {compactNumber(dashboard?.physicalUnits.reserved)}
          </span>
          <span>
            {generatedAt ? `Actualizado ${new Date(generatedAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}` : "Sincronizando estado operativo"}
          </span>
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Secciones del Centro de Operaciones">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  active
                    ? "bg-white text-primary shadow-sm dark:bg-slate-800"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel">{renderContent()}</div>

      {role === "imprenta" && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700">
          Vista de imprenta limitada al Centro de Operaciones.
        </div>
      )}
    </div>
  );
}

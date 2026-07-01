"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Cpu,
  DollarSign,
  Factory,
  History,
  Layers,
  Loader2,
  PackageCheck,
  RefreshCw,
  Repeat2,
  RotateCcw,
  Route,
  Printer,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { ChipAdmin } from "../../_types/admin";
import { CreateBatchSection } from "./CreateBatchSection";
import ProductionQueueSection from "./ProductionQueueSection";
import { DigitalResourcesSection } from "./DigitalResourcesSection";
import { PrintOrdersSection } from "./PrintOrdersSection";
import { FinishedGoodUnitsSection } from "./FinishedGoodUnitsSection";
import { PhysicalInventorySection } from "./PhysicalInventorySection";
import { InventoryMovementsSection } from "./InventoryMovementsSection";
import { PackingSection } from "./PackingSection";
import { DispatchSection } from "./DispatchSection";
import { QualitySection } from "./QualitySection";
import { HistorySection } from "./HistorySection";
import { CommercialSection } from "./CommercialSection";
import { WarrantySection } from "./WarrantySection";
import { ReplacementSection } from "./ReplacementSection";
import { ReturnSection } from "./ReturnSection";

type OperationsTab =
  | "overview"
  | "production"
  | "digital"
  | "print"
  | "units"
  | "physical"
  | "movements"
  | "batches"
  | "quality"
  | "packing"
  | "commercial"
  | "warranties"
  | "replacements"
  | "returns"
  | "dispatch"
  | "history";

interface OperationsCenterSectionProps {
  createCount: number;
  setCreateCount: (val: number) => void;
  createBatch: (labelBase?: string, labelStart?: number) => void;
  creating: boolean;
  createdBatch: ChipAdmin[] | null;
  exportCSV: () => void;
  loadChipDetail: (id: string) => void;
  role?: string;
}

interface OperationsDashboardSummary {
  materials: {
    totalMaterials: number;
    activeMaterials: number;
    materialEventsCount: number;
  };
  production: {
    totalProductionOrders: number;
    productionDraft: number;
    productionStarted: number;
    productionCompleted: number;
    totalProducedQuantity: number;
  };
  qc: {
    totalQcInspections: number;
    qcPending: number;
    qcInProgress: number;
    qcCompleted: number;
    totalPassedQuantity: number;
    totalFailedQuantity: number;
  };
  packing: {
    totalPackingBatches: number;
    packingInProgress: number;
    packingCompleted: number;
    totalPackedQuantity: number;
  };
  finishedGoods: {
    totalFinishedGoods: number;
    totalFinishedGoodEvents: number;
    totalAvailableBalance: number;
  };
  dispatch: {
    totalDispatches: number;
    dispatchDraft: number;
    dispatchReserved: number;
    dispatchDispatched: number;
    dispatchDelivered: number;
  };
  commercial: {
    totalCommercialOrders: number;
    commercialConfirmed: number;
    commercialPaid: number;
    commercialTotalAmount: number;
  };
  warranties: {
    totalWarranties: number;
    warrantiesActive: number;
    warrantiesClaimOpen: number;
    warrantiesExpired: number;
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
    totalReturnedToInventoryQuantity: number;
  };
}

interface OperationsDashboardResponse {
  dashboard: OperationsDashboardSummary;
  generatedAt: string;
}

const TABS: Array<{ id: OperationsTab; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Panel operativo", icon: Activity },
  { id: "commercial", label: "Pedidos", icon: ShoppingCart },
  { id: "physical", label: "Inventario", icon: Boxes },
  { id: "digital", label: "Recursos digitales", icon: Cpu },
  { id: "print", label: "Imprenta", icon: Printer },
  { id: "units", label: "Unidades", icon: PackageCheck },
  { id: "production", label: "Produccion", icon: Factory },
  { id: "batches", label: "Lotes", icon: Layers },
  { id: "packing", label: "Produccion / Empaque", icon: PackageCheck },
  { id: "quality", label: "Calidad / QA", icon: ClipboardCheck },
  { id: "dispatch", label: "Despacho", icon: Truck },
  { id: "warranties", label: "Garantias", icon: ShieldCheck },
  { id: "replacements", label: "Reemplazos", icon: Repeat2 },
  { id: "returns", label: "Devoluciones", icon: RotateCcw },
  { id: "movements", label: "Movimientos", icon: Route },
  { id: "history", label: "Historial", icon: History },
];

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500">{hint}</p>
    </div>
  );
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-PA", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function OperationsCenterSection({
  createCount,
  setCreateCount,
  createBatch,
  creating,
  createdBatch,
  exportCSV,
  loadChipDetail,
  role,
}: OperationsCenterSectionProps) {
  const [activeTab, setActiveTab] = useState<OperationsTab>("overview");
  const [dashboard, setDashboard] = useState<OperationsDashboardSummary | null>(null);
  const [dashboardGeneratedAt, setDashboardGeneratedAt] = useState<string | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch("/api/admin/operations/dashboard", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo cargar dashboard de operaciones");
      }

      setDashboard((data as OperationsDashboardResponse).dashboard);
      setDashboardGeneratedAt((data as OperationsDashboardResponse).generatedAt);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el resumen operativo");
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const health = useMemo(() => {
    const productionActive = dashboard?.production.productionStarted || 0;
    const qcPending = dashboard?.qc.qcPending || 0;
    const packingActive = dashboard?.packing.packingInProgress || 0;
    const dispatchPending =
      (dashboard?.dispatch.dispatchDraft || 0) +
      (dashboard?.dispatch.dispatchReserved || 0) +
      (dashboard?.dispatch.dispatchDispatched || 0);
    const claimsOpen = dashboard?.warranties.warrantiesClaimOpen || 0;

    if (productionActive > 0 || qcPending > 0 || packingActive > 0 || dispatchPending > 0 || claimsOpen > 0) {
      return {
        label: "Atencion operativa",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        icon: AlertTriangle,
      };
    }
    return {
      label: "Operacion al dia",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: ShieldCheck,
      };
  }, [dashboard]);

  const HealthIcon = health.icon;

  const renderContent = () => {
    if (activeTab === "production") return <ProductionQueueSection />;

    if (activeTab === "batches") {
      return (
        <CreateBatchSection
          createCount={createCount}
          setCreateCount={setCreateCount}
          createBatch={createBatch}
          creating={creating}
          createdBatch={createdBatch}
          exportCSV={exportCSV}
          loadChipDetail={loadChipDetail}
        />
      );
    }

    if (activeTab === "digital") {
      return <DigitalResourcesSection />;
    }

    if (activeTab === "print") {
      return <PrintOrdersSection />;
    }

    if (activeTab === "units") {
      return <FinishedGoodUnitsSection />;
    }

    if (activeTab === "physical") {
      return <PhysicalInventorySection />;
    }

    if (activeTab === "movements") {
      return <InventoryMovementsSection />;
    }

    if (activeTab === "packing") {
      return <PackingSection />;
    }

    if (activeTab === "dispatch") {
      return <DispatchSection />;
    }

    if (activeTab === "commercial") {
      return <CommercialSection />;
    }

    if (activeTab === "warranties") {
      return <WarrantySection />;
    }

    if (activeTab === "replacements") {
      return <ReplacementSection />;
    }

    if (activeTab === "returns") {
      return <ReturnSection />;
    }

    if (activeTab === "quality") {
      return <QualitySection />;
    }

    if (activeTab === "history") {
      return <HistorySection />;
    }

    const dispatchPending = dashboard
      ? dashboard.dispatch.dispatchDraft + dashboard.dispatch.dispatchReserved + dashboard.dispatch.dispatchDispatched
      : 0;
    const afterSalesPending = dashboard
      ? dashboard.warranties.warrantiesClaimOpen +
        dashboard.replacements.replacementsApproved +
        dashboard.returns.returnsReceived
      : 0;

    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Resumen operativo real</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Salud, cuellos de botella y volumen del flujo Materiales → Despacho + Pedidos/Postventa.
              </p>
              {dashboardGeneratedAt && (
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Actualizado {formatTime(dashboardGeneratedAt)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loadingDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950"
            >
              {loadingDashboard ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </section>

        {loadingDashboard && !dashboard ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando dashboard
            </div>
          </div>
        ) : !dashboard ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
            No se pudo cargar el dashboard de operaciones.
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Estado general"
            value={health.label}
            icon={HealthIcon}
            tone={health.tone}
            hint="Basado en produccion, QC, empaque, despacho y reclamos."
          />
          <MetricCard
            label="Produccion activa"
            value={dashboard.production.productionStarted}
            icon={Factory}
            tone="bg-violet-50 text-violet-700 border-violet-200"
            hint={`${formatCompactNumber(dashboard.production.totalProducedQuantity)} unidades producidas acumuladas.`}
          />
          <MetricCard
            label="QC pendiente"
            value={dashboard.qc.qcPending}
            icon={ClipboardCheck}
            tone="bg-purple-50 text-purple-700 border-purple-200"
            hint={`${formatCompactNumber(dashboard.qc.totalPassedQuantity)} aprobadas / ${formatCompactNumber(dashboard.qc.totalFailedQuantity)} rechazadas.`}
          />
          <MetricCard
            label="Empaque en progreso"
            value={dashboard.packing.packingInProgress}
            icon={PackageCheck}
            tone="bg-blue-50 text-blue-700 border-blue-200"
            hint={`${formatCompactNumber(dashboard.packing.totalPackedQuantity)} unidades empacadas.`}
          />
          <MetricCard
            label="Inventario"
            value={formatCompactNumber(dashboard.finishedGoods.totalAvailableBalance)}
            icon={Warehouse}
            tone="bg-emerald-50 text-emerald-700 border-emerald-200"
            hint={`Balance calculado desde ${formatCompactNumber(dashboard.finishedGoods.totalFinishedGoodEvents)} eventos.`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Despachos pendientes"
            value={dispatchPending}
            icon={Truck}
            tone="bg-cyan-50 text-cyan-700 border-cyan-200"
            hint={`${dashboard.dispatch.dispatchDelivered} entregados, ${dashboard.dispatch.dispatchReserved} reservados.`}
          />
          <MetricCard
            label="Pedidos"
            value={`${dashboard.commercial.commercialConfirmed}/${dashboard.commercial.commercialPaid}`}
            icon={DollarSign}
            tone="bg-lime-50 text-lime-700 border-lime-200"
            hint={`${formatCurrency(dashboard.commercial.commercialTotalAmount)} en pedidos operativos.`}
          />
          <MetricCard
            label="Reclamos abiertos"
            value={dashboard.warranties.warrantiesClaimOpen}
            icon={ShieldCheck}
            tone="bg-amber-50 text-amber-700 border-amber-200"
            hint={`${dashboard.warranties.warrantiesActive} garantias activas.`}
          />
          <MetricCard
            label="Postventa pendiente"
            value={afterSalesPending}
            icon={RotateCcw}
            tone="bg-rose-50 text-rose-700 border-rose-200"
            hint={`${formatCompactNumber(dashboard.returns.totalReturnedToInventoryQuantity)} unidades retornadas a Inventario.`}
          />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Flujo operativo implementado</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              El tablero resume datos reales de eventos, ordenes y estados de cada modulo conectado.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-700">Core operacional</h3>
              <div className="flex overflow-x-auto pb-2">
                {["Materiales", "Produccion", "Calidad / QA", "Produccion / Empaque", "Inventario", "Despacho"].map((step, index, list) => (
                  <div key={step} className="flex items-center">
                    <div className="min-w-[132px] rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary">Paso {index + 1}</p>
                      <p className="mt-2 text-xs font-black text-slate-800">{step}</p>
                    </div>
                    {index < list.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-slate-400" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-700">Pedidos y postventa</h3>
              <div className="flex overflow-x-auto pb-2">
                {["Pedidos", "Despacho", "Garantias", "Reemplazos", "Devoluciones", "Inventario"].map((step, index, list) => (
                  <div key={step} className="flex items-center">
                    <div className="min-w-[132px] rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary">Paso {index + 1}</p>
                      <p className="mt-2 text-xs font-black text-slate-800">{step}</p>
                    </div>
                    {index < list.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-slate-400" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveTab("production")}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <Factory className="mb-5 h-8 w-8 text-primary" />
            <h3 className="text-lg font-black tracking-tight">Abrir produccion</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Ordenes reales, eventos y cantidades producidas.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("physical")}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <Warehouse className="mb-5 h-8 w-8 text-emerald-600" />
            <h3 className="text-lg font-black tracking-tight">Abrir inventario</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Balance disponible calculado por eventos de inventario terminado.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dispatch")}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <Truck className="mb-5 h-8 w-8 text-cyan-600" />
            <h3 className="text-lg font-black tracking-tight">Abrir despacho</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Reservas, salidas y entregas con movimientos inmutables.
            </p>
          </button>
        </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Centro operativo</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Centro de Operaciones
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Core operacional, Comercial y Postventa en una sola entrada administrativa.
            </p>
          </div>
          <div className={`flex w-fit items-center gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest ${health.tone}`}>
            <HealthIcon className="h-4 w-4" />
            {health.label}
          </div>
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

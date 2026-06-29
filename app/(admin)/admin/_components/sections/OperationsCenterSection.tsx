"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Cpu,
  Factory,
  History,
  Layers,
  Loader2,
  PackageCheck,
  QrCode,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { ChipAdmin } from "../../_types/admin";
import { CreateBatchSection } from "./CreateBatchSection";
import ProductionQueueSection from "./ProductionQueueSection";

type OperationsTab =
  | "overview"
  | "production"
  | "digital"
  | "physical"
  | "movements"
  | "batches"
  | "quality"
  | "packing"
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

interface QueueCounts {
  pending: number;
  inProduction: number;
  packing: number;
  done: number;
}

const DEFAULT_COUNTS: QueueCounts = {
  pending: 0,
  inProduction: 0,
  packing: 0,
  done: 0,
};

const TABS: Array<{ id: OperationsTab; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Panel operativo", icon: Activity },
  { id: "production", label: "Produccion", icon: Factory },
  { id: "digital", label: "Recursos digitales", icon: Cpu },
  { id: "physical", label: "Inventario fisico", icon: Boxes },
  { id: "movements", label: "Movimientos", icon: Route },
  { id: "batches", label: "Lotes", icon: Layers },
  { id: "quality", label: "Calidad", icon: ClipboardCheck },
  { id: "packing", label: "Empaque", icon: PackageCheck },
  { id: "dispatch", label: "Despacho", icon: Truck },
  { id: "history", label: "Historial", icon: History },
];

const PLACEHOLDERS: Record<Exclude<OperationsTab, "overview" | "production" | "batches">, {
  title: string;
  description: string;
  icon: React.ElementType;
  bullets: string[];
}> = {
  digital: {
    title: "Proximamente: Recursos digitales",
    description: "Vista dedicada para shortCodes, QR, codigos de activacion y estado de servicio.",
    icon: Cpu,
    bullets: ["Identidad digital", "Activacion", "Asignacion a perfil"],
  },
  physical: {
    title: "Proximamente: Inventario fisico",
    description: "Stock real por producto, variante, ubicacion y estado operativo.",
    icon: Boxes,
    bullets: ["Disponible y reservado", "Danados y devueltos", "Multi-bodega"],
  },
  movements: {
    title: "Proximamente: Movimientos",
    description: "Libro operativo para ingreso, reserva, consumo, devolucion, ajuste y despacho.",
    icon: Route,
    bullets: ["Sin ajustes directos", "Trazabilidad", "Auditoria"],
  },
  quality: {
    title: "Proximamente: Calidad",
    description: "Checklists por producto, incidencias, reproceso y aprobaciones excepcionales.",
    icon: ClipboardCheck,
    bullets: ["QR escaneable", "NFC legible", "Reproceso"],
  },
  packing: {
    title: "Proximamente: Empaque",
    description: "Paquetes por empleado, cajas corporativas, checklist y packing list.",
    icon: PackageCheck,
    bullets: ["Paquete individual", "Caja corporativa", "Packing list"],
  },
  dispatch: {
    title: "Proximamente: Despacho",
    description: "Courier, tracking, cajas, peso, evidencia e historial de entrega.",
    icon: Truck,
    bullets: ["Tracking", "Evidencia", "Entrega"],
  },
  history: {
    title: "Proximamente: Historial",
    description: "Eventos operativos para produccion, inventario, calidad, empaque y despacho.",
    icon: History,
    bullets: ["Eventos", "Metricas", "Reportes"],
  },
};

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

function PlaceholderPanel({
  config,
}: {
  config: typeof PLACEHOLDERS[keyof typeof PLACEHOLDERS];
}) {
  const Icon = config.icon;
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{config.title}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{config.description}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:min-w-[360px] md:grid-cols-1">
          {config.bullets.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
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
  const [counts, setCounts] = useState<QueueCounts>(DEFAULT_COUNTS);
  const [loadingCounts, setLoadingCounts] = useState(false);

  const loadCounts = async () => {
    setLoadingCounts(true);
    try {
      const res = await fetch("/api/admin/fabrication/queue", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar produccion");
      const data = await res.json();
      setCounts(data.counts || DEFAULT_COUNTS);
    } catch {
      toast.error("No se pudo cargar el resumen operativo");
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const health = useMemo(() => {
    if (counts.pending > 0 || counts.inProduction > 0 || counts.packing > 0) {
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
  }, [counts]);

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

    if (activeTab !== "overview") {
      return <PlaceholderPanel config={PLACEHOLDERS[activeTab]} />;
    }

    const hasPending = counts.pending > 0 || counts.inProduction > 0 || counts.packing > 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Estado general"
            value={health.label}
            icon={HealthIcon}
            tone={health.tone}
            hint={hasPending ? "Hay pedidos pendientes de atencion." : "Todo al dia."}
          />
          <MetricCard
            label="Pendientes"
            value={counts.pending}
            icon={Clock}
            tone="bg-amber-50 text-amber-700 border-amber-200"
            hint="Pedidos aprobados esperando produccion."
          />
          <MetricCard
            label="En produccion"
            value={counts.inProduction}
            icon={Factory}
            tone="bg-violet-50 text-violet-700 border-violet-200"
            hint="Ordenes con trabajo iniciado."
          />
          <MetricCard
            label="Listos para empaque"
            value={counts.packing}
            icon={PackageCheck}
            tone="bg-blue-50 text-blue-700 border-blue-200"
            hint="Derivado de estados actuales."
          />
          <MetricCard
            label="Completados"
            value={counts.done}
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-700 border-emerald-200"
            hint="Pedidos finalizados."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendiente de modelo operativo</p>
            </div>
            <p className="text-sm font-semibold text-slate-500">Bloqueados y listos para despacho se mostraran cuando el backend exponga estos estados.</p>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despacho</p>
            </div>
            <p className="text-sm font-semibold text-slate-500">El tracking de despacho se activara con la integracion de lotes corporativos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveTab("production")}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <Factory className="mb-5 h-8 w-8 text-primary" />
            <h3 className="text-lg font-black tracking-tight">Abrir produccion</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Cola corporativa actual con pedidos aprobados y pagados.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batches")}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <QrCode className="mb-5 h-8 w-8 text-indigo-600" />
            <h3 className="text-lg font-black tracking-tight">Crear lote digital</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Genera recursos digitales NFC/QR sin crear modelos nuevos.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("digital")}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <Cpu className="mb-5 h-8 w-8 text-emerald-600" />
            <h3 className="text-lg font-black tracking-tight">Recursos digitales</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Separacion visual para chips, shortCodes, QR y activacion.
            </p>
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">Ruta operativa futura</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Pedido aprobado, produccion, control de calidad, empaque, despacho e historial.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCounts}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white dark:border-slate-800 dark:bg-slate-950"
            >
              {loadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ["1", "Produccion", "Pedidos aprobados listos para fabricar"],
              ["2", "Calidad", "Checklist por producto y excepciones"],
              ["3", "Empaque", "Paquetes individuales y cajas"],
              ["4", "Despacho", "Tracking y evidencia de entrega"],
            ].map(([step, title, copy]) => (
              <div key={step} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {step}</p>
                <h3 className="mt-2 font-black text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </section>
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
              Produccion, recursos digitales, inventario fisico, empaque y despacho en una sola entrada operacional.
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

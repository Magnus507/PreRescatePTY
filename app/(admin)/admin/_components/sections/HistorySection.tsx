"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, History, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type HistoryEntityType =
  | "unit"
  | "commercial_order"
  | "digital_batch"
  | "print_order"
  | "production_order"
  | "dispatch"
  | "warranty"
  | "replacement"
  | "return";

type HistoryResponse = {
  subject: null | {
    entityType: HistoryEntityType;
    entityId: string;
    entityCode: string | null;
    internalLabel: string | null;
    title: string;
    subtitle: string | null;
    currentStatus: string | null;
    activationStatus: string | null;
  };
  timeline: Array<{
    id: string;
    occurredAt: string;
    source: string;
    eventType: string;
    label: string;
    description: string | null;
    severity: "info" | "success" | "warning" | "danger";
    entityType: string;
    entityId: string;
    entityCode: string | null;
    internalLabel: string | null;
    productCode: string | null;
    productName: string | null;
    referenceType: string | null;
    referenceId: string | null;
    related: Record<string, string | null>;
  }>;
  summary: {
    totalEvents: number;
    firstEventAt: string | null;
    lastEventAt: string | null;
    currentStatus: string | null;
    activationStatus: string | null;
    deliveredPendingActivation: boolean | null;
  };
  suggestions?: Array<{ type: HistoryEntityType; id: string; label: string; subtitle: string | null }>;
};

type SubmittedHistorySearch = {
  search: string;
  entityType: HistoryEntityType | "";
  entityId: string;
};

const ENTITY_OPTIONS: Array<{ value: HistoryEntityType; label: string }> = [
  { value: "unit", label: "Unidad" },
  { value: "commercial_order", label: "Pedido" },
  { value: "digital_batch", label: "Lote digital" },
  { value: "print_order", label: "Imprenta" },
  { value: "production_order", label: "Producción" },
  { value: "dispatch", label: "Despacho" },
  { value: "warranty", label: "Garantía" },
  { value: "replacement", label: "Reemplazo" },
  { value: "return", label: "Devolución" },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const severityStyles: Record<string, string> = {
  info: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-rose-100 text-rose-700 border-rose-200",
};

export function HistorySection() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<HistoryEntityType | "">("");
  const [submitted, setSubmitted] = useState<SubmittedHistorySearch>({
    search: "",
    entityType: "",
    entityId: "",
  });
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!submitted.search && !submitted.entityId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (submitted.search) params.set("search", submitted.search);
        if (submitted.entityType) params.set("entityType", submitted.entityType);
        if (submitted.entityId) params.set("entityId", submitted.entityId);
        const res = await fetch(`/api/admin/operations/history?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "No se pudo cargar historial");
        setData(payload as HistoryResponse);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar historial");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [submitted]);

  const empty = useMemo(
    () =>
      !loading &&
      !data?.subject &&
      !data?.suggestions?.length &&
      !submitted.search &&
      !submitted.entityId,
    [loading, data, submitted.search, submitted.entityId]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight">
          <History className="h-8 w-8 text-primary" />
          Historial
        </h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Buscar
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Etiqueta, pedido, despacho, lote..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </label>
          <label className="lg:w-56">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Tipo
            </span>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as HistoryEntityType | "")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">Todos</option>
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              setSubmitted({ search: search.trim(), entityType, entityId: "" })
            }
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Buscar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : data?.suggestions?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Resultados</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {data.suggestions.map((item) => (
              <button
                key={`${item.type}:${item.id}`}
                type="button"
                onClick={() =>
                  setSubmitted({
                    search: item.label,
                    entityType: item.type,
                    entityId: item.id,
                  })
                }
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500">{item.subtitle || item.type}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {data?.subject ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Registro</p>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">
              {data.subject.title}
            </h3>
            <p className="text-sm text-slate-500">{data.subject.subtitle}</p>
            <div className="flex flex-wrap gap-2 pt-2 text-xs">
              {data.summary.currentStatus ? (
                <span className="rounded-full border px-2.5 py-1">
                  {data.summary.currentStatus}
                </span>
              ) : null}
              {data.summary.activationStatus ? (
                <span className="rounded-full border px-2.5 py-1">
                  {data.summary.activationStatus}
                </span>
              ) : null}
              {data.summary.deliveredPendingActivation ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                  Entregado · pendiente de activar
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {data?.timeline?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
              Actividad
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.timeline.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <div className="font-semibold text-slate-950 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.description || item.eventType}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.internalLabel || item.entityCode || item.entityType}
                      {item.productName ? ` · ${item.productName}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full border px-2.5 py-1 ${severityStyles[item.severity]}`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-slate-500">{formatDateTime(item.occurredAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading &&
      !data?.subject &&
      !data?.timeline?.length &&
      (submitted.search || submitted.entityId) ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <AlertTriangle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-black uppercase tracking-widest text-slate-400">
            Sin resultados
          </p>
        </div>
      ) : null}

      {empty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-black uppercase tracking-widest text-slate-400">
            Busca un pedido, despacho o etiqueta interna.
          </p>
        </div>
      ) : null}
    </div>
  );
}

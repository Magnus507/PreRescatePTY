"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Filter, Loader2, Route, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Movement = {
  id: string;
  source: string;
  eventType: string;
  label: string;
  description: string | null;
  occurredAt: string;
  entityType: string;
  entityCode: string | null;
  internalLabel: string | null;
  productCode: string | null;
  productName: string | null;
  commercialOrderId: string | null;
  dispatchId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  severity: "info" | "success" | "warning" | "danger";
  metadataSafe: Record<string, unknown>;
};

const SOURCE_LABELS: Record<string, string> = {
  material: "Material",
  digital_batch: "Lote digital",
  print_order: "Orden imprenta",
  production: "Producción",
  qa: "QA",
  packing: "Empaque",
  finished_good: "Producto terminado",
  finished_good_unit: "Unidad terminada",
  commercial_order: "Pedido",
  dispatch: "Despacho",
  warranty: "Garantía",
  replacement: "Reemplazo",
  return: "Devolución",
  activation: "Activación",
};

const SEVERITY_STYLES: Record<Movement["severity"], string> = {
  info: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-rose-100 text-rose-700 border-rose-200",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sourceLabel(value: string) {
  return SOURCE_LABELS[value] || value;
}

export function InventoryMovementsSection() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMovements() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (source) params.set("source", source);
        if (query.trim()) params.set("search", query.trim());

        const res = await fetch(`/api/admin/operations/movements?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "No se pudo cargar el historial consolidado");
        }

        if (!cancelled) {
          setMovements((data.movements as Movement[]) || []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "No se pudo cargar el historial");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMovements();
    return () => {
      cancelled = true;
    };
  }, [query, source]);

  const summary = useMemo(() => {
    const bySource = new Map<string, number>();
    for (const movement of movements) {
      bySource.set(movement.source, (bySource.get(movement.source) || 0) + 1);
    }
    return {
      total: movements.length,
      sources: Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [movements]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3">
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight">
          <Route className="h-8 w-8 text-primary" />
          Movimientos automáticos
        </h2>
        <p className="max-w-3xl text-sm font-medium text-muted-foreground">
          Este historial consolida eventos operativos reales en una sola vista de lectura, sin convertirlo en una fuente manual de stock.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{summary.total}</p>
          <p className="mt-2 text-xs text-slate-500">Movimientos normalizados visibles</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fuentes principales</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.sources.slice(0, 6).map(([key, count]) => (
              <span key={key} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {sourceLabel(key)} · {count}
              </span>
            ))}
            {summary.sources.length === 0 && (
              <span className="text-sm text-slate-500">Sin movimientos cargados todavía.</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar etiqueta, producto o pedido"
                className="w-72 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="">Todas las fuentes</option>
              {Object.keys(SOURCE_LABELS).map((key) => (
                <option key={key} value={key}>
                  {SOURCE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Historial consolidado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Fuente</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Movimiento</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad / producto</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Referencia</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Severidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando movimientos...
                    </div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                      <AlertTriangle className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                        No hay movimientos para mostrar
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        Cuando los módulos operativos empiecen a emitir eventos, esta vista los consolidará aquí.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id} className="align-top">
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        {formatDateTime(movement.occurredAt)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        {sourceLabel(movement.source)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950 dark:text-white">{movement.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{movement.eventType}</div>
                      {movement.description ? <div className="mt-1 text-xs text-slate-500">{movement.description}</div> : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950 dark:text-white">
                        {movement.internalLabel || movement.entityCode || "Sin etiqueta"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {movement.productCode || movement.productName || movement.entityType}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {movement.commercialOrderId || movement.dispatchId || movement.referenceId || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_STYLES[movement.severity]}`}>
                        {movement.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Regla operativa</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Esta vista solo normaliza eventos ya emitidos por los módulos operativos. No calcula stock manual ni edita el historial existente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

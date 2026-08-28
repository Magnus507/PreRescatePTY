"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import type { DispatchViewModel } from "@/lib/operations/dispatch-view-model";

const STATUS_CLASS: Record<string, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-800",
  pending_pick: "border-amber-200 bg-amber-50 text-amber-800",
  pending_preparation: "border-amber-200 bg-amber-50 text-amber-800",
  prepared: "border-blue-200 bg-blue-50 text-blue-800",
  sent: "border-violet-200 bg-violet-50 text-violet-800",
  shipped: "border-violet-200 bg-violet-50 text-violet-800",
  dispatched: "border-violet-200 bg-violet-50 text-violet-800",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

export function DirectDispatchSection() {
  const [dispatches, setDispatches] = useState<DispatchViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadDispatches = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch(`/api/admin/operations/dispatches?_t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los despachos");
      setDispatches(Array.isArray(data.dispatches) ? data.dispatches : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los despachos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDispatches();
    const timer = window.setInterval(() => void loadDispatches({ silent: true }), 15_000);
    return () => window.clearInterval(timer);
  }, [loadDispatches]);

  const counts = useMemo(() => {
    const active = dispatches.filter((dispatch) => !["delivered", "cancelled"].includes(dispatch.status)).length;
    const prepared = dispatches.filter((dispatch) => dispatch.status === "prepared").length;
    const inTransit = dispatches.filter((dispatch) => ["sent", "shipped", "dispatched"].includes(dispatch.status)).length;
    const delivered = dispatches.filter((dispatch) => dispatch.status === "delivered").length;
    return { active, prepared, inTransit, delivered };
  }, [dispatches]);

  const postAction = async (key: string, url: string, body?: Record<string, unknown>) => {
    setSavingKey(key);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo completar la acción");
      await loadDispatches({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">Despachos</h2>
        <button type="button" onClick={() => loadDispatches({ silent: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Activos", counts.active],
          ["Preparados", counts.prepared],
          ["En tránsito", counts.inTransit],
          ["Entregados", counts.delivered],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {dispatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
          <Truck className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">Sin despachos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dispatches.map((dispatch) => {
            const busy = savingKey?.startsWith(`${dispatch.id}:`) || false;
            return (
              <article key={dispatch.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-black text-slate-950 dark:text-white">{dispatch.code}</span>
                      <span className="font-mono text-sm font-black text-primary">#{dispatch.orderCode}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${STATUS_CLASS[dispatch.status] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                        {dispatch.statusLabel}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
                        <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{dispatch.customerName}</p>
                        <p className="text-xs font-semibold text-slate-500">{dispatch.customerPhone || dispatch.customerEmail || "—"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entrega</p>
                        <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{dispatch.city || "—"}</p>
                        <p className="text-xs font-semibold text-slate-500">{dispatch.address || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dispatch.canMarkPrepared && (
                      <button type="button" disabled={busy} onClick={() => postAction(`${dispatch.id}:prepared`, `/api/admin/operations/dispatches/${dispatch.id}/mark-prepared`)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                        Preparado
                      </button>
                    )}
                    {dispatch.canMarkSent && (
                      <button type="button" disabled={busy} onClick={() => postAction(`${dispatch.id}:sent`, `/api/admin/operations/dispatches/${dispatch.id}/mark-sent`)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                        Enviado
                      </button>
                    )}
                    {dispatch.canConfirmDelivery && (
                      <button type="button" disabled={busy} onClick={() => postAction(`${dispatch.id}:delivered`, `/api/admin/operations/dispatches/${dispatch.id}/confirm-delivery`)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
                        Entregado
                      </button>
                    )}
                  </div>
                </div>

                {dispatch.units.length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    {dispatch.units.map((unit) => {
                      const pickKey = `${dispatch.id}:unit:${unit.id}`;
                      return (
                        <div key={unit.id} className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <PackageCheck className={`h-4 w-4 ${unit.picked ? "text-emerald-600" : "text-slate-400"}`} />
                            <div>
                              <p className="font-mono text-sm font-black text-slate-900 dark:text-white">{unit.internalLabel}</p>
                              <p className="text-[10px] font-bold text-slate-500">{unit.productName || unit.productCode}</p>
                            </div>
                          </div>
                          {dispatch.canMarkUnitPicked ? (
                            <button type="button" disabled={savingKey === pickKey} onClick={() => postAction(pickKey, `/api/admin/operations/dispatches/${dispatch.id}/mark-unit-picked`, { unitId: unit.id, picked: !unit.picked })} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest ${unit.picked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
                              {savingKey === pickKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              {unit.picked ? "Tomada" : "Picking"}
                            </button>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{unit.picked ? "Tomada" : unit.inventoryStatus}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-bold text-slate-400">
                  <span>Creado {formatDate(dispatch.createdAt)}</span>
                  {dispatch.preparedAt && <span>Preparado {formatDate(dispatch.preparedAt)}</span>}
                  {dispatch.sentAt && <span>Enviado {formatDate(dispatch.sentAt)}</span>}
                  {dispatch.deliveredAt && <span>Entregado {formatDate(dispatch.deliveredAt)}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

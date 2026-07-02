"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface DigitalBatchItem {
  id: string;
  internalLabel: string;
  status: string;
  batchId: string;
}

interface Unit {
  id: string;
  internalLabel: string;
  productCode: string;
  productName: string;
  productType: string;
  status: string;
  qaStatus: string | null;
  activationStatus: string;
  createdAt: string;
  deliveredAt?: string | null;
  reservedOrderId?: string | null;
  reservedAt?: string | null;
  deliveredPendingActivation?: boolean;
  alertLabel?: string | null;
  dispatch?: { id: string; code: string; status: string } | null;
  digitalBatchItem?: DigitalBatchItem | null;
}

interface Counts {
  qaPendingCount: number;
  availableCount: number;
  reservedCount: number;
  deliveredCount: number;
  notActivatedCount: number;
  deliveredPendingActivationCount: number;
}

export function FinishedGoodUnitsSection() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<DigitalBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [counts, setCounts] = useState<Counts>({
    qaPendingCount: 0,
    availableCount: 0,
    reservedCount: 0,
    deliveredCount: 0,
    notActivatedCount: 0,
    deliveredPendingActivationCount: 0,
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (filterStatus === "delivered_pending_activation") {
        params.set("deliveredPendingActivation", "true");
      } else if (filterStatus) {
        params.set("status", filterStatus);
      }
      if (filterSearch) params.set("search", filterSearch);
      const [unitsRes, batchesRes] = await Promise.all([
        fetch(`/api/admin/operations/finished-good-units?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/admin/operations/digital-batches", { cache: "no-store" }),
      ]);
      const unitsData = await unitsRes.json();
      const batchesData = await batchesRes.json();
      if (!unitsRes.ok) throw new Error(unitsData.error || "No se pudieron cargar unidades");
      if (!batchesRes.ok) throw new Error(batchesData.error || "No se pudieron cargar lotes");
      setUnits(Array.isArray(unitsData.units) ? unitsData.units : []);
      setCounts(
        unitsData.counts || {
          qaPendingCount: 0,
          availableCount: 0,
          reservedCount: 0,
          deliveredCount: 0,
          notActivatedCount: 0,
          deliveredPendingActivationCount: 0,
        }
      );
      const flattened: DigitalBatchItem[] = Array.isArray(batchesData.batches)
        ? batchesData.batches.flatMap((batch: { id: string; items?: DigitalBatchItem[] }) =>
            Array.isArray(batch.items)
              ? batch.items.map((item) => ({ ...item, batchId: batch.id }))
              : []
          )
        : [];
      setItems(flattened.filter((item: DigitalBatchItem) => item.status === "printed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar unidades");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterSearch, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!selectedItemId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/finished-good-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digitalBatchItemId: selectedItemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear unidad");
      toast.success("Unidad creada");
      setSelectedItemId("");
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear unidad");
    } finally {
      setSaving(false);
    }
  };

  const runUnitAction = async (unitId: string, action: string, reason?: string, referenceType?: string, referenceId?: string) => {
    const res = await fetch(`/api/admin/operations/finished-good-units/${unitId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, referenceType, referenceId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo ejecutar la accion");
    await loadData({ silent: true });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-950">Unidades físicas trazables</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cada unidad representa inventario físico real con etiqueta interna, estado QC, reserva, despacho y activación.
            </p>
          </div>
          <div className="flex gap-2">
            <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Buscar etiqueta interna" className="min-w-[220px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
              <option value="">Todos los estados</option>
              <option value="qa_pending">QA pendiente</option>
              <option value="available">Disponibles</option>
              <option value="reserved">Reservadas</option>
              <option value="qa_failed">QA fallida</option>
              <option value="dispatched">Despachadas</option>
              <option value="delivered">Entregadas</option>
              <option value="activated">Activadas</option>
              <option value="delivered_pending_activation">Entregadas, pendiente de activación</option>
            </select>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="min-w-[280px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
              <option value="">Selecciona item impreso</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.internalLabel}</option>
              ))}
            </select>
            <button type="button" onClick={handleCreate} disabled={saving || !selectedItemId} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear unidad física desde QR/link impreso
            </button>
            <button type="button" onClick={() => loadData({ silent: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pendientes QC</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.qaPendingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disponibles</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.availableCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reservadas</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.reservedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Entregadas</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.deliveredCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No activadas</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.notActivatedCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Entregadas, pendiente de activación</p>
            <p className="mt-2 text-2xl font-black text-amber-950">{counts.deliveredPendingActivationCount}</p>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          La entrega no asigna usuario final. El usuario final se define al activar el código.
        </p>
      </section>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {units.map((unit) => (
            <article key={unit.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="font-mono text-xs font-black text-primary">{unit.internalLabel}</p>
              <h4 className="mt-2 text-sm font-black text-slate-950">{unit.productName}</h4>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">{unit.productCode} · {unit.productType}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Estado inventario: {unit.status} · QC: {unit.qaStatus || "pending"} · Activación: {unit.activationStatus}</p>
              {unit.alertLabel && (
                <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800">
                  {unit.alertLabel}
                </p>
              )}
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                Reserva: {unit.reservedOrderId || "sin reserva"} · Entrega: {unit.deliveredAt ? new Date(unit.deliveredAt).toLocaleDateString("es-PA") : "sin entrega"}
              </p>
              {unit.dispatch && (
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  Despacho: {unit.dispatch.code} · {unit.dispatch.status}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {unit.status !== "available" && unit.status !== "reserved" && (
                  <button type="button" onClick={() => runUnitAction(unit.id, "qa_pass")} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                    Aprobar QC
                  </button>
                )}
                {unit.status === "available" && (
                  <button
                    type="button"
                    onClick={() => {
                      const orderId = window.prompt("Reference ID de la orden comercial:");
                      if (!orderId) return;
                      const reason = window.prompt("Motivo de la reserva (opcional):") || "";
                      runUnitAction(unit.id, "reserve", reason, "commercial_order", orderId).catch((error) => toast.error(error instanceof Error ? error.message : "Error al reservar"));
                    }}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-800"
                  >
                    Reservar para pedido
                  </button>
                )}
                {unit.status === "reserved" && (
                  <button
                    type="button"
                    onClick={() => runUnitAction(unit.id, "release").catch((error) => toast.error(error instanceof Error ? error.message : "Error al liberar"))}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-800"
                  >
                    Liberar reserva
                  </button>
                )}
                {unit.deliveredPendingActivation && (
                  <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-800">
                    Entregado, pendiente de activación
                  </span>
                )}
                {unit.status === "qa_failed" && (
                  <button
                    type="button"
                    onClick={() => runUnitAction(unit.id, "discard", "Descartada por QA").catch((error) => toast.error(error instanceof Error ? error.message : "Error al descartar"))}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-800"
                  >
                    Descartar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

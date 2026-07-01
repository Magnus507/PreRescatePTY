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
  digitalBatchItem?: DigitalBatchItem | null;
}

export function FinishedGoodUnitsSection() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<DigitalBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [unitsRes, batchesRes] = await Promise.all([
        fetch("/api/admin/operations/finished-good-units", { cache: "no-store" }),
        fetch("/api/admin/operations/digital-batches", { cache: "no-store" }),
      ]);
      const unitsData = await unitsRes.json();
      const batchesData = await batchesRes.json();
      if (!unitsRes.ok) throw new Error(unitsData.error || "No se pudieron cargar unidades");
      if (!batchesRes.ok) throw new Error(batchesData.error || "No se pudieron cargar lotes");
      setUnits(Array.isArray(unitsData.units) ? unitsData.units : []);
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
  }, []);

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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-950">Unidades terminadas</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Creadas desde items impresos, con etiqueta interna unica.</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="min-w-[280px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
              <option value="">Selecciona item printed</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.internalLabel}</option>
              ))}
            </select>
            <button type="button" onClick={handleCreate} disabled={saving || !selectedItemId} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear unidad
            </button>
            <button type="button" onClick={() => loadData({ silent: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>
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
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Estado: {unit.status} · QA: {unit.qaStatus || "pending"} · Activacion: {unit.activationStatus}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

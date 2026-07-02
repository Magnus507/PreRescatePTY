"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCopy, ExternalLink, Loader2, Plus, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface DigitalBatchItem {
  id: string;
  internalLabel: string;
  status: string;
  batchId: string;
}

interface UnitEvent {
  id: string;
  eventType: string;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface Unit {
  id: string;
  internalLabel: string;
  shortCode: string | null;
  productCode: string;
  productName: string;
  productType: string;
  status: string;
  inventoryStatus?: string;
  qaStatus: string | null;
  activationStatus: string;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string | null;
  reservedOrderId?: string | null;
  reservedAt?: string | null;
  productionOrderId?: string | null;
  productionOrderCode?: string | null;
  productionOrderStatus?: string | null;
  dispatchId?: string | null;
  dispatchStatus?: string | null;
  deliveredPendingActivation?: boolean;
  alertLabel?: string | null;
  lastEvent?: UnitEvent | null;
  digitalBatchItem?: DigitalBatchItem | null;
  digitalBatch?: { id: string; code: string; name: string } | null;
  printOrder?: { id: string; code: string; status: string } | null;
  events?: UnitEvent[];
}

interface Counts {
  qaPendingCount: number;
  availableCount: number;
  reservedCount: number;
  deliveredCount: number;
  notActivatedCount: number;
  deliveredPendingActivationCount: number;
}

const DEFAULT_COUNTS: Counts = {
  qaPendingCount: 0,
  availableCount: 0,
  reservedCount: 0,
  deliveredCount: 0,
  notActivatedCount: 0,
  deliveredPendingActivationCount: 0,
};

const FILTERS = [
  { value: "", label: "Todas" },
  { value: "available", label: "Disponibles" },
  { value: "reserved", label: "Reservadas" },
  { value: "qa_pending", label: "Pendientes QC" },
  { value: "qa_failed", label: "Fallidas QC" },
  { value: "delivered_pending_activation", label: "Entregadas sin activar" },
  { value: "delivered", label: "Entregadas" },
  { value: "activated", label: "Activadas" },
] as const;

function statusLabel(value: string) {
  if (value === "available") return "Disponible";
  if (value === "reserved") return "Reservada";
  if (value === "qa_pending") return "Pendiente QC";
  if (value === "qa_failed") return "Fallida QC";
  if (value === "dispatched") return "Despachada";
  if (value === "delivered") return "Entregada";
  if (value === "activated") return "Activada";
  return value;
}

function qaLabel(value: string | null) {
  if (value === "passed") return "QC aprobado";
  if (value === "failed") return "QC fallido";
  if (value === "pending") return "QC pendiente";
  return value || "Sin QC";
}

function activationLabel(value: string) {
  if (value === "not_activated") return "No activada";
  if (value === "activated") return "Activada";
  return value;
}

function getHumanHint(unit: Unit) {
  if (unit.status === "available") return "Disponible para reserva de pedido. Sin usuario final.";
  if (unit.status === "reserved") return "Reservada para pedido. No asignada a usuario final.";
  if (unit.status === "delivered" && unit.activationStatus === "not_activated") return "Entregada, pendiente de activación.";
  if (unit.status === "activated") return "Activada por usuario final fuera de Operaciones.";
  return "Unidad trazable operativa.";
}

export function FinishedGoodUnitsSection() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<DigitalBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>(DEFAULT_COUNTS);

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filterStatus === "delivered_pending_activation") {
        params.set("deliveredPendingActivation", "true");
      } else if (filterStatus) {
        params.set("inventoryStatus", filterStatus);
      }
      if (filterSearch.trim()) params.set("search", filterSearch.trim());

      const [unitsRes, batchesRes] = await Promise.all([
        fetch(`/api/admin/operations/finished-good-units?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/admin/operations/digital-batches", { cache: "no-store" }),
      ]);
      const unitsData = await unitsRes.json();
      const batchesData = await batchesRes.json();

      if (!unitsRes.ok) throw new Error(unitsData.error || "No se pudieron cargar unidades");
      if (!batchesRes.ok) throw new Error(batchesData.error || "No se pudieron cargar lotes");

      setUnits(Array.isArray(unitsData.units) ? unitsData.units : []);
      setCounts(unitsData.counts || DEFAULT_COUNTS);

      const flattened: DigitalBatchItem[] = Array.isArray(batchesData.batches)
        ? batchesData.batches.flatMap((batch: { id: string; items?: DigitalBatchItem[] }) =>
            Array.isArray(batch.items) ? batch.items.map((item) => ({ ...item, batchId: batch.id })) : []
          )
        : [];
      setItems(flattened.filter((item) => item.status === "printed"));
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

  const availableCount = useMemo(
    () => units.filter((unit) => unit.status === "available" && unit.qaStatus === "passed" && unit.activationStatus === "not_activated" && !unit.reservedOrderId).length,
    [units]
  );

  const copyValue = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Inventario</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Unidades físicas trazables</h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
              Control de unidades físicas aprobadas por QC, reservadas, fallidas, despachadas o entregadas. No asigna usuario final.
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              QR, shortCode y enlace público se conservan; Operaciones solo visualiza y reserva.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Buscar internalLabel / shortCode / pedido"
              className="min-w-[240px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none"
            >
              {FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none"
            >
              <option value="">Selecciona item impreso</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.internalLabel}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !selectedItemId}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear unidad física
            </button>
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disponibles</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.availableCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reservadas</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.reservedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pendientes QC</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.qaPendingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fallidas QC</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{units.filter((unit) => unit.status === "qa_failed").length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Entregadas</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{counts.deliveredCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Entregadas sin activar</p>
            <p className="mt-2 text-2xl font-black text-amber-950">{counts.deliveredPendingActivationCount}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            {availableCount} disponibles para reserva segura
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
            <ShieldAlert className="h-4 w-4" />
            La activación ocurre fuera de Operaciones
          </span>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {units.map((unit) => {
            const expanded = expandedUnitId === unit.id;
            return (
              <article key={unit.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-black text-primary">{unit.internalLabel}</p>
                    <h4 className="mt-2 text-sm font-black text-slate-950">{unit.productName}</h4>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {unit.productCode} · {unit.productType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedUnitId(expanded ? null : unit.id)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600"
                  >
                    {expanded ? "Cerrar" : "Detalle"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">{statusLabel(unit.inventoryStatus || unit.status)}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">{qaLabel(unit.qaStatus)}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">{activationLabel(unit.activationStatus)}</span>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-600">{getHumanHint(unit)}</p>
                {unit.alertLabel && (
                  <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800">
                    {unit.alertLabel}
                  </p>
                )}

                <div className="mt-3 space-y-1 text-[11px] font-semibold text-slate-500">
                  <p>Reserva: {unit.reservedOrderId || "sin reserva"}</p>
                  <p>Producción: {unit.productionOrderCode || unit.productionOrderId || "sin vínculo"}</p>
                  <p>Despacho: {unit.dispatchId || "sin despacho"}</p>
                  <p>Creada: {new Date(unit.createdAt).toLocaleDateString("es-PA")}</p>
                </div>

                {expanded && (
                  <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identidad</p>
                        <p className="mt-1 font-bold text-slate-900">InternalLabel: {unit.internalLabel}</p>
                        <p className="font-bold text-slate-900">ShortCode: {unit.shortCode || "sin shortCode"}</p>
                        {unit.shortCode && (
                          <button
                            type="button"
                            onClick={() => copyValue(`/e/${unit.shortCode}`, "URL pública")}
                            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                          >
                            <ClipboardCopy className="h-4 w-4" />
                            Copiar URL pública
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventario</p>
                        <p className="mt-1 font-bold text-slate-900">Inventario: {statusLabel(unit.inventoryStatus || unit.status)}</p>
                        <p className="font-bold text-slate-900">QC: {qaLabel(unit.qaStatus)}</p>
                        <p className="font-bold text-slate-900">Activación: {activationLabel(unit.activationStatus)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producción</p>
                        <p className="mt-1 font-bold text-slate-900">Orden: {unit.productionOrderCode || "sin orden"}</p>
                        <p className="font-bold text-slate-900">Etapa: {unit.productionOrderStatus || "sin estado"}</p>
                        <p className="font-bold text-slate-900">Lote digital: {unit.digitalBatch?.code || unit.digitalBatchItem?.batchId || "sin lote"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido y despacho</p>
                        <p className="mt-1 font-bold text-slate-900">Pedido reservado: {unit.reservedOrderId || "sin pedido"}</p>
                        <p className="font-bold text-slate-900">Despacho: {unit.dispatchStatus || "sin despacho"}</p>
                        <p className="font-bold text-slate-900">Último evento: {unit.lastEvent?.eventType || "sin eventos"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyValue(unit.internalLabel, "InternalLabel")}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                      >
                        Copiar etiqueta
                      </button>
                      {unit.shortCode && (
                        <button
                          type="button"
                          onClick={() => copyValue(unit.shortCode!, "ShortCode")}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                        >
                          Copiar shortCode
                        </button>
                      )}
                      {unit.shortCode && (
                        <a
                          href={`/e/${unit.shortCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir enlace público
                        </a>
                      )}
                    </div>

                    {Array.isArray(unit.events) && unit.events.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Historial reciente</p>
                        {unit.events.slice(-3).reverse().map((event) => (
                          <div key={event.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                            <strong className="text-slate-900">{event.eventType}</strong>
                            <span className="ml-2">{event.reason || "Sin motivo"}</span>
                            <span className="ml-2 text-slate-400">{new Date(event.createdAt).toLocaleString("es-PA")}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      {getHumanHint(unit)}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

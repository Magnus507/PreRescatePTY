"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Factory,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";

const FLOW = [
  "Produccion",
  "QC",
  "Empaque",
  "Inventario terminado",
  "Venta",
  "Salida",
];

const FUTURE_ACTIONS = [
  { label: "Reservar", hint: "Pendiente de movimientos PT" },
  { label: "Ajustar", hint: "Pendiente de movimientos PT" },
  { label: "Enviar a punto de venta", hint: "Pendiente de despacho" },
];

const FINISHED_GOOD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  inactive: { label: "Inactivo", color: "bg-slate-50 border-slate-200 text-slate-700" },
  reserved: { label: "Reservado", color: "bg-amber-50 border-amber-200 text-amber-800" },
};

interface PackingBatchOption {
  id: string;
  code: string;
  status: string;
  packageType: string;
  plannedQuantity: number;
  packedQuantity: number;
  rejectedQuantity: number;
  labelCode: string | null;
}

interface FinishedGood {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
  unit: string;
  packingBatchId: string | null;
  notes: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
  packingBatch: PackingBatchOption | null;
}

interface FinishedGoodFormState {
  code: string;
  name: string;
  productType: string;
  unit: string;
  packingBatchId: string;
  initialQuantity: string;
  notes: string;
}

const EMPTY_FINISHED_GOOD_FORM: FinishedGoodFormState = {
  code: "",
  name: "",
  productType: "",
  unit: "unit",
  packingBatchId: "",
  initialQuantity: "",
  notes: "",
};

export function FinishedGoodsSection() {
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [packingBatches, setPackingBatches] = useState<PackingBatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FinishedGoodFormState>(EMPTY_FINISHED_GOOD_FORM);

  const loadFinishedGoods = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/operations/finished-goods", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo cargar Inventario PT");
      }

      setFinishedGoods(Array.isArray(data.finishedGoods) ? data.finishedGoods : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar Inventario PT";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadPackingBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/packing-batches", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar batches de empaque");
      }

      setPackingBatches(Array.isArray(data.packingBatches) ? data.packingBatches : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar batches de empaque";
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    loadFinishedGoods();
    loadPackingBatches();
  }, [loadFinishedGoods, loadPackingBatches]);

  const metrics = useMemo(() => {
    return finishedGoods.reduce(
      (acc, item) => {
        acc.skus += 1;
        acc.available += item.balance;

        if (item.packingBatch) {
          acc.fromPacking += 1;
        }

        if (item.status === "reserved") {
          acc.reserved += item.balance;
        }

        return acc;
      },
      { skus: 0, available: 0, fromPacking: 0, reserved: 0 }
    );
  }, [finishedGoods]);

  const selectablePackingBatches = useMemo(() => {
    return [...packingBatches]
      .filter((batch) => batch.status !== "cancelled")
      .sort((a, b) => {
        const aCompleted = a.status === "completed" ? 0 : 1;
        const bCompleted = b.status === "completed" ? 0 : 1;
        return aCompleted - bCompleted || a.code.localeCompare(b.code);
      });
  }, [packingBatches]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatQuantity = (value: number) => {
    return new Intl.NumberFormat("es-PA", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const updateForm = (field: keyof FinishedGoodFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setForm(EMPTY_FINISHED_GOOD_FORM);
  };

  const handleCreateFinishedGood = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim();
    const name = form.name.trim();
    const productType = form.productType.trim();
    const unit = form.unit.trim() || "unit";
    const initialQuantity = form.initialQuantity.trim() ? Number(form.initialQuantity) : undefined;

    if (!code) {
      toast.error("Code es requerido");
      return;
    }

    if (!name) {
      toast.error("Name es requerido");
      return;
    }

    if (!productType) {
      toast.error("productType es requerido");
      return;
    }

    if (initialQuantity !== undefined && (!Number.isFinite(initialQuantity) || initialQuantity <= 0)) {
      toast.error("initialQuantity debe ser positivo");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/operations/finished-goods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          productType,
          unit,
          packingBatchId: form.packingBatchId || null,
          initialQuantity,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || "Ya existe un producto terminado con ese code");
        }
        throw new Error(data.error || "No se pudo crear producto terminado");
      }

      toast.success("Producto terminado creado");
      setShowCreateModal(false);
      setForm(EMPTY_FINISHED_GOOD_FORM);
      await loadFinishedGoods({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear producto terminado";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Producto vendible
            </div>
            <h3 className="text-2xl font-black tracking-tight text-emerald-950">Productos Terminados</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-800">
              El stock normal viene de Produccion, luego Control de Calidad, luego Empaque. Solo despues entra a inventario terminado listo para venta o punto de venta.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-700">
            Balance calculado por eventos
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-slate-500">Ruta de entrada a stock normal</h3>
        <div className="flex overflow-x-auto pb-2">
          {FLOW.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="min-w-[150px] rounded-2xl bg-slate-50 px-4 py-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {index + 1}</p>
                <p className="mt-2 text-sm font-black text-slate-800">{step}</p>
              </div>
              {index < FLOW.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-slate-300" />}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Warehouse className="mb-4 h-6 w-6 text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Productos</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.skus}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PackageCheck className="mb-4 h-6 w-6 text-emerald-600" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Balance total</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{formatQuantity(metrics.available)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Factory className="mb-4 h-6 w-6 text-blue-600" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Desde empaque</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.fromPacking}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Boxes className="mb-4 h-6 w-6 text-amber-600" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reservado</h4>
          <p className="mt-2 text-2xl font-black text-slate-950">{formatQuantity(metrics.reserved)}</p>
        </article>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
              Inventario PT
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Crear producto
            </button>
            <button
              type="button"
              onClick={() => loadFinishedGoods({ silent: true })}
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : finishedGoods.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <Warehouse className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              No hay producto terminado registrado
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Los productos creados desde esta seccion apareceran aqui con balance calculado por eventos.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Balance</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Empaque</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Creado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finishedGoods.map((item) => {
                  const status = FINISHED_GOOD_STATUS_CONFIG[item.status] || {
                    label: item.status,
                    color: "bg-slate-50 border-slate-200 text-slate-700",
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-black text-primary">{item.code}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-black text-slate-900">{item.name}</p>
                        {item.notes && (
                          <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.productType}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.unit}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-emerald-700">
                        {formatQuantity(item.balance)}
                      </td>
                      <td className="px-4 py-4">
                        {item.packingBatch ? (
                          <div>
                            <p className="font-mono text-xs font-black text-slate-900">{item.packingBatch.code}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              {item.packingBatch.status} · {item.packingBatch.packageType}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Sin empaque</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(item.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Acciones pendientes</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUTURE_ACTIONS.map((action) => (
            <button key={action.label} type="button" disabled className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left opacity-60">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
                <Store className="h-4 w-4" />
                {action.label}
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">{action.hint}</p>
            </button>
          ))}
        </div>
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateFinishedGood} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Inventario PT</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear producto terminado</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Registra producto terminado con balance inicial opcional por evento RECEIPT.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Code</span>
                  <input
                    required
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="PT-STOCK-001"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Sticker NFC listo para venta"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de producto</span>
                  <input
                    required
                    value={form.productType}
                    onChange={(event) => updateForm("productType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="sticker_nfc_qr"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</span>
                  <input
                    value={form.unit}
                    onChange={(event) => updateForm("unit", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="unit"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad inicial</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.initialQuantity}
                    onChange={(event) => updateForm("initialQuantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="0"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Empaque</span>
                  <select
                    value={form.packingBatchId}
                    onChange={(event) => updateForm("packingBatchId", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">Sin empaque vinculado</option>
                    {selectablePackingBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.code} · {batch.status} · {batch.packageType} · {batch.packedQuantity} empacados
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Se muestran primero batches completed; cancelled queda fuera del selector.
                  </p>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Notas internas de producto terminado"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

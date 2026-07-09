"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, FileText, Loader2, PackageCheck, Plus, RefreshCw, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { DispatchViewModel } from "@/lib/operations/dispatch-view-model";

interface FinishedGoodOption {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
  unit: string;
  balance: number;
}

interface DispatchFormItem {
  finishedGoodId: string;
  quantity: string;
  unit: string;
  notes: string;
}

interface DispatchFormState {
  code: string;
  destinationType: string;
  destinationName: string;
  destinationReference: string;
  destinationAddress: string;
  scheduledAt: string;
  notes: string;
  items: DispatchFormItem[];
}

const DISPATCH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Pendiente de preparación", color: "bg-slate-50 border-slate-200 text-slate-700" },
  pending_pick: { label: "Pendiente de preparación", color: "bg-amber-50 border-amber-200 text-amber-800" },
  pending_preparation: { label: "Pendiente de preparación", color: "bg-amber-50 border-amber-200 text-amber-800" },
  reserved: { label: "Pendiente de preparación", color: "bg-amber-50 border-amber-200 text-amber-800" },
  released: { label: "Pendiente de preparación", color: "bg-amber-50 border-amber-200 text-amber-800" },
  prepared: { label: "Pedido preparado", color: "bg-blue-50 border-blue-200 text-blue-800" },
  sent: { label: "Pedido enviado", color: "bg-purple-50 border-purple-200 text-purple-800" },
  shipped: { label: "Pedido enviado", color: "bg-purple-50 border-purple-200 text-purple-800" },
  dispatched: { label: "Pedido enviado", color: "bg-purple-50 border-purple-200 text-purple-800" },
  delivered: { label: "Pedido entregado", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelado", color: "bg-red-50 border-red-200 text-red-700" },
};

const EMPTY_DISPATCH_FORM: DispatchFormState = {
  code: "",
  destinationType: "customer",
  destinationName: "",
  destinationReference: "",
  destinationAddress: "",
  scheduledAt: "",
  notes: "",
  items: [{ finishedGoodId: "", quantity: "", unit: "unit", notes: "" }],
};

export function DispatchSection() {
  const [dispatches, setDispatches] = useState<DispatchViewModel[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEventKey, setSavingEventKey] = useState<string | null>(null);
  const [form, setForm] = useState<DispatchFormState>(EMPTY_DISPATCH_FORM);

  const loadDispatches = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/operations/dispatches", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar despachos");
      }

      setDispatches(Array.isArray(data.dispatches) ? data.dispatches : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar despachos";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadFinishedGoods = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/finished-goods", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo cargar inventario");
      }

      setFinishedGoods(Array.isArray(data.finishedGoods) ? data.finishedGoods : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar inventario";
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    loadDispatches();
    loadFinishedGoods();
  }, [loadDispatches, loadFinishedGoods]);

  const metrics = useMemo(() => {
    return dispatches.reduce(
      (acc, dispatch) => {
        acc.total += 1;
        acc.itemQuantity += dispatch.items.reduce((sum, item) => sum + item.quantity, 0);
        if (dispatch.status === "draft") acc.draft += 1;
        if (dispatch.status === "reserved") acc.reserved += 1;
        if (dispatch.status === "cancelled") acc.cancelled += 1;
        if (dispatch.scheduledAt && dispatch.status !== "delivered" && dispatch.status !== "cancelled") {
          acc.scheduled += 1;
        }
        if (dispatch.status === "dispatched") {
          acc.inTransit += 1;
        }
        if (dispatch.status === "delivered") {
          acc.delivered += 1;
        }
        return acc;
      },
      { total: 0, draft: 0, reserved: 0, scheduled: 0, inTransit: 0, delivered: 0, cancelled: 0, itemQuantity: 0 }
    );
  }, [dispatches]);

  const selectableFinishedGoods = useMemo(() => {
    return [...finishedGoods]
      .filter((item) => item.balance > 0)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [finishedGoods]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "Sin fecha";
    return new Date(value).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatQuantity = (value: number) => {
    return new Intl.NumberFormat("es-PA", { maximumFractionDigits: 2 }).format(value);
  };

  const updateForm = (field: keyof DispatchFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (index: number, field: keyof DispatchFormItem, value: string) => {
    setForm((current) => {
      const items = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === "finishedGoodId") {
          const selected = finishedGoods.find((finishedGood) => finishedGood.id === value);
          return {
            ...item,
            finishedGoodId: value,
            unit: selected?.unit || item.unit || "unit",
          };
        }

        return { ...item, [field]: value };
      });

      return { ...current, items };
    });
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { finishedGoodId: "", quantity: "", unit: "unit", notes: "" }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setForm(EMPTY_DISPATCH_FORM);
  };

  const validateDispatchItems = () => {
    for (const item of form.items) {
      if (!item.finishedGoodId) {
        toast.error("Cada item requiere producto terminado");
        return false;
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Cada item requiere quantity positivo");
        return false;
      }

      const finishedGood = finishedGoods.find((option) => option.id === item.finishedGoodId);
      if (!finishedGood || finishedGood.balance <= 0) {
        toast.error("Selecciona producto terminado con balance disponible");
        return false;
      }

      if (quantity > finishedGood.balance) {
        toast.error(`Quantity no puede superar balance disponible de ${finishedGood.code}`);
        return false;
      }
    }

    return true;
  };

  const handleCreateDispatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim();
    if (!code) {
      toast.error("code es requerido");
      return;
    }

    if (!validateDispatchItems()) return;

    setSaving(true);

    try {
      const res = await fetch("/api/admin/operations/dispatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          destinationType: form.destinationType || "customer",
          destinationName: form.destinationName.trim() || null,
          destinationReference: form.destinationReference.trim() || null,
          destinationAddress: form.destinationAddress.trim() || null,
          scheduledAt: form.scheduledAt || null,
          notes: form.notes.trim() || null,
          items: form.items.map((item) => ({
            finishedGoodId: item.finishedGoodId,
            quantity: Number(item.quantity),
            unit: item.unit.trim() || "unit",
            notes: item.notes.trim() || null,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || "Ya existe un despacho con ese code");
        }
        throw new Error(data.error || "No se pudo crear despacho");
      }

      toast.success("Despacho creado");
      setShowCreateModal(false);
      setForm(EMPTY_DISPATCH_FORM);
      await loadDispatches({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear despacho";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const markUnitPicked = async (dispatch: DispatchViewModel, unitId: string, picked: boolean) => {
    const eventKey = `${dispatch.id}:unit:${unitId}:${picked ? "on" : "off"}`;
    setSavingEventKey(eventKey);
    try {
      const res = await fetch(`/api/admin/operations/dispatches/${dispatch.id}/mark-unit-picked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, picked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo marcar la unidad");
      await loadDispatches({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar la unidad");
    } finally {
      setSavingEventKey(null);
    }
  };

  const markPrepared = async (dispatch: DispatchViewModel) => {
    const eventKey = `${dispatch.id}:prepared`;
    setSavingEventKey(eventKey);
    try {
      const res = await fetch(`/api/admin/operations/dispatches/${dispatch.id}/mark-prepared`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo marcar preparado");
      await loadDispatches({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar preparado");
    } finally {
      setSavingEventKey(null);
    }
  };

  const markSent = async (dispatch: DispatchViewModel) => {
    const eventKey = `${dispatch.id}:sent`;
    setSavingEventKey(eventKey);
    try {
      const res = await fetch(`/api/admin/operations/dispatches/${dispatch.id}/mark-sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo marcar enviado");
      await loadDispatches({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar enviado");
    } finally {
      setSavingEventKey(null);
    }
  };

  const confirmDelivery = async (dispatch: DispatchViewModel) => {
    const eventKey = `${dispatch.id}:delivered`;
    setSavingEventKey(eventKey);
    try {
      const res = await fetch(`/api/admin/operations/dispatches/${dispatch.id}/confirm-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo confirmar la entrega");
      await loadDispatches({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la entrega");
    } finally {
      setSavingEventKey(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          Despacho
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Salidas registradas y seguimiento de entrega.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-slate-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-black">{metrics.total}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Borrador</span>
          </div>
          <p className="text-2xl font-black">{metrics.draft}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <PackageCheck className="h-4 w-4 text-cyan-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reservado</span>
          </div>
          <p className="text-2xl font-black">{metrics.reserved}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Programados</span>
          </div>
          <p className="text-2xl font-black">{metrics.scheduled}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-purple-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">En tránsito</span>
          </div>
          <p className="text-2xl font-black">{metrics.inTransit}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Entregados</span>
          </div>
          <p className="text-2xl font-black">{metrics.delivered}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cancelados</span>
          </div>
          <p className="text-2xl font-black">{metrics.cancelled}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Unidades</span>
          </div>
          <p className="text-2xl font-black">{formatQuantity(metrics.itemQuantity)}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Historial de Despachos</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Crear despacho
            </button>
            <button
              type="button"
              onClick={() => loadDispatches({ silent: true })}
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs font-semibold text-cyan-900">
          La entrega física no activa chips. El código público/activación/acceso se mantiene separado del inventario interno.
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : dispatches.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <Truck className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Todavía no existen despachos registrados</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Los despachos creados desde esta sección aparecerán aquí con items y eventos reales.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {dispatches.map((dispatch) => {
              const status = DISPATCH_STATUS_CONFIG[dispatch.status] || {
                label: dispatch.status,
                color: "bg-slate-50 border-slate-200 text-slate-700",
              };
              return (
                <article key={dispatch.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Despacho</p>
                          <p className="mt-1 font-mono text-xl font-black text-slate-950">{dispatch.code}</p>
                        </div>
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">Pedido</p>
                          <p className="mt-1 font-mono text-lg font-black text-primary">#{dispatch.orderCode}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Cliente</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{dispatch.customerName}</p>
                          <p className="text-xs font-semibold text-slate-500">{dispatch.customerEmail || "Sin email"}</p>
                          <p className="text-xs font-semibold text-slate-500">{dispatch.customerPhone || "Sin teléfono"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Entrega</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{dispatch.city || "Sin ciudad"}</p>
                          <p className="text-xs font-semibold text-slate-500">{dispatch.address || "Sin dirección"}</p>
                          <p className="text-xs font-semibold text-slate-500">{dispatch.notes || "Sin notas"}</p>
                          <p className="text-xs font-semibold text-slate-500">Referencia: {dispatch.deliveryReference || "Sin referencia"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Fechas</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">Creado: {formatDate(dispatch.createdAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">Preparado: {formatDate(dispatch.preparedAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">Enviado: {formatDate(dispatch.sentAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">Entregado: {formatDate(dispatch.deliveredAt)}</p>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Productos a separar</p>
                        <div className="mt-3 grid gap-2">
                          {dispatch.units.map((unit) => (
                            <div key={unit.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={unit.picked}
                                  onChange={(event) => void markUnitPicked(dispatch, unit.id, event.target.checked)}
                                  disabled={!dispatch.canMarkUnitPicked || Boolean(savingEventKey)}
                                  className="h-4 w-4 rounded border-slate-300 text-primary"
                                />
                                <span className="space-y-0.5">
                                  <span className="block font-mono text-sm font-black text-primary">{unit.internalLabel}</span>
                                  <span className="block text-[10px] font-semibold text-slate-500">Etiqueta interna operacional, no es código público.</span>
                                </span>
                              </label>
                              <div className="grid gap-1 text-xs font-semibold text-slate-500 md:text-right">
                                <p>{unit.productName} · {unit.productCode}</p>
                                <p>{unit.shortCode || "Sin shortCode"} · {unit.inventoryStatus} · {unit.activationStatus}</p>
                                <p className="text-[10px] text-slate-400">Código público/activación/acceso, no etiqueta de reserva.</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:w-56">
                      <button
                        type="button"
                        onClick={() => void markPrepared(dispatch)}
                        disabled={!dispatch.canMarkPrepared || Boolean(savingEventKey)}
                        className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-800 transition-all hover:bg-blue-100 disabled:opacity-50"
                      >
                        Marcar pedido preparado
                      </button>
                      <button
                        type="button"
                        onClick={() => void markSent(dispatch)}
                        disabled={!dispatch.canMarkSent || Boolean(savingEventKey)}
                        className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-purple-800 transition-all hover:bg-purple-100 disabled:opacity-50"
                      >
                        Marcar pedido enviado
                      </button>
                      <button
                        type="button"
                        onClick={() => void confirmDelivery(dispatch)}
                        disabled={!dispatch.canConfirmDelivery || Boolean(savingEventKey)}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-800 transition-all hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Confirmar entrega
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateDispatch} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Despacho</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear despacho</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Selecciona producto terminado disponible. La entrega física no activa el chip.
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
                    placeholder="DSP-PT-001"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Destino</span>
                  <input
                    value={form.destinationName}
                    onChange={(event) => updateForm("destinationName", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Nombre del destino"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referencia</span>
                  <input
                    value={form.destinationReference}
                    onChange={(event) => updateForm("destinationReference", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Referencia de salida"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Programado</span>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => updateForm("scheduledAt", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dirección</span>
                  <input
                    value={form.destinationAddress}
                    onChange={(event) => updateForm("destinationAddress", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Dirección de entrega"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    className="min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Notas internas de despacho"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Items</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar item
                  </button>
                </div>

                {form.items.map((item, index) => {
                  const selected = finishedGoods.find((finishedGood) => finishedGood.id === item.finishedGoodId);

                  return (
                    <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1.5fr_0.7fr_0.5fr_auto]">
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Producto terminado</span>
                        <select
                          required
                          value={item.finishedGoodId}
                          onChange={(event) => updateItem(index, "finishedGoodId", event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                        >
                          <option value="">Seleccionar producto</option>
                          {selectableFinishedGoods.map((finishedGood) => (
                            <option key={finishedGood.id} value={finishedGood.id}>
                              {finishedGood.code} · {finishedGood.name} · {finishedGood.productType} · balance {formatQuantity(finishedGood.balance)} {finishedGood.unit}
                            </option>
                          ))}
                        </select>
                        {selected && (
                          <p className="text-[11px] font-semibold text-slate-500">
                            Disponible: {formatQuantity(selected.balance)} {selected.unit}
                          </p>
                        )}
                      </label>

                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad</span>
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, "quantity", event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                          placeholder="1"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</span>
                        <input
                          value={item.unit}
                          onChange={(event) => updateItem(index, "unit", event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                          placeholder="unit"
                        />
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length === 1}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-40"
                        >
                          Quitar
                        </button>
                      </div>

                      <label className="space-y-2 md:col-span-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas del item</span>
                        <input
                          value={item.notes}
                          onChange={(event) => updateItem(index, "notes", event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                          placeholder="Detalle opcional de la línea"
                        />
                      </label>
                    </div>
                  );
                })}
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
                  Guardar despacho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

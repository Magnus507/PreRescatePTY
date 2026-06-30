"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import { toast } from "sonner";

type WarrantyEventType =
  | "ACTIVATED"
  | "SUSPENDED"
  | "EXPIRED"
  | "CLAIM_OPENED"
  | "CLAIM_CLOSED"
  | "CANCELLED";

interface CommercialOrderOption {
  id: string;
  code: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  totalAmount: number;
  currency: string;
  items?: CommercialOrderItemOption[];
}

interface CommercialOrderItemOption {
  id: string;
  productCode: string | null;
  productName: string;
  quantity: number;
  unit: string;
}

interface FinishedGoodOption {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
  unit: string;
  balance: number;
}

interface DispatchOption {
  id: string;
  code: string;
  status: string;
  destinationName: string | null;
  destinationType: string;
}

interface OperationWarranty {
  id: string;
  code: string;
  status: string;
  warrantyType: string;
  coverageStatus: string;
  startDate: string | null;
  endDate: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  serialReference: string | null;
  commercialOrderId: string | null;
  commercialOrderItemId: string | null;
  finishedGoodId: string | null;
  dispatchId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  commercialOrder?: CommercialOrderOption | null;
  commercialOrderItem?: CommercialOrderItemOption | null;
  finishedGood?: FinishedGoodOption | null;
  dispatch?: DispatchOption | null;
}

interface WarrantyFormState {
  code: string;
  warrantyType: string;
  status: string;
  coverageStatus: string;
  startDate: string;
  endDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serialReference: string;
  commercialOrderId: string;
  commercialOrderItemId: string;
  finishedGoodId: string;
  dispatchId: string;
  notes: string;
}

interface EventModalState {
  warranty: OperationWarranty;
  eventType: WarrantyEventType;
  label: string;
}

const EMPTY_FORM: WarrantyFormState = {
  code: "",
  warrantyType: "standard",
  status: "active",
  coverageStatus: "valid",
  startDate: "",
  endDate: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  serialReference: "",
  commercialOrderId: "",
  commercialOrderItemId: "",
  finishedGoodId: "",
  dispatchId: "",
  notes: "",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  suspended: { label: "Suspendida", color: "bg-amber-50 border-amber-200 text-amber-800" },
  expired: { label: "Expirada", color: "bg-slate-50 border-slate-200 text-slate-700" },
  cancelled: { label: "Cancelada", color: "bg-red-50 border-red-200 text-red-700" },
};

const COVERAGE_CONFIG: Record<string, { label: string; color: string }> = {
  valid: { label: "Cobertura valida", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  expired: { label: "Cobertura expirada", color: "bg-slate-50 border-slate-200 text-slate-700" },
  claim_open: { label: "Reclamo abierto", color: "bg-purple-50 border-purple-200 text-purple-800" },
  claim_closed: { label: "Reclamo cerrado", color: "bg-blue-50 border-blue-200 text-blue-800" },
};

const EVENT_SUCCESS_COPY: Record<WarrantyEventType, string> = {
  ACTIVATED: "Garantia activada",
  SUSPENDED: "Garantia suspendida",
  EXPIRED: "Garantia expirada",
  CLAIM_OPENED: "Reclamo abierto",
  CLAIM_CLOSED: "Reclamo cerrado",
  CANCELLED: "Garantia cancelada",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium" }).format(new Date(value));
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount || 0);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function StatusBadge({ value, config }: { value: string; config: Record<string, { label: string; color: string }> }) {
  const item = config[value] || { label: value, color: "bg-slate-50 border-slate-200 text-slate-700" };

  return (
    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${item.color}`}>
      {item.label}
    </span>
  );
}

function getWarrantyActions(warranty: OperationWarranty) {
  const commonCancel = {
    label: "Cancelar",
    eventType: "CANCELLED" as WarrantyEventType,
    tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };

  if (warranty.status === "cancelled" || warranty.status === "expired") return [];

  if (warranty.coverageStatus === "claim_open") {
    return [
      { label: "Cerrar reclamo", eventType: "CLAIM_CLOSED" as WarrantyEventType, tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" },
      commonCancel,
    ];
  }

  if (warranty.status === "suspended") {
    return [
      { label: "Activar", eventType: "ACTIVATED" as WarrantyEventType, tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
      commonCancel,
    ];
  }

  if (warranty.status === "active" && warranty.coverageStatus === "valid") {
    return [
      { label: "Suspender", eventType: "SUSPENDED" as WarrantyEventType, tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
      { label: "Abrir reclamo", eventType: "CLAIM_OPENED" as WarrantyEventType, tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100" },
      { label: "Expirar", eventType: "EXPIRED" as WarrantyEventType, tone: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100" },
      commonCancel,
    ];
  }

  return [];
}

export function WarrantySection() {
  const [warranties, setWarranties] = useState<OperationWarranty[]>([]);
  const [commercialOrders, setCommercialOrders] = useState<CommercialOrderOption[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodOption[]>([]);
  const [dispatches, setDispatches] = useState<DispatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventModal, setEventModal] = useState<EventModalState | null>(null);
  const [eventReason, setEventReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingEventKey, setSavingEventKey] = useState<string | null>(null);
  const [form, setForm] = useState<WarrantyFormState>(EMPTY_FORM);

  const selectedOrder = commercialOrders.find((order) => order.id === form.commercialOrderId);
  const selectedOrderItems = selectedOrder?.items || [];

  const stats = useMemo(() => {
    const total = warranties.length;
    const active = warranties.filter((warranty) => warranty.status === "active").length;
    const suspended = warranties.filter((warranty) => warranty.status === "suspended").length;
    const claimOpen = warranties.filter((warranty) => warranty.coverageStatus === "claim_open").length;
    const claimClosed = warranties.filter((warranty) => warranty.coverageStatus === "claim_closed").length;
    const expired = warranties.filter((warranty) => warranty.status === "expired").length;
    const cancelled = warranties.filter((warranty) => warranty.status === "cancelled").length;
    const expiring = warranties.filter((warranty) => {
      if (!warranty.endDate || warranty.status === "cancelled") return false;
      const endDate = new Date(warranty.endDate).getTime();
      const limit = Date.now() + 1000 * 60 * 60 * 24 * 30;
      return endDate <= limit;
    }).length;

    return { total, active, suspended, claimOpen, claimClosed, expired, cancelled, expiring };
  }, [warranties]);

  const loadWarranties = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/operations/warranties", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar garantias");
      }

      setWarranties(Array.isArray(data.warranties) ? data.warranties : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar garantias"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSelectors = useCallback(async () => {
    const loadSelector = async <T,>(url: string, key: string): Promise<T[]> => {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `No se pudo cargar ${key}`);
      }

      return Array.isArray(data[key]) ? data[key] : [];
    };

    try {
      const [orders, goods, dispatchList] = await Promise.all([
        loadSelector<CommercialOrderOption>("/api/admin/operations/commercial-orders", "commercialOrders"),
        loadSelector<FinishedGoodOption>("/api/admin/operations/finished-goods", "finishedGoods"),
        loadSelector<DispatchOption>("/api/admin/operations/dispatches", "dispatches"),
      ]);

      setCommercialOrders(orders);
      setFinishedGoods(goods);
      setDispatches(dispatchList);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar selectores de garantia"));
    }
  }, []);

  useEffect(() => {
    loadWarranties();
    loadSelectors();
  }, [loadSelectors, loadWarranties]);

  const handleCreateWarranty = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error("El code es requerido");
      return;
    }

    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("endDate debe ser mayor o igual a startDate");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          warrantyType: form.warrantyType.trim() || "standard",
          status: form.status || "active",
          coverageStatus: form.coverageStatus || "valid",
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          customerName: form.customerName.trim() || undefined,
          customerEmail: form.customerEmail.trim() || undefined,
          customerPhone: form.customerPhone.trim() || undefined,
          serialReference: form.serialReference.trim() || undefined,
          commercialOrderId: form.commercialOrderId || undefined,
          commercialOrderItemId: form.commercialOrderItemId || undefined,
          finishedGoodId: form.finishedGoodId || undefined,
          dispatchId: form.dispatchId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear la garantia");
      }

      toast.success("Garantia creada");
      setForm(EMPTY_FORM);
      setShowCreateModal(false);
      await loadWarranties({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al crear garantia"));
    } finally {
      setSaving(false);
    }
  };

  const handleWarrantyEvent = async (
    warranty: OperationWarranty,
    eventType: WarrantyEventType,
    options: { reason?: string } = {}
  ) => {
    const eventKey = `${warranty.id}:${eventType}`;
    setSavingEventKey(eventKey);

    try {
      const res = await fetch(`/api/admin/operations/warranties/${warranty.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          reason: options.reason?.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el evento de garantia");
      }

      toast.success(EVENT_SUCCESS_COPY[eventType]);
      await loadWarranties({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al registrar evento de garantia"));
    } finally {
      setSavingEventKey(null);
    }
  };

  const openEventModal = (warranty: OperationWarranty, eventType: WarrantyEventType, label: string) => {
    setEventReason("");
    setEventModal({ warranty, eventType, label });
  };

  const submitEventModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventModal) return;

    await handleWarrantyEvent(eventModal.warranty, eventModal.eventType, { reason: eventReason });
    setEventModal(null);
    setEventReason("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-700">Postventa operativa</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Garantias</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Coberturas y reclamos vinculados a Comercial, Inventario PT y Despacho dentro del flujo operativo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadWarranties({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Nueva garantia
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {[
          { label: "Total", value: stats.total, icon: ShieldCheck, tone: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Activas", value: stats.active, icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "Suspendidas", value: stats.suspended, icon: ShieldOff, tone: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Reclamos abiertos", value: stats.claimOpen, icon: AlertTriangle, tone: "bg-purple-50 text-purple-700 border-purple-200" },
          { label: "Reclamos cerrados", value: stats.claimClosed, icon: FileText, tone: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Expiradas", value: stats.expired, icon: ShieldOff, tone: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Canceladas", value: stats.cancelled, icon: ShieldOff, tone: "bg-red-50 text-red-700 border-red-200" },
          { label: "Por vencer", value: stats.expiring, icon: FileText, tone: "bg-blue-50 text-blue-700 border-blue-200" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
              </div>
              <div className={`rounded-xl border p-2 ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : warranties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h3 className="text-lg font-black text-slate-900">Sin garantias operativas</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
              Crea una garantia para vincular cobertura postventa con Comercial, Inventario PT o Despacho.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {warranties.map((warranty) => {
              const actions = getWarrantyActions(warranty);

              return (
                <article key={warranty.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-slate-950">{warranty.code}</h3>
                        <StatusBadge value={warranty.status} config={STATUS_CONFIG} />
                        <StatusBadge value={warranty.coverageStatus} config={COVERAGE_CONFIG} />
                      </div>

                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo / serie</p>
                          <p className="font-bold text-slate-800">{warranty.warrantyType}</p>
                          <p className="text-xs font-semibold text-slate-500">{warranty.serialReference || "Sin serial"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
                          <p className="font-bold text-slate-800">{warranty.customerName || "Sin nombre"}</p>
                          <p className="text-xs font-semibold text-slate-500">{warranty.customerEmail || warranty.customerPhone || "Sin contacto"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vigencia</p>
                          <p className="font-bold text-slate-800">{formatOptionalDate(warranty.startDate)}</p>
                          <p className="text-xs font-semibold text-slate-500">Hasta {formatOptionalDate(warranty.endDate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actualizado</p>
                          <p className="font-bold text-slate-800">{formatDateTime(warranty.updatedAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">Creada {formatDateTime(warranty.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-3">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comercial</p>
                          <p className="mt-1 font-black text-slate-900">{warranty.commercialOrder?.code || "Sin pedido"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {warranty.commercialOrder ? `${warranty.commercialOrder.status} · ${warranty.commercialOrder.customerName || "sin cliente"}` : "No vinculado"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto terminado</p>
                          <p className="mt-1 font-black text-slate-900">{warranty.finishedGood?.code || "Sin PT"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {warranty.finishedGood ? `${warranty.finishedGood.name} · ${warranty.finishedGood.productType}` : "No vinculado"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despacho</p>
                          <p className="mt-1 font-black text-slate-900">{warranty.dispatch?.code || "Sin despacho"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {warranty.dispatch ? `${warranty.dispatch.status} · ${warranty.dispatch.destinationName || warranty.dispatch.destinationType}` : "No vinculado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-[190px] flex-col gap-2">
                      {actions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Sin acciones operativas
                        </div>
                      ) : (
                        actions.map((action) => {
                          const eventKey = `${warranty.id}:${action.eventType}`;
                          const needsModal = action.eventType === "CLAIM_OPENED" || action.eventType === "CLAIM_CLOSED";

                          return (
                            <button
                              key={action.eventType}
                              type="button"
                              onClick={() =>
                                needsModal
                                  ? openEventModal(warranty, action.eventType, action.label)
                                  : handleWarrantyEvent(warranty, action.eventType)
                              }
                              disabled={Boolean(savingEventKey)}
                              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-50 ${action.tone}`}
                            >
                              {savingEventKey === eventKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              {action.label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateWarranty} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nueva garantia</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar cobertura postventa</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
                className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Code *</span>
                <input
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="WAR-001"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</span>
                <input
                  value={form.warrantyType}
                  onChange={(event) => setForm((current) => ({ ...current, warrantyType: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="standard"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Serial / referencia</span>
                <input
                  value={form.serialReference}
                  onChange={(event) => setForm((current) => ({ ...current, serialReference: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="QR, chip o lote"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="active">Activa</option>
                  <option value="suspended">Suspendida</option>
                  <option value="expired">Expirada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cobertura</span>
                <select
                  value={form.coverageStatus}
                  onChange={(event) => setForm((current) => ({ ...current, coverageStatus: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="valid">Valida</option>
                  <option value="expired">Expirada</option>
                  <option value="claim_open">Reclamo abierto</option>
                  <option value="claim_closed">Reclamo cerrado</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</span>
                <input
                  value={form.customerName}
                  onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="Nombre cliente"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
                <input
                  value={form.customerEmail}
                  onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="cliente@correo.com"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefono</span>
                <input
                  value={form.customerPhone}
                  onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="+507 000-0000"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inicio</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fin</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido comercial</span>
                <select
                  value={form.commercialOrderId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, commercialOrderId: event.target.value, commercialOrderItemId: "" }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="">Sin pedido</option>
                  {commercialOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.code} · {order.status} · {order.customerName || "sin cliente"} · {formatMoney(order.totalAmount, order.currency)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item comercial</span>
                <select
                  value={form.commercialOrderItemId}
                  onChange={(event) => setForm((current) => ({ ...current, commercialOrderItemId: event.target.value }))}
                  disabled={!form.commercialOrderId}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Sin item</option>
                  {selectedOrderItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.productName} · {item.quantity} {item.unit}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto terminado</span>
                <select
                  value={form.finishedGoodId}
                  onChange={(event) => setForm((current) => ({ ...current, finishedGoodId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="">Sin PT</option>
                  {finishedGoods.map((finishedGood) => (
                    <option key={finishedGood.id} value={finishedGood.id}>
                      {finishedGood.code} · {finishedGood.name} · balance {finishedGood.balance}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 md:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despacho</span>
                <select
                  value={form.dispatchId}
                  onChange={(event) => setForm((current) => ({ ...current, dispatchId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="">Sin despacho</option>
                  {dispatches.map((dispatch) => (
                    <option key={dispatch.id} value={dispatch.id}>
                      {dispatch.code} · {dispatch.status} · {dispatch.destinationName || dispatch.destinationType}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notas</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                placeholder="Condiciones, alcance o evidencia inicial"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Crear garantia
              </button>
            </div>
          </form>
        </div>
      )}

      {eventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitEventModal} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{eventModal.label}</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{eventModal.warranty.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEventModal(null)}
                disabled={Boolean(savingEventKey)}
                className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason opcional</span>
              <textarea
                value={eventReason}
                onChange={(event) => setEventReason(event.target.value)}
                className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                placeholder="Contexto del reclamo o cierre"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEventModal(null)}
                disabled={Boolean(savingEventKey)}
                className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Boolean(savingEventKey)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
              >
                {savingEventKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Registrar evento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

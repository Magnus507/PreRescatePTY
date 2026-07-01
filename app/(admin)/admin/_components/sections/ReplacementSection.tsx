"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Repeat2,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type ReplacementEventType =
  | "APPROVED"
  | "REJECTED"
  | "REPLACEMENT_PREPARED"
  | "DISPATCH_CREATED"
  | "COMPLETED"
  | "CANCELLED";

interface WarrantyOption {
  id: string;
  code: string;
  status: string;
  coverageStatus: string;
  customerName: string | null;
}

interface CommercialOrderOption {
  id: string;
  code: string;
  status: string;
  customerName: string | null;
  totalAmount: number;
  currency: string;
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

interface OperationReplacement {
  id: string;
  code: string;
  status: string;
  replacementType: string;
  reason: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  warrantyId: string | null;
  commercialOrderId: string | null;
  originalFinishedGoodId: string | null;
  replacementFinishedGoodId: string | null;
  originalDispatchId: string | null;
  replacementDispatchId: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  warranty?: WarrantyOption | null;
  commercialOrder?: Pick<CommercialOrderOption, "id" | "code" | "status" | "customerName"> | null;
  originalFinishedGood?: FinishedGoodOption | null;
  replacementFinishedGood?: FinishedGoodOption | null;
  originalDispatch?: DispatchOption | null;
  replacementDispatch?: DispatchOption | null;
  originalUnit?: {
    id: string;
    internalLabel: string;
    productName: string;
    status: string;
    activationStatus: string;
  } | null;
  replacementUnit?: {
    id: string;
    internalLabel: string;
    productName: string;
    status: string;
    activationStatus: string;
  } | null;
}

interface ReplacementFormState {
  code: string;
  replacementType: string;
  reason: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  warrantyId: string;
  commercialOrderId: string;
  originalFinishedGoodId: string;
  replacementFinishedGoodId: string;
  originalDispatchId: string;
  notes: string;
}

interface EventModalState {
  replacement: OperationReplacement;
  eventType: ReplacementEventType;
  label: string;
}

const EMPTY_FORM: ReplacementFormState = {
  code: "",
  replacementType: "warranty",
  reason: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  warrantyId: "",
  commercialOrderId: "",
  originalFinishedGoodId: "",
  replacementFinishedGoodId: "",
  originalDispatchId: "",
  notes: "",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-50 border-slate-200 text-slate-700" },
  approved: { label: "Aprobado", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  rejected: { label: "Rechazado", color: "bg-red-50 border-red-200 text-red-700" },
  prepared: { label: "Preparado", color: "bg-blue-50 border-blue-200 text-blue-800" },
  completed: { label: "Completado", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelado", color: "bg-red-50 border-red-200 text-red-700" },
};

const EVENT_SUCCESS_COPY: Record<ReplacementEventType, string> = {
  APPROVED: "Reemplazo aprobado",
  REJECTED: "Reemplazo rechazado",
  REPLACEMENT_PREPARED: "Reemplazo preparado",
  DISPATCH_CREATED: "Despacho draft creado",
  COMPLETED: "Reemplazo completado",
  CANCELLED: "Reemplazo cancelado",
};

function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

function StatusBadge({ value }: { value: string }) {
  const item = STATUS_CONFIG[value] || { label: value, color: "bg-slate-50 border-slate-200 text-slate-700" };

  return (
    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${item.color}`}>
      {item.label}
    </span>
  );
}

function getReplacementActions(replacement: OperationReplacement) {
  const cancelAction = {
    label: "Cancelar",
    eventType: "CANCELLED" as ReplacementEventType,
    tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    modal: true,
  };

  if (["completed", "cancelled", "rejected"].includes(replacement.status)) return [];

  if (replacement.status === "draft") {
    return [
      { label: "Aprobar", eventType: "APPROVED" as ReplacementEventType, tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100", modal: true },
      { label: "Rechazar", eventType: "REJECTED" as ReplacementEventType, tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100", modal: true },
      cancelAction,
    ];
  }

  const dispatchAction =
    replacement.replacementFinishedGoodId && !replacement.replacementDispatchId
      ? [{
          label: "Crear despacho",
          eventType: "DISPATCH_CREATED" as ReplacementEventType,
          tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100",
          modal: false,
        }]
      : [];

  if (replacement.status === "approved") {
    return [
      { label: "Preparar", eventType: "REPLACEMENT_PREPARED" as ReplacementEventType, tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100", modal: false },
      ...dispatchAction,
      cancelAction,
    ];
  }

  if (replacement.status === "prepared") {
    return [
      ...dispatchAction,
      { label: "Completar", eventType: "COMPLETED" as ReplacementEventType, tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100", modal: false },
      cancelAction,
    ];
  }

  return [];
}

export function ReplacementSection() {
  const [replacements, setReplacements] = useState<OperationReplacement[]>([]);
  const [warranties, setWarranties] = useState<WarrantyOption[]>([]);
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
  const [form, setForm] = useState<ReplacementFormState>(EMPTY_FORM);

  const stats = useMemo(() => {
    const total = replacements.length;
    const drafts = replacements.filter((replacement) => replacement.status === "draft").length;
    const approved = replacements.filter((replacement) => replacement.status === "approved").length;
    const prepared = replacements.filter((replacement) => replacement.status === "prepared").length;
    const withDispatch = replacements.filter((replacement) => Boolean(replacement.replacementDispatchId)).length;
    const completed = replacements.filter((replacement) => replacement.status === "completed").length;
    const closedNegative = replacements.filter((replacement) => replacement.status === "cancelled" || replacement.status === "rejected").length;
    return { total, drafts, approved, prepared, withDispatch, completed, closedNegative };
  }, [replacements]);

  const loadReplacements = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/operations/replacements", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar reemplazos");
      }

      setReplacements(Array.isArray(data.replacements) ? data.replacements : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar reemplazos"));
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
      const [warrantyList, orders, goods, dispatchList] = await Promise.all([
        loadSelector<WarrantyOption>("/api/admin/operations/warranties", "warranties"),
        loadSelector<CommercialOrderOption>("/api/admin/operations/commercial-orders", "commercialOrders"),
        loadSelector<FinishedGoodOption>("/api/admin/operations/finished-goods", "finishedGoods"),
        loadSelector<DispatchOption>("/api/admin/operations/dispatches", "dispatches"),
      ]);

      setWarranties(warrantyList);
      setCommercialOrders(orders);
      setFinishedGoods(goods);
      setDispatches(dispatchList);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar selectores de reemplazo"));
    }
  }, []);

  useEffect(() => {
    loadReplacements();
    loadSelectors();
  }, [loadReplacements, loadSelectors]);

  const handleCreateReplacement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error("El code es requerido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/replacements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          replacementType: form.replacementType.trim() || "warranty",
          reason: form.reason.trim() || undefined,
          customerName: form.customerName.trim() || undefined,
          customerEmail: form.customerEmail.trim() || undefined,
          customerPhone: form.customerPhone.trim() || undefined,
          warrantyId: form.warrantyId || undefined,
          commercialOrderId: form.commercialOrderId || undefined,
          originalFinishedGoodId: form.originalFinishedGoodId || undefined,
          replacementFinishedGoodId: form.replacementFinishedGoodId || undefined,
          originalDispatchId: form.originalDispatchId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el reemplazo");
      }

      toast.success("Reemplazo creado");
      setForm(EMPTY_FORM);
      setShowCreateModal(false);
      await loadReplacements({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al crear reemplazo"));
    } finally {
      setSaving(false);
    }
  };

  const handleReplacementEvent = async (
    replacement: OperationReplacement,
    eventType: ReplacementEventType,
    options: { reason?: string } = {}
  ) => {
    const eventKey = `${replacement.id}:${eventType}`;
    setSavingEventKey(eventKey);

    try {
      const res = await fetch(`/api/admin/operations/replacements/${replacement.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          reason: options.reason?.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el evento de reemplazo");
      }

      toast.success(EVENT_SUCCESS_COPY[eventType]);
      await loadReplacements({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al registrar evento de reemplazo"));
    } finally {
      setSavingEventKey(null);
    }
  };

  const openEventModal = (replacement: OperationReplacement, eventType: ReplacementEventType, label: string) => {
    setEventReason("");
    setEventModal({ replacement, eventType, label });
  };

  const submitEventModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventModal) return;

    await handleReplacementEvent(eventModal.replacement, eventModal.eventType, { reason: eventReason });
    setEventModal(null);
    setEventReason("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-purple-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-700">Postventa operativa</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Reemplazos</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Casos de reemplazo vinculados a Garantias, Comercial, Producto Terminado y Despacho.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadReplacements({ silent: true })}
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
              Nuevo reemplazo
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {[
          { label: "Total", value: stats.total, icon: Repeat2, tone: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Borradores", value: stats.drafts, icon: Repeat2, tone: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Aprobados", value: stats.approved, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "Preparados", value: stats.prepared, icon: PackageCheck, tone: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Con despacho", value: stats.withDispatch, icon: Send, tone: "bg-cyan-50 text-cyan-700 border-cyan-200" },
          { label: "Completados", value: stats.completed, icon: Send, tone: "bg-purple-50 text-purple-700 border-purple-200" },
          { label: "Cancelados/rechazados", value: stats.closedNegative, icon: XCircle, tone: "bg-red-50 text-red-700 border-red-200" },
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
        ) : replacements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Repeat2 className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h3 className="text-lg font-black text-slate-900">Sin reemplazos operativos</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
              Registra el primer caso de reemplazo para coordinar aprobación, preparación y despacho draft.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {replacements.map((replacement) => {
              const actions = getReplacementActions(replacement);

              return (
                <article key={replacement.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-slate-950">{replacement.code}</h3>
                        <StatusBadge value={replacement.status} />
                        <span className="inline-flex w-fit rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-800">
                          {replacement.replacementType}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
                          <p className="font-bold text-slate-800">{replacement.customerName || "Sin nombre"}</p>
                          <p className="text-xs font-semibold text-slate-500">{replacement.customerEmail || replacement.customerPhone || "Sin contacto"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo</p>
                          <p className="font-bold text-slate-800">{replacement.reason || "Sin motivo"}</p>
                          <p className="text-xs font-semibold text-slate-500">{replacement.notes || "Sin notas"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fechas clave</p>
                          <p className="font-bold text-slate-800">Aprobado: {formatDateTime(replacement.approvedAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            Completado: {formatDateTime(replacement.completedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actualizado</p>
                          <p className="font-bold text-slate-800">{formatDateTime(replacement.updatedAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">Creado {formatDateTime(replacement.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-3">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Garantia / Comercial</p>
                          <p className="mt-1 font-black text-slate-900">{replacement.warranty?.code || "Sin garantia"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {replacement.commercialOrder ? `${replacement.commercialOrder.code} · ${replacement.commercialOrder.status}` : "Sin pedido comercial"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto original</p>
                          <p className="mt-1 font-black text-slate-900">{replacement.originalFinishedGood?.code || "Sin PT original"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {replacement.originalFinishedGood ? replacement.originalFinishedGood.name : "No vinculado"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reemplazo / despacho</p>
                          <p className="mt-1 font-black text-slate-900">{replacement.replacementFinishedGood?.code || "Sin PT reemplazo"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {replacement.replacementDispatch
                              ? `Despacho ${replacement.replacementDispatch.code} · ${replacement.replacementDispatch.status}`
                              : "Sin despacho de reemplazo"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidad original</p>
                          <p className="mt-1 font-black text-slate-900">{replacement.originalUnit?.internalLabel || "Sin unidad"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {replacement.originalUnit ? `${replacement.originalUnit.productName} · ${replacement.originalUnit.status} · ${replacement.originalUnit.activationStatus}` : "No vinculada"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidad reemplazo</p>
                          <p className="mt-1 font-black text-slate-900">{replacement.replacementUnit?.internalLabel || "Sin unidad"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {replacement.replacementUnit ? `${replacement.replacementUnit.productName} · ${replacement.replacementUnit.status} · ${replacement.replacementUnit.activationStatus}` : "No vinculada"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despacho original</p>
                        <p className="mt-1 font-bold text-slate-800">
                          {replacement.originalDispatch
                            ? `${replacement.originalDispatch.code} · ${replacement.originalDispatch.status} · ${replacement.originalDispatch.destinationName || replacement.originalDispatch.destinationType}`
                            : "Sin despacho original"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Cancelado: {formatDateTime(replacement.cancelledAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-[190px] flex-col gap-2">
                      {actions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Sin acciones operativas
                        </div>
                      ) : (
                        actions.map((action) => {
                          const eventKey = `${replacement.id}:${action.eventType}`;
                          return (
                            <button
                              key={action.eventType}
                              type="button"
                              onClick={() =>
                                action.modal
                                  ? openEventModal(replacement, action.eventType, action.label)
                                  : handleReplacementEvent(replacement, action.eventType)
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
          <form onSubmit={handleCreateReplacement} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nuevo reemplazo</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar caso postventa</h3>
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
                  placeholder="REP-001"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</span>
                <input
                  value={form.replacementType}
                  onChange={(event) => setForm((current) => ({ ...current, replacementType: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="warranty"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo</span>
                <input
                  value={form.reason}
                  onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="Falla, daño, excepcion"
                />
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
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Garantia</span>
                <select
                  value={form.warrantyId}
                  onChange={(event) => setForm((current) => ({ ...current, warrantyId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="">Sin garantia</option>
                  {warranties.map((warranty) => (
                    <option key={warranty.id} value={warranty.id}>
                      {warranty.code} · {warranty.status} · {warranty.coverageStatus} · {warranty.customerName || "sin cliente"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido comercial</span>
                <select
                  value={form.commercialOrderId}
                  onChange={(event) => setForm((current) => ({ ...current, commercialOrderId: event.target.value }))}
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
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto original</span>
                <select
                  value={form.originalFinishedGoodId}
                  onChange={(event) => setForm((current) => ({ ...current, originalFinishedGoodId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="">Sin PT original</option>
                  {finishedGoods.map((finishedGood) => (
                    <option key={finishedGood.id} value={finishedGood.id}>
                      {finishedGood.code} · {finishedGood.name} · {finishedGood.productType} · balance {finishedGood.balance}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto reemplazo</span>
                <select
                  value={form.replacementFinishedGoodId}
                  onChange={(event) => setForm((current) => ({ ...current, replacementFinishedGoodId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="">Sin PT reemplazo</option>
                  {finishedGoods.map((finishedGood) => (
                    <option key={finishedGood.id} value={finishedGood.id}>
                      {finishedGood.code} · {finishedGood.name} · {finishedGood.productType} · balance {finishedGood.balance}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despacho original</span>
                <select
                  value={form.originalDispatchId}
                  onChange={(event) => setForm((current) => ({ ...current, originalDispatchId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="">Sin despacho original</option>
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
                placeholder="Contexto operativo, evidencia o condicion"
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
                Crear reemplazo
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
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{eventModal.replacement.code}</h3>
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
                placeholder="Motivo operativo del evento"
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

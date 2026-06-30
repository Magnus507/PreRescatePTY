"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ReturnEventType =
  | "RECEIVED"
  | "INSPECTED"
  | "ACCEPTED"
  | "REJECTED"
  | "RETURNED_TO_INVENTORY"
  | "DISCARDED"
  | "COMPLETED"
  | "CANCELLED";

interface WarrantyOption {
  id: string;
  code: string;
  status: string;
  coverageStatus: string;
  customerName: string | null;
}

interface ReplacementOption {
  id: string;
  code: string;
  status: string;
  replacementType?: string;
  customerName?: string | null;
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

interface OperationReturn {
  id: string;
  code: string;
  status: string;
  returnType: string;
  reason: string | null;
  resolution: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  warrantyId: string | null;
  replacementId: string | null;
  commercialOrderId: string | null;
  finishedGoodId: string | null;
  originalDispatchId: string | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  receivedAt: string | null;
  inspectedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  warranty?: WarrantyOption | null;
  replacement?: ReplacementOption | null;
  commercialOrder?: Pick<CommercialOrderOption, "id" | "code" | "status" | "customerName"> | null;
  finishedGood?: FinishedGoodOption | null;
  originalDispatch?: DispatchOption | null;
}

interface ReturnFormState {
  code: string;
  returnType: string;
  reason: string;
  resolution: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  warrantyId: string;
  replacementId: string;
  commercialOrderId: string;
  finishedGoodId: string;
  originalDispatchId: string;
  notes: string;
}

interface EventModalState {
  operationReturn: OperationReturn;
  eventType: ReturnEventType;
  label: string;
  requiresQuantity: boolean;
}

const EMPTY_FORM: ReturnFormState = {
  code: "",
  returnType: "customer_return",
  reason: "",
  resolution: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  warrantyId: "",
  replacementId: "",
  commercialOrderId: "",
  finishedGoodId: "",
  originalDispatchId: "",
  notes: "",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-50 border-slate-200 text-slate-700" },
  received: { label: "Recibida", color: "bg-blue-50 border-blue-200 text-blue-800" },
  inspected: { label: "Inspeccionada", color: "bg-purple-50 border-purple-200 text-purple-800" },
  discarded: { label: "Descartada", color: "bg-amber-50 border-amber-200 text-amber-800" },
  completed: { label: "Completada", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelada", color: "bg-red-50 border-red-200 text-red-700" },
};

const EVENT_SUCCESS_COPY: Record<ReturnEventType, string> = {
  RECEIVED: "Devolucion recibida",
  INSPECTED: "Devolucion inspeccionada",
  ACCEPTED: "Cantidad aceptada",
  REJECTED: "Cantidad rechazada",
  RETURNED_TO_INVENTORY: "Producto retornado a Inventario PT",
  DISCARDED: "Devolucion descartada",
  COMPLETED: "Devolucion completada",
  CANCELLED: "Devolucion cancelada",
};

function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: currency || "USD" }).format(amount || 0);
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

function getReturnActions(operationReturn: OperationReturn) {
  const cancelAction = {
    label: "Cancelar",
    eventType: "CANCELLED" as ReturnEventType,
    tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    requiresQuantity: false,
  };

  if (["completed", "cancelled"].includes(operationReturn.status)) return [];

  if (operationReturn.status === "draft") {
    return [
      { label: "Recibir", eventType: "RECEIVED" as ReturnEventType, tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100", requiresQuantity: true },
      cancelAction,
    ];
  }

  if (operationReturn.status === "received") {
    return [
      { label: "Inspeccionar", eventType: "INSPECTED" as ReturnEventType, tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100", requiresQuantity: false },
      cancelAction,
    ];
  }

  if (operationReturn.status === "inspected") {
    const inventoryAction = operationReturn.finishedGoodId
      ? [{
          label: "Retornar a inventario",
          eventType: "RETURNED_TO_INVENTORY" as ReturnEventType,
          tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
          requiresQuantity: true,
        }]
      : [];

    return [
      { label: "Aceptar cantidad", eventType: "ACCEPTED" as ReturnEventType, tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100", requiresQuantity: true },
      { label: "Rechazar cantidad", eventType: "REJECTED" as ReturnEventType, tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100", requiresQuantity: true },
      ...inventoryAction,
      { label: "Descartar", eventType: "DISCARDED" as ReturnEventType, tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100", requiresQuantity: false },
      { label: "Completar", eventType: "COMPLETED" as ReturnEventType, tone: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50", requiresQuantity: false },
      cancelAction,
    ];
  }

  if (operationReturn.status === "discarded") {
    return [
      { label: "Completar", eventType: "COMPLETED" as ReturnEventType, tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100", requiresQuantity: false },
      cancelAction,
    ];
  }

  return [];
}

export function ReturnSection() {
  const [returns, setReturns] = useState<OperationReturn[]>([]);
  const [warranties, setWarranties] = useState<WarrantyOption[]>([]);
  const [replacements, setReplacements] = useState<ReplacementOption[]>([]);
  const [commercialOrders, setCommercialOrders] = useState<CommercialOrderOption[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodOption[]>([]);
  const [dispatches, setDispatches] = useState<DispatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventModal, setEventModal] = useState<EventModalState | null>(null);
  const [eventQuantity, setEventQuantity] = useState("");
  const [eventReason, setEventReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingEventKey, setSavingEventKey] = useState<string | null>(null);
  const [form, setForm] = useState<ReturnFormState>(EMPTY_FORM);

  const stats = useMemo(() => {
    const drafts = returns.filter((item) => item.status === "draft").length;
    const received = returns.filter((item) => item.status === "received").length;
    const inspected = returns.filter((item) => item.status === "inspected").length;
    const completed = returns.filter((item) => item.status === "completed").length;
    return { drafts, received, inspected, completed };
  }, [returns]);

  const loadReturns = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/admin/operations/returns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar devoluciones");
      setReturns(Array.isArray(data.returns) ? data.returns : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar devoluciones"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSelectors = useCallback(async () => {
    const loadSelector = async <T,>(url: string, key: string): Promise<T[]> => {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `No se pudo cargar ${key}`);
      return Array.isArray(data[key]) ? data[key] : [];
    };

    try {
      const [warrantyList, replacementList, orders, goods, dispatchList] = await Promise.all([
        loadSelector<WarrantyOption>("/api/admin/operations/warranties", "warranties"),
        loadSelector<ReplacementOption>("/api/admin/operations/replacements", "replacements"),
        loadSelector<CommercialOrderOption>("/api/admin/operations/commercial-orders", "commercialOrders"),
        loadSelector<FinishedGoodOption>("/api/admin/operations/finished-goods", "finishedGoods"),
        loadSelector<DispatchOption>("/api/admin/operations/dispatches", "dispatches"),
      ]);

      setWarranties(warrantyList);
      setReplacements(replacementList);
      setCommercialOrders(orders);
      setFinishedGoods(goods);
      setDispatches(dispatchList);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar selectores de devolucion"));
    }
  }, []);

  useEffect(() => {
    loadReturns();
    loadSelectors();
  }, [loadReturns, loadSelectors]);

  const handleCreateReturn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.code.trim()) {
      toast.error("El code es requerido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          returnType: form.returnType.trim() || "customer_return",
          reason: form.reason.trim() || undefined,
          resolution: form.resolution.trim() || undefined,
          customerName: form.customerName.trim() || undefined,
          customerEmail: form.customerEmail.trim() || undefined,
          customerPhone: form.customerPhone.trim() || undefined,
          warrantyId: form.warrantyId || undefined,
          replacementId: form.replacementId || undefined,
          commercialOrderId: form.commercialOrderId || undefined,
          finishedGoodId: form.finishedGoodId || undefined,
          originalDispatchId: form.originalDispatchId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la devolucion");

      toast.success("Devolucion creada");
      setForm(EMPTY_FORM);
      setShowCreateModal(false);
      await loadReturns({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al crear devolucion"));
    } finally {
      setSaving(false);
    }
  };

  const handleReturnEvent = async (
    operationReturn: OperationReturn,
    eventType: ReturnEventType,
    options: { quantity?: number; reason?: string } = {}
  ) => {
    const eventKey = `${operationReturn.id}:${eventType}`;
    setSavingEventKey(eventKey);

    try {
      const res = await fetch(`/api/admin/operations/returns/${operationReturn.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          quantity: options.quantity,
          reason: options.reason?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar el evento de devolucion");

      toast.success(EVENT_SUCCESS_COPY[eventType]);
      await loadReturns({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al registrar evento de devolucion"));
    } finally {
      setSavingEventKey(null);
    }
  };

  const openEventModal = (
    operationReturn: OperationReturn,
    eventType: ReturnEventType,
    label: string,
    requiresQuantity: boolean
  ) => {
    setEventQuantity("");
    setEventReason("");
    setEventModal({ operationReturn, eventType, label, requiresQuantity });
  };

  const submitEventModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventModal) return;

    const quantity = eventModal.requiresQuantity ? Number(eventQuantity) : undefined;
    if (eventModal.requiresQuantity && (!Number.isFinite(quantity) || !quantity || quantity <= 0)) {
      toast.error("quantity positivo es requerido");
      return;
    }

    await handleReturnEvent(eventModal.operationReturn, eventModal.eventType, {
      quantity,
      reason: eventReason,
    });
    setEventModal(null);
    setEventQuantity("");
    setEventReason("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Postventa operativa</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Devoluciones</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Casos de devolución vinculados a Garantías, Reemplazos, Comercial, Producto Terminado y Despacho.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadReturns({ silent: true })}
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
              Nueva devolucion
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Borradores", value: stats.drafts, icon: RotateCcw, tone: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Recibidas", value: stats.received, icon: PackageCheck, tone: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Inspeccionadas", value: stats.inspected, icon: ClipboardCheck, tone: "bg-purple-50 text-purple-700 border-purple-200" },
          { label: "Completadas", value: stats.completed, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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
        ) : returns.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <RotateCcw className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h3 className="text-lg font-black text-slate-900">Sin devoluciones operativas</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
              Registra la primera devolución para coordinar recepción, inspección y retorno operativo.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((operationReturn) => {
              const actions = getReturnActions(operationReturn);

              return (
                <article key={operationReturn.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-slate-950">{operationReturn.code}</h3>
                        <StatusBadge value={operationReturn.status} />
                        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                          {operationReturn.returnType}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
                          <p className="font-bold text-slate-800">{operationReturn.customerName || "Sin nombre"}</p>
                          <p className="text-xs font-semibold text-slate-500">{operationReturn.customerEmail || operationReturn.customerPhone || "Sin contacto"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo / resolución</p>
                          <p className="font-bold text-slate-800">{operationReturn.reason || "Sin motivo"}</p>
                          <p className="text-xs font-semibold text-slate-500">{operationReturn.resolution || "Sin resolución"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cantidades</p>
                          <p className="font-bold text-slate-800">Recibida: {operationReturn.receivedQuantity}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            Aceptada {operationReturn.acceptedQuantity} · Rechazada {operationReturn.rejectedQuantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actualizado</p>
                          <p className="font-bold text-slate-800">{formatDateTime(operationReturn.updatedAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">Creado {formatDateTime(operationReturn.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-3">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Garantía / reemplazo</p>
                          <p className="mt-1 font-black text-slate-900">{operationReturn.warranty?.code || "Sin garantía"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {operationReturn.replacement ? `${operationReturn.replacement.code} · ${operationReturn.replacement.status}` : "Sin reemplazo"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comercial / PT</p>
                          <p className="mt-1 font-black text-slate-900">{operationReturn.commercialOrder?.code || "Sin pedido"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {operationReturn.finishedGood ? `${operationReturn.finishedGood.code} · ${operationReturn.finishedGood.name}` : "Sin producto terminado"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despacho original</p>
                          <p className="mt-1 font-black text-slate-900">{operationReturn.originalDispatch?.code || "Sin despacho"}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {operationReturn.originalDispatch ? `${operationReturn.originalDispatch.status} · ${operationReturn.originalDispatch.destinationName || operationReturn.originalDispatch.destinationType}` : "No vinculado"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 md:grid-cols-4">
                        <span>Recibido: {formatDateTime(operationReturn.receivedAt)}</span>
                        <span>Inspeccionado: {formatDateTime(operationReturn.inspectedAt)}</span>
                        <span>Completado: {formatDateTime(operationReturn.completedAt)}</span>
                        <span>Cancelado: {formatDateTime(operationReturn.cancelledAt)}</span>
                      </div>
                    </div>

                    <div className="flex min-w-[210px] flex-col gap-2">
                      {actions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Sin acciones operativas
                        </div>
                      ) : (
                        actions.map((action) => {
                          const eventKey = `${operationReturn.id}:${action.eventType}`;
                          return (
                            <button
                              key={action.eventType}
                              type="button"
                              onClick={() => openEventModal(operationReturn, action.eventType, action.label, action.requiresQuantity)}
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
          <form onSubmit={handleCreateReturn} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nueva devolución</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar caso postventa</h3>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} disabled={saving} className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["code", "Code *", "RET-001"],
                ["returnType", "Tipo", "customer_return"],
                ["reason", "Motivo", "Falla, daño, reclamo"],
                ["resolution", "Resolución", "Pendiente, retorno, descarte"],
                ["customerName", "Cliente", "Nombre cliente"],
                ["customerEmail", "Email", "cliente@correo.com"],
                ["customerPhone", "Teléfono", "+507 000-0000"],
              ].map(([field, label, placeholder]) => (
                <label key={field} className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                  <input
                    value={form[field as keyof ReturnFormState]}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Garantía</span>
                <select value={form.warrantyId} onChange={(event) => setForm((current) => ({ ...current, warrantyId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary">
                  <option value="">Sin garantía</option>
                  {warranties.map((warranty) => (
                    <option key={warranty.id} value={warranty.id}>
                      {warranty.code} · {warranty.status} · {warranty.coverageStatus} · {warranty.customerName || "sin cliente"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reemplazo</span>
                <select value={form.replacementId} onChange={(event) => setForm((current) => ({ ...current, replacementId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary">
                  <option value="">Sin reemplazo</option>
                  {replacements.map((replacement) => (
                    <option key={replacement.id} value={replacement.id}>
                      {replacement.code} · {replacement.status} · {replacement.customerName || "sin cliente"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido comercial</span>
                <select value={form.commercialOrderId} onChange={(event) => setForm((current) => ({ ...current, commercialOrderId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary">
                  <option value="">Sin pedido</option>
                  {commercialOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.code} · {order.status} · {order.customerName || "sin cliente"} · {formatMoney(order.totalAmount, order.currency)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto terminado</span>
                <select value={form.finishedGoodId} onChange={(event) => setForm((current) => ({ ...current, finishedGoodId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary">
                  <option value="">Sin PT</option>
                  {finishedGoods.map((finishedGood) => (
                    <option key={finishedGood.id} value={finishedGood.id}>
                      {finishedGood.code} · {finishedGood.name} · {finishedGood.productType} · balance {finishedGood.balance}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despacho original</span>
                <select value={form.originalDispatchId} onChange={(event) => setForm((current) => ({ ...current, originalDispatchId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary">
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
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary" placeholder="Contexto operativo o evidencia" />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} disabled={saving} className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Crear devolución
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
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{eventModal.operationReturn.code}</h3>
              </div>
              <button type="button" onClick={() => setEventModal(null)} disabled={Boolean(savingEventKey)} className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            {eventModal.eventType === "RETURNED_TO_INVENTORY" && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                Retorna a Inventario PT mediante evento RETURN para actualizar el balance operativo.
              </div>
            )}

            {eventModal.requiresQuantity && (
              <label className="mb-4 block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity *</span>
                <input type="number" min="1" step="1" value={eventQuantity} onChange={(event) => setEventQuantity(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary" placeholder="1" />
              </label>
            )}

            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason opcional</span>
              <textarea value={eventReason} onChange={(event) => setEventReason(event.target.value)} className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary" placeholder="Motivo operativo del evento" />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEventModal(null)} disabled={Boolean(savingEventKey)} className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={Boolean(savingEventKey)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50">
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

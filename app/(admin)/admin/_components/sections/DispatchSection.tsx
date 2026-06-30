"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Globe,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  Store,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

type DispatchEventType = "RESERVED" | "RELEASED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";

interface DispatchType {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
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

interface DispatchItem {
  id: string;
  dispatchId: string;
  finishedGoodId: string;
  quantity: number;
  unit: string;
  notes: string | null;
  finishedGood: FinishedGoodOption;
}

interface OperationDispatch {
  id: string;
  code: string;
  status: string;
  destinationType: string;
  destinationName: string | null;
  destinationReference: string | null;
  destinationAddress: string | null;
  scheduledAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: DispatchItem[];
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

const DISPATCH_TYPES: DispatchType[] = [
  {
    key: "customer",
    label: "Cliente",
    icon: User,
    description: "Despacho a cliente final",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "point_of_sale",
    label: "Punto de venta",
    icon: MapPin,
    description: "Despacho a punto de venta",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "external_warehouse",
    label: "Almacén externo",
    icon: Store,
    description: "Salida a bodega externa",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "internal_delivery",
    label: "Entrega interna",
    icon: Users,
    description: "Entrega operativa interna",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "other",
    label: "Otro destino",
    icon: Globe,
    description: "Destino operativo especial",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

const TIMELINE_STEPS = [
  { label: "Inventario PT", icon: PackageCheck, description: "Producto disponible" },
  { label: "Reserva", icon: ClipboardCheck, description: "Apartar cantidades" },
  { label: "Guía", icon: FileText, description: "Referencia logística" },
  { label: "Salida", icon: Truck, description: "Descuento por ISSUE" },
  { label: "Entregado", icon: CheckCircle2, description: "Confirmación final" },
];

const DISPATCH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-50 border-slate-200 text-slate-700" },
  reserved: { label: "Reservado", color: "bg-amber-50 border-amber-200 text-amber-800" },
  released: { label: "Liberado", color: "bg-blue-50 border-blue-200 text-blue-800" },
  dispatched: { label: "Despachado", color: "bg-purple-50 border-purple-200 text-purple-800" },
  delivered: { label: "Entregado", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelado", color: "bg-red-50 border-red-200 text-red-700" },
};

const DISPATCH_EVENT_SUCCESS_COPY: Record<DispatchEventType, string> = {
  RESERVED: "Despacho reservado",
  RELEASED: "Reserva liberada",
  DISPATCHED: "Despacho marcado como salido",
  DELIVERED: "Despacho entregado",
  CANCELLED: "Despacho cancelado",
};

const DISPATCH_ACTIONS_BY_STATUS: Record<string, Array<{ label: string; eventType: DispatchEventType; tone: string }>> = {
  draft: [
    { label: "Reservar", eventType: "RESERVED", tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
    { label: "Despachar", eventType: "DISPATCHED", tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  reserved: [
    { label: "Liberar reserva", eventType: "RELEASED", tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" },
    { label: "Despachar", eventType: "DISPATCHED", tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  released: [
    { label: "Despachar", eventType: "DISPATCHED", tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  dispatched: [
    { label: "Marcar entregado", eventType: "DELIVERED", tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
  ],
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
  const [dispatches, setDispatches] = useState<OperationDispatch[]>([]);
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
        throw new Error(data.error || "No se pudo cargar Inventario PT");
      }

      setFinishedGoods(Array.isArray(data.finishedGoods) ? data.finishedGoods : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar Inventario PT";
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

  const formatDate = (value: string | null) => {
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

  const getDestinationLabel = (destinationType: string) => {
    return DISPATCH_TYPES.find((type) => type.key === destinationType)?.label || destinationType;
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

  const handleDispatchEvent = async (dispatch: OperationDispatch, eventType: DispatchEventType) => {
    const eventKey = `${dispatch.id}:${eventType}`;
    setSavingEventKey(eventKey);

    try {
      const res = await fetch(`/api/admin/operations/dispatches/${dispatch.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          reason: DISPATCH_EVENT_SUCCESS_COPY[eventType],
          referenceType: "dispatch",
          referenceId: dispatch.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar evento de despacho");
      }

      toast.success(DISPATCH_EVENT_SUCCESS_COPY[eventType]);
      await loadDispatches({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar evento de despacho";
      toast.error(message);
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
          Control de salidas desde Inventario PT, reservas, entregas y trazabilidad logística.
        </p>
      </div>

      <div className="rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-800 dark:bg-indigo-950/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-indigo-100 p-3 dark:bg-indigo-900/50">
            <AlertTriangle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-100 mb-2">
              Despacho descuenta Inventario PT mediante eventos
            </h3>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Las reservas y salidas se registran como movimientos inmutables. El balance sale de eventos de Inventario PT.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
          Flujo de Despacho
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {TIMELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center min-w-[100px]">
                  <div className="rounded-xl bg-slate-100 p-2 mb-2 dark:bg-slate-800">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    {step.label}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500 mt-1">{step.description}</p>
                </div>
                {!isLast && (
                  <div className="mx-2 text-slate-300 dark:text-slate-700">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Draft</span>
          </div>
          <p className="text-2xl font-black">{metrics.draft}</p>
        </div>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <PackageCheck className="h-4 w-4 text-cyan-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reserved</span>
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
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Items</span>
          </div>
          <p className="text-2xl font-black">{formatQuantity(metrics.itemQuantity)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Tipos de Despacho</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DISPATCH_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.key} className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
                <div className={`rounded-xl p-2 mb-3 inline-flex ${type.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-1">{type.label}</p>
                <p className="text-[10px] font-medium text-slate-500">{type.description}</p>
              </div>
            );
          })}
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
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Destino</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Referencia</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Dirección</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Items</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Fechas</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatches.map((dispatch) => {
                  const status = DISPATCH_STATUS_CONFIG[dispatch.status] || {
                    label: dispatch.status,
                    color: "bg-slate-50 border-slate-200 text-slate-700",
                  };
                  const actions = DISPATCH_ACTIONS_BY_STATUS[dispatch.status] || [];

                  return (
                    <tr key={dispatch.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-black text-primary">{dispatch.code}</span>
                        {dispatch.notes && <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">{dispatch.notes}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-black text-slate-900">{getDestinationLabel(dispatch.destinationType)}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">{dispatch.destinationName || "Sin nombre"}</p>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{dispatch.destinationReference || "Sin referencia"}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{dispatch.destinationAddress || "Sin dirección"}</td>
                      <td className="px-4 py-4">
                        <div className="min-w-[220px] space-y-1">
                          {dispatch.items.map((item) => (
                            <p key={item.id} className="text-[11px] font-semibold text-slate-600">
                              <span className="font-mono font-black text-slate-900">{item.finishedGood.code}</span> · {item.finishedGood.name} · {formatQuantity(item.quantity)} {item.unit}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-[170px] text-[11px] font-semibold text-slate-500">
                          <p>Creado: {formatDate(dispatch.createdAt)}</p>
                          <p>Prog.: {formatDate(dispatch.scheduledAt)}</p>
                          <p>Salida: {formatDate(dispatch.dispatchedAt)}</p>
                          <p>Entregado: {formatDate(dispatch.deliveredAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {actions.length === 0 ? (
                          <span className="text-[11px] font-bold text-slate-400">Sin acciones</span>
                        ) : (
                          <div className="flex min-w-[220px] flex-wrap gap-2">
                            {actions.map((action) => {
                              const eventKey = `${dispatch.id}:${action.eventType}`;
                              const isSaving = savingEventKey === eventKey;

                              return (
                                <button
                                  key={action.eventType}
                                  type="button"
                                  onClick={() => handleDispatchEvent(dispatch, action.eventType)}
                                  disabled={Boolean(savingEventKey)}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-50 ${action.tone}`}
                                >
                                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                                  {action.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateDispatch} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Despacho</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear despacho</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Selecciona producto terminado disponible. La reserva o salida se registra con acciones por estado.
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de destino</span>
                  <select
                    value={form.destinationType}
                    onChange={(event) => updateForm("destinationType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    {DISPATCH_TYPES.map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Destino</span>
                  <input
                    value={form.destinationName}
                    onChange={(event) => updateForm("destinationName", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Cliente, POS o almacén"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Referencia</span>
                  <input
                    value={form.destinationReference}
                    onChange={(event) => updateForm("destinationReference", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Pedido, guía o contacto"
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
                    placeholder="Dirección operativa de entrega"
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

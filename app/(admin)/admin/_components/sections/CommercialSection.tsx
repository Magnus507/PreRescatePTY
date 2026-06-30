"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingCart,
  X,
} from "lucide-react";
import { toast } from "sonner";

type CommercialEventType =
  | "CONFIRMED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "FULFILLMENT_REQUESTED"
  | "CANCELLED"
  | "REFUNDED";

interface FinishedGoodOption {
  id: string;
  code: string;
  name: string;
  productType: string;
  status: string;
  unit: string;
  balance: number;
}

interface CommercialOrderItem {
  id: string;
  finishedGoodId: string | null;
  productCode: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
  notes: string | null;
  finishedGood: FinishedGoodOption | null;
}

interface CommercialOrder {
  id: string;
  code: string;
  status: string;
  customerType: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerReference: string | null;
  salesChannel: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalAmount: number;
  currency: string;
  dispatchId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: CommercialOrderItem[];
  dispatch?: {
    id: string;
    code: string;
    status: string;
    destinationType: string;
  } | null;
}

interface CommercialFormItem {
  finishedGoodId: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  unit: string;
  notes: string;
}

interface CommercialFormState {
  code: string;
  customerType: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerReference: string;
  salesChannel: string;
  paymentStatus: string;
  currency: string;
  notes: string;
  dispatchId: string;
  items: CommercialFormItem[];
}

interface StatCardConfig {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: string;
}

const EMPTY_FORM: CommercialFormState = {
  code: "",
  customerType: "customer",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerReference: "",
  salesChannel: "admin",
  paymentStatus: "pending",
  currency: "USD",
  notes: "",
  dispatchId: "",
  items: [
    {
      finishedGoodId: "",
      productCode: "",
      productName: "",
      quantity: "1",
      unitPrice: "0",
      unit: "unit",
      notes: "",
    },
  ],
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-50 border-slate-200 text-slate-700" },
  confirmed: { label: "Confirmado", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelado", color: "bg-red-50 border-red-200 text-red-700" },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pago pendiente", color: "bg-amber-50 border-amber-200 text-amber-800" },
  paid: { label: "Pagado", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  refunded: { label: "Reembolsado", color: "bg-blue-50 border-blue-200 text-blue-800" },
};

const FULFILLMENT_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-slate-50 border-slate-200 text-slate-700" },
  reserved: { label: "Reservado", color: "bg-amber-50 border-amber-200 text-amber-800" },
  requested: { label: "Fulfillment solicitado", color: "bg-purple-50 border-purple-200 text-purple-800" },
};

const EVENT_SUCCESS_COPY: Record<CommercialEventType, string> = {
  CONFIRMED: "Pedido comercial confirmado",
  PAYMENT_PENDING: "Pago marcado como pendiente",
  PAID: "Pedido marcado como pagado",
  FULFILLMENT_REQUESTED: "Despacho creado desde Comercial",
  CANCELLED: "Pedido comercial cancelado",
  REFUNDED: "Pago reembolsado",
};

const ACTIONS_BY_STATUS: Record<string, Array<{ label: string; eventType: CommercialEventType; tone: string }>> = {
  draft: [
    { label: "Confirmar", eventType: "CONFIRMED", tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  confirmed: [
    { label: "Marcar pagado", eventType: "PAID", tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
    { label: "Pago pendiente", eventType: "PAYMENT_PENDING", tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

function canRequestFulfillment(order: CommercialOrder) {
  const hasFinishedGoodItems =
    order.items.length > 0 && order.items.every((item) => Boolean(item.finishedGoodId));

  return (
    !order.dispatch &&
    order.status !== "cancelled" &&
    hasFinishedGoodItems &&
    (order.status === "confirmed" || order.paymentStatus === "paid")
  );
}

export function CommercialSection() {
  const [orders, setOrders] = useState<CommercialOrder[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEventKey, setSavingEventKey] = useState<string | null>(null);
  const [form, setForm] = useState<CommercialFormState>(EMPTY_FORM);

  const formTotal = useMemo(() => {
    return form.items.reduce((total, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return total;
      return total + quantity * unitPrice;
    }, 0);
  }, [form.items]);

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === "draft").length;
    const confirmed = orders.filter((order) => order.status === "confirmed").length;
    const paid = orders.filter((order) => order.paymentStatus === "paid").length;
    const total = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    return { pending, confirmed, paid, total };
  }, [orders]);

  const statCards: StatCardConfig[] = [
    {
      label: "Borradores",
      value: stats.pending,
      icon: ShoppingCart,
      tone: "bg-slate-50 text-slate-700 border-slate-200",
    },
    {
      label: "Confirmados",
      value: stats.confirmed,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      label: "Pagados",
      value: stats.paid,
      icon: CreditCard,
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      label: "Total listado",
      value: formatMoney(stats.total, "USD"),
      icon: PackageCheck,
      tone: "bg-purple-50 text-purple-700 border-purple-200",
    },
  ];

  const loadOrders = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/admin/operations/commercial-orders", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar pedidos comerciales");
      }

      setOrders(Array.isArray(data.commercialOrders) ? data.commercialOrders : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al cargar pedidos comerciales"));
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
      toast.error(getErrorMessage(error, "Error al cargar Inventario PT"));
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadFinishedGoods();
  }, [loadFinishedGoods, loadOrders]);

  const updateItem = (index: number, patch: Partial<CommercialFormItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleFinishedGoodChange = (index: number, finishedGoodId: string) => {
    const finishedGood = finishedGoods.find((item) => item.id === finishedGoodId);
    updateItem(index, {
      finishedGoodId,
      productCode: finishedGood?.code || "",
      productName: finishedGood?.name || "",
      unit: finishedGood?.unit || "unit",
    });
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          finishedGoodId: "",
          productCode: "",
          productName: "",
          quantity: "1",
          unitPrice: "0",
          unit: "unit",
          notes: "",
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleCreateOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error("El code es requerido");
      return;
    }

    const items = form.items.map((item) => ({
      finishedGoodId: item.finishedGoodId || undefined,
      productCode: item.productCode.trim() || undefined,
      productName: item.productName.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      unit: item.unit.trim() || "unit",
      notes: item.notes.trim() || undefined,
    }));

    if (items.some((item) => !item.productName)) {
      toast.error("Cada item requiere productName");
      return;
    }

    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      toast.error("Cada item requiere quantity positivo");
      return;
    }

    if (items.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      toast.error("Cada item requiere unitPrice mayor o igual a 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/commercial-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          customerType: form.customerType,
          customerName: form.customerName.trim() || undefined,
          customerEmail: form.customerEmail.trim() || undefined,
          customerPhone: form.customerPhone.trim() || undefined,
          customerReference: form.customerReference.trim() || undefined,
          salesChannel: form.salesChannel.trim() || "admin",
          paymentStatus: form.paymentStatus,
          currency: form.currency.trim() || "USD",
          dispatchId: form.dispatchId.trim() || undefined,
          notes: form.notes.trim() || undefined,
          items,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el pedido comercial");
      }

      toast.success("Pedido comercial creado");
      setForm(EMPTY_FORM);
      setShowCreateModal(false);
      await loadOrders({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al crear pedido comercial"));
    } finally {
      setSaving(false);
    }
  };

  const handleOrderEvent = async (order: CommercialOrder, eventType: CommercialEventType) => {
    const eventKey = `${order.id}:${eventType}`;
    setSavingEventKey(eventKey);

    try {
      const res = await fetch(`/api/admin/operations/commercial-orders/${order.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          amount: eventType === "PAID" || eventType === "REFUNDED" ? order.totalAmount : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el evento comercial");
      }

      toast.success(EVENT_SUCCESS_COPY[eventType]);
      await loadOrders({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al registrar evento comercial"));
    } finally {
      setSavingEventKey(null);
    }
  };

  const getActionsForOrder = (order: CommercialOrder) => {
    if (order.status === "cancelled") {
      return order.paymentStatus === "paid"
        ? [
            {
              label: "Reembolsar",
              eventType: "REFUNDED" as CommercialEventType,
              tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
            },
          ]
        : [];
    }

    const actions = ACTIONS_BY_STATUS[order.status] || [];

    if (!canRequestFulfillment(order)) {
      return actions;
    }

    return [
      ...actions,
      {
        label: "Solicitar despacho",
        eventType: "FULFILLMENT_REQUESTED" as CommercialEventType,
        tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100",
      },
    ];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Comercial operativo</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Pedidos comerciales</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Ventas operativas conectadas a Inventario PT por referencia, sin tocar checkout ni pedidos legacy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadOrders({ silent: true })}
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
              Nuevo pedido
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
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
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <ShoppingCart className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h3 className="text-lg font-black text-slate-900">Sin pedidos comerciales</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
              Crea el primer pedido comercial operativo para conectarlo luego con reservas y despacho.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const actions = getActionsForOrder(order);

              return (
                <article key={order.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-slate-950">{order.code}</h3>
                        <StatusBadge value={order.status} config={STATUS_CONFIG} />
                        <StatusBadge value={order.paymentStatus} config={PAYMENT_CONFIG} />
                        <StatusBadge value={order.fulfillmentStatus} config={FULFILLMENT_CONFIG} />
                      </div>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
                          <p className="font-bold text-slate-800">{order.customerName || "Sin nombre"}</p>
                          <p className="text-xs font-semibold text-slate-500">{order.customerEmail || order.customerPhone || order.customerType}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canal</p>
                          <p className="font-bold text-slate-800">{order.salesChannel}</p>
                          <p className="text-xs font-semibold text-slate-500">{order.customerReference || "Sin referencia"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                          <p className="font-black text-slate-950">{formatMoney(order.totalAmount, order.currency)}</p>
                          <p className="text-xs font-semibold text-slate-500">{order.items.length} item(s)</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actualizado</p>
                          <p className="font-bold text-slate-800">{formatDate(order.updatedAt)}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            {order.dispatch ? `Despacho ${order.dispatch.code} · ${order.dispatch.status}` : "Sin despacho vinculado"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-black text-slate-900">{item.productName}</p>
                              <p className="text-xs font-semibold text-slate-500">
                                {item.productCode || item.finishedGood?.code || "Producto sin codigo"} · {item.quantity} {item.unit}
                                {typeof item.finishedGood?.balance === "number" ? ` · balance ${item.finishedGood.balance}` : ""}
                              </p>
                            </div>
                            <p className="font-black text-slate-950">{formatMoney(item.totalPrice, order.currency)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex min-w-[190px] flex-col gap-2">
                      {actions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Sin acciones operativas
                        </div>
                      ) : (
                        actions.map((action) => {
                          const eventKey = `${order.id}:${action.eventType}`;
                          return (
                            <button
                              key={action.eventType}
                              type="button"
                              onClick={() => handleOrderEvent(order, action.eventType)}
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
          <form onSubmit={handleCreateOrder} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nuevo pedido comercial</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar venta operativa</h3>
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
                  placeholder="COM-001"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo cliente</span>
                <select
                  value={form.customerType}
                  onChange={(event) => setForm((current) => ({ ...current, customerType: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="customer">Cliente</option>
                  <option value="organization">Organizacion</option>
                  <option value="point_of_sale">Punto de venta</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canal</span>
                <input
                  value={form.salesChannel}
                  onChange={(event) => setForm((current) => ({ ...current, salesChannel: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="admin"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre cliente</span>
                <input
                  value={form.customerName}
                  onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="Cliente o empresa"
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
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referencia</span>
                <input
                  value={form.customerReference}
                  onChange={(event) => setForm((current) => ({ ...current, customerReference: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="OC, contacto o documento"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pago</span>
                <select
                  value={form.paymentStatus}
                  onChange={(event) => setForm((current) => ({ ...current, paymentStatus: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                >
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moneda</span>
                <input
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                  placeholder="USD"
                />
              </label>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Items</p>
                  <p className="text-sm font-bold text-slate-600">Total visual: {formatMoney(formTotal, form.currency)}</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Agregar item
                </button>
              </div>

              {form.items.map((item, index) => {
                const selectedFinishedGood = finishedGoods.find((finishedGood) => finishedGood.id === item.finishedGoodId);

                return (
                  <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 lg:grid-cols-12">
                      <label className="space-y-2 lg:col-span-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto terminado</span>
                        <select
                          value={item.finishedGoodId}
                          onChange={(event) => handleFinishedGoodChange(index, event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                        >
                          <option value="">Sin vincular</option>
                          {finishedGoods.map((finishedGood) => (
                            <option key={finishedGood.id} value={finishedGood.id}>
                              {finishedGood.code} · {finishedGood.name} · balance {finishedGood.balance}
                            </option>
                          ))}
                        </select>
                        {selectedFinishedGood && (
                          <p className="text-[11px] font-bold text-slate-500">
                            {selectedFinishedGood.productType} · {selectedFinishedGood.status} · balance {selectedFinishedGood.balance} {selectedFinishedGood.unit}
                          </p>
                        )}
                      </label>
                      <label className="space-y-2 lg:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Codigo</span>
                        <input
                          value={item.productCode}
                          onChange={(event) => updateItem(index, { productCode: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                          placeholder="PT-001"
                        />
                      </label>
                      <label className="space-y-2 lg:col-span-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Producto *</span>
                        <input
                          value={item.productName}
                          onChange={(event) => updateItem(index, { productName: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                          placeholder="Sticker NFC listo"
                        />
                      </label>
                      <label className="space-y-2 lg:col-span-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cant.</span>
                        <input
                          value={item.quantity}
                          onChange={(event) => updateItem(index, { quantity: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                          placeholder="1"
                        />
                      </label>
                      <label className="space-y-2 lg:col-span-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Precio</span>
                        <input
                          value={item.unitPrice}
                          onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                          placeholder="0"
                        />
                      </label>
                      <label className="space-y-2 lg:col-span-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidad</span>
                        <input
                          value={item.unit}
                          onChange={(event) => updateItem(index, { unit: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                          placeholder="unit"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <input
                        value={item.notes}
                        onChange={(event) => updateItem(index, { notes: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                        placeholder="Notas de linea"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-white disabled:opacity-40"
                      >
                        <X className="h-4 w-4" />
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notas</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-[90px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-primary"
                placeholder="Notas internas del pedido comercial"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
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
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Crear pedido
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Reserva automatica pendiente</h3>
            <p className="mt-1 text-sm font-semibold">
              Solicitar despacho crea un despacho operativo en borrador. La reserva y salida se ejecutan desde Despacho para conservar balances por eventos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

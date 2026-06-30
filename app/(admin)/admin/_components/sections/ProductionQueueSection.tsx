"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Factory,
  Clock,
  CheckCircle2,
  Package,
  Building2,
  Users,
  ExternalLink,
  Smartphone,
  Layers,
  FileText,
  Sticker,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import FabricationSection from "./FabricationSection";
import { ProductionWorkflowSection } from "./ProductionWorkflowSection";

interface QueueItem {
  orderId: string;
  orderNumber: string;
  companyName: string;
  totalItems: number;
  totalCollaborators: number;
  summaryByProductType: Record<string, number>;
  chipsNfc: number;
  productionStatus: "pending" | "in_production" | "packing" | "done";
  createdAt: string;
}

interface Counts {
  pending: number;
  inProduction: number;
  packing: number;
  done: number;
}

interface ProductionOrder {
  id: string;
  code: string;
  title: string;
  status: string;
  plannedQuantity: number;
  producedQuantity: number;
  outputType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductionOrderFormState {
  code: string;
  title: string;
  plannedQuantity: string;
  outputType: string;
  notes: string;
}

const EMPTY_PRODUCTION_ORDER_FORM: ProductionOrderFormState = {
  code: "",
  title: "",
  plannedQuantity: "",
  outputType: "",
  notes: "",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pendiente",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <Clock className="h-4 w-4" />,
  },
  in_production: {
    label: "En producción",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    icon: <Factory className="h-4 w-4" />,
  },
  packing: {
    label: "Empaque",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    icon: <Package className="h-4 w-4" />,
  },
  done: {
    label: "Completado",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-50 border-slate-200 text-slate-700" },
  planned: { label: "Planificada", color: "bg-amber-50 border-amber-200 text-amber-800" },
  started: { label: "Iniciada", color: "bg-purple-50 border-purple-200 text-purple-800" },
  paused: { label: "Pausada", color: "bg-orange-50 border-orange-200 text-orange-800" },
  completed: { label: "Completada", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelada", color: "bg-red-50 border-red-200 text-red-800" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  initial_chip: <Smartphone className="h-3 w-3" />,
  bracelet: <Layers className="h-3 w-3" />,
  credential: <FileText className="h-3 w-3" />,
  sticker_nfc_qr: <Sticker className="h-3 w-3" />,
};

export default function ProductionQueueSection() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, inProduction: 0, packing: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState<ProductionOrderFormState>(EMPTY_PRODUCTION_ORDER_FORM);

  const loadProductionOrders = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshingOrders(true);
    } else {
      setLoadingOrders(true);
    }

    try {
      const res = await fetch("/api/admin/operations/production-orders", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar ordenes de produccion");
      }

      setProductionOrders(Array.isArray(data.productionOrders) ? data.productionOrders : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar ordenes de produccion";
      toast.error(message);
    } finally {
      setLoadingOrders(false);
      setRefreshingOrders(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fabrication/queue");
      if (!res.ok) throw new Error("Error al cargar cola");
      const data = await res.json();
      setQueue(data.queue || []);
      setCounts(data.counts || { pending: 0, inProduction: 0, packing: 0, done: 0 });
    } catch {
      toast.error("Error al cargar cola de producción");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    loadProductionOrders();
  }, [loadQueue, loadProductionOrders]);

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

  const updateForm = (field: keyof ProductionOrderFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (savingOrder) return;
    setShowCreateModal(false);
    setForm(EMPTY_PRODUCTION_ORDER_FORM);
  };

  const handleCreateProductionOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim();
    const title = form.title.trim();
    const outputType = form.outputType.trim();
    const plannedQuantity = Number(form.plannedQuantity);

    if (!code) {
      toast.error("Code es requerido");
      return;
    }

    if (!title) {
      toast.error("Nombre de la orden es requerido");
      return;
    }

    if (!Number.isFinite(plannedQuantity) || plannedQuantity <= 0) {
      toast.error("La cantidad planificada debe ser positiva");
      return;
    }

    if (!outputType) {
      toast.error("Tipo de producto es requerido");
      return;
    }

    setSavingOrder(true);

    try {
      const res = await fetch("/api/admin/operations/production-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title,
          plannedQuantity,
          outputType,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(data.error || "Ya existe una orden con ese code");
        }
        throw new Error(data.error || "No se pudo crear la orden de produccion");
      }

      toast.success("Orden de produccion creada");
      setShowCreateModal(false);
      setForm(EMPTY_PRODUCTION_ORDER_FORM);
      await loadProductionOrders({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear orden de produccion";
      toast.error(message);
    } finally {
      setSavingOrder(false);
    }
  };

  const filtered = statusFilter ? queue.filter((o) => o.productionStatus === statusFilter) : queue;

  // If we're viewing a specific order's fabrication detail
  if (openOrderId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpenOrderId(null)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            ← Volver a cola
          </button>
        </div>
        <FabricationSection orderId={openOrderId} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Factory className="h-8 w-8 text-primary" /> Producción
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Produccion para stock y produccion empresarial bajo pedido.
        </p>
      </div>

      <ProductionWorkflowSection />

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-slate-500" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Ordenes de produccion</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
            >
              <Plus className="h-4 w-4" />
              Crear orden
            </button>
            <button
              type="button"
              onClick={() => loadProductionOrders({ silent: true })}
              disabled={refreshingOrders}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:opacity-50"
            >
              {refreshingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>

        {loadingOrders ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : productionOrders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <Factory className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              No hay ordenes de produccion registradas
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Las ordenes creadas desde esta seccion apareceran aqui con trazabilidad por eventos.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Orden</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Plan</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Producido</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Creada</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Actualizada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productionOrders.map((order) => {
                  const status = ORDER_STATUS_CONFIG[order.status] || {
                    label: order.status,
                    color: "bg-slate-50 border-slate-200 text-slate-700",
                  };

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-black text-primary">{order.code}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-black text-slate-900">{order.title}</p>
                          {order.notes && (
                            <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">{order.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{order.outputType}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-slate-900">
                        {formatQuantity(order.plannedQuantity)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-slate-900">
                        {formatQuantity(order.producedQuantity)}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(order.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              statusFilter === key
                ? "ring-2 ring-primary ring-offset-2 " + cfg.color
                : cfg.color + " opacity-80 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {cfg.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{cfg.label}</span>
            </div>
            <p className="text-2xl font-black">{counts[key as keyof Counts]}</p>
          </button>
        ))}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <Factory className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            {statusFilter
              ? "No hay pedidos en este estado"
              : "No hay pedidos corporativos en cola de producción"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Los pedidos corporativos aprobados y pagados aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const cfg = STATUS_CONFIG[item.productionStatus] || STATUS_CONFIG.pending;
            return (
              <div
                key={item.orderId}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all"
              >
                {/* Info principal */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono font-bold text-sm">#{item.orderNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-flex items-center gap-1 ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {item.companyName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-3 w-3" /> {item.totalItems} producto(s)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {item.totalCollaborators} colaborador(es)
                    </span>
                    {item.chipsNfc > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="h-3 w-3" /> {item.chipsNfc} chip(s)
                      </span>
                    )}
                  </div>

                  {/* Product types */}
                  {Object.keys(item.summaryByProductType).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(item.summaryByProductType).map(([type, count]) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-[8px] font-bold uppercase text-slate-600"
                        >
                          {TYPE_ICONS[type] || <Package className="h-2.5 w-2.5" />}
                          {count} {type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón abrir fabricación */}
                <button
                  onClick={() => setOpenOrderId(item.orderId)}
                  className="w-full sm:w-auto px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all inline-flex items-center justify-center gap-2 shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir fabricación
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleCreateProductionOrder} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Produccion</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Crear orden</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Registra una orden operativa base. Los avances y consumos se registraran por eventos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={savingOrder}
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
                    placeholder="PROD-STOCK-001"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</span>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Produccion stickers NFC"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad planificada</span>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.plannedQuantity}
                    onChange={(event) => updateForm("plannedQuantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de producto</span>
                  <input
                    required
                    value={form.outputType}
                    onChange={(event) => updateForm("outputType", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="sticker_nfc_qr"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Notas internas de planificacion"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={savingOrder}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingOrder}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950 disabled:opacity-50"
                >
                  {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Guardar orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

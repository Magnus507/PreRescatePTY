"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Factory,
  Clock,
  CheckCircle2,
  Package,
  PackageCheck,
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
  ClipboardList,
  Wrench,
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

interface AssemblyCandidate {
  id: string;
  internalLabel: string;
  status: string;
  batchId: string;
  batchCode: string;
  productType: string;
  printOrderStatus: string | null;
}

interface ProductionOrderFormState {
  code: string;
  title: string;
  plannedQuantity: string;
  outputType: string;
  notes: string;
}

type ProductionEventType =
  | "PLANNED"
  | "STARTED"
  | "PRODUCED"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

interface ProducedFormState {
  quantity: string;
  reason: string;
}

const EMPTY_PRODUCTION_ORDER_FORM: ProductionOrderFormState = {
  code: "",
  title: "",
  plannedQuantity: "",
  outputType: "",
  notes: "",
};

const EMPTY_PRODUCED_FORM: ProducedFormState = {
  quantity: "",
  reason: "",
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
  started: { label: "En proceso", color: "bg-purple-50 border-purple-200 text-purple-800" },
  paused: { label: "Pausada", color: "bg-orange-50 border-orange-200 text-orange-800" },
  completed: { label: "Lista para QA", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  cancelled: { label: "Cancelada", color: "bg-red-50 border-red-200 text-red-800" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  initial_chip: <Smartphone className="h-3 w-3" />,
  bracelet: <Layers className="h-3 w-3" />,
  credential: <FileText className="h-3 w-3" />,
  sticker_nfc_qr: <Sticker className="h-3 w-3" />,
};

const EVENT_SUCCESS_COPY: Record<ProductionEventType, string> = {
  PLANNED: "Orden planificada",
  STARTED: "Orden iniciada",
  PRODUCED: "Produccion registrada",
  PAUSED: "Orden pausada",
  COMPLETED: "Orden completada",
  CANCELLED: "Orden cancelada",
};

const ACTIONS_BY_STATUS: Record<string, Array<{ label: string; eventType: ProductionEventType; tone: string }>> = {
  draft: [
    { label: "Planificar", eventType: "PLANNED", tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  planned: [
    { label: "Iniciar", eventType: "STARTED", tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
  started: [
    { label: "Registrar producido", eventType: "PRODUCED", tone: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
    { label: "Pausar", eventType: "PAUSED", tone: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100" },
    { label: "Completar", eventType: "COMPLETED", tone: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" },
  ],
  paused: [
    { label: "Reanudar", eventType: "STARTED", tone: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100" },
    { label: "Cancelar", eventType: "CANCELLED", tone: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  ],
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
  const [savingEventKey, setSavingEventKey] = useState<string | null>(null);
  const [producedOrder, setProducedOrder] = useState<ProductionOrder | null>(null);
  const [producedForm, setProducedForm] = useState<ProducedFormState>(EMPTY_PRODUCED_FORM);
  const [form, setForm] = useState<ProductionOrderFormState>(EMPTY_PRODUCTION_ORDER_FORM);
  const [assemblyCandidates, setAssemblyCandidates] = useState<AssemblyCandidate[]>([]);
  const [loadingAssemblyCandidates, setLoadingAssemblyCandidates] = useState(true);
  const [assemblyProductionOrderId, setAssemblyProductionOrderId] = useState("");
  const [selectedAssemblyItemIds, setSelectedAssemblyItemIds] = useState<string[]>([]);
  const [assemblingUnits, setAssemblingUnits] = useState(false);

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

  const loadAssemblyCandidates = useCallback(async () => {
    setLoadingAssemblyCandidates(true);
    try {
      const res = await fetch("/api/admin/operations/digital-batches", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar los candidatos de ensamblaje");
      }

      const flattened: AssemblyCandidate[] = Array.isArray(data.batches)
        ? data.batches.flatMap((batch: { id: string; code?: string; productType?: string; items?: Array<{ id: string; internalLabel: string; status: string }> }) =>
            Array.isArray(batch.items)
              ? batch.items.map((item) => ({
                  id: item.id,
                  internalLabel: item.internalLabel,
                  status: item.status,
                  batchId: batch.id,
                  batchCode: batch.code || batch.id,
                  productType: batch.productType || "",
                  printOrderStatus: null,
                }))
              : []
          )
        : [];

      setAssemblyCandidates(flattened.filter((item) => item.status === "printed"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar candidatos de ensamblaje");
    } finally {
      setLoadingAssemblyCandidates(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    loadProductionOrders();
    loadAssemblyCandidates();
  }, [loadAssemblyCandidates, loadQueue, loadProductionOrders]);

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

  const productionMetrics = useMemo(() => {
    return productionOrders.reduce(
      (acc, order) => {
        acc.total += 1;
        acc.produced += order.producedQuantity;
        if (order.status === "draft") acc.draft += 1;
        if (order.status === "planned") acc.planned += 1;
        if (order.status === "started") acc.started += 1;
        if (order.status === "completed") acc.completed += 1;
        return acc;
      },
      { total: 0, draft: 0, planned: 0, started: 0, completed: 0, produced: 0 }
    );
  }, [productionOrders]);

  const assemblyOrderOptions = useMemo(
    () => productionOrders.filter((order) => ["draft", "planned", "started"].includes(order.status)),
    [productionOrders]
  );

  const filteredAssemblyCandidates = useMemo(() => {
    if (!assemblyProductionOrderId) return assemblyCandidates;
    const selectedOrder = productionOrders.find((order) => order.id === assemblyProductionOrderId);
    if (!selectedOrder) return assemblyCandidates;
    return assemblyCandidates.filter((candidate) =>
      candidate.productType === selectedOrder.outputType || !candidate.productType
    );
  }, [assemblyCandidates, assemblyProductionOrderId, productionOrders]);

  const updateForm = (field: keyof ProductionOrderFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateModal = () => {
    if (savingOrder) return;
    setShowCreateModal(false);
    setForm(EMPTY_PRODUCTION_ORDER_FORM);
  };

  const openProducedModal = (order: ProductionOrder) => {
    setProducedOrder(order);
    setProducedForm(EMPTY_PRODUCED_FORM);
  };

  const closeProducedModal = () => {
    if (savingEventKey) return;
    setProducedOrder(null);
    setProducedForm(EMPTY_PRODUCED_FORM);
  };

  const updateProducedForm = (field: keyof ProducedFormState, value: string) => {
    setProducedForm((current) => ({ ...current, [field]: value }));
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

  const postProductionEvent = async ({
    order,
    eventType,
    quantity,
    reason,
  }: {
    order: ProductionOrder;
    eventType: ProductionEventType;
    quantity?: number;
    reason?: string | null;
  }) => {
    const eventKey = `${order.id}:${eventType}`;
    setSavingEventKey(eventKey);

    try {
      const res = await fetch(`/api/admin/operations/production-orders/${order.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          quantity,
          reason: reason || null,
          metadataJson: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el evento de produccion");
      }

      toast.success(EVENT_SUCCESS_COPY[eventType]);
      await loadProductionOrders({ silent: true });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar evento de produccion";
      toast.error(message);
      return false;
    } finally {
      setSavingEventKey(null);
    }
  };

  const handleProductionAction = async (order: ProductionOrder, eventType: ProductionEventType) => {
    if (eventType === "PRODUCED") {
      openProducedModal(order);
      return;
    }

    await postProductionEvent({
      order,
      eventType,
      reason: EVENT_SUCCESS_COPY[eventType],
    });
  };

  const handleProducedSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!producedOrder) return;

    const quantity = Number(producedForm.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("La cantidad producida debe ser positiva");
      return;
    }

    const saved = await postProductionEvent({
      order: producedOrder,
      eventType: "PRODUCED",
      quantity,
      reason: producedForm.reason.trim() || null,
    });

    if (saved) {
      setProducedOrder(null);
      setProducedForm(EMPTY_PRODUCED_FORM);
    }
  };

  const toggleAssemblyItem = (itemId: string) => {
    setSelectedAssemblyItemIds((current) =>
      current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId]
    );
  };

  const handleAssembleUnits = async () => {
    if (!assemblyProductionOrderId) {
      toast.error("Selecciona una orden de produccion");
      return;
    }

    if (selectedAssemblyItemIds.length === 0) {
      toast.error("Selecciona al menos un item printed");
      return;
    }

    setAssemblingUnits(true);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${assemblyProductionOrderId}/assemble-units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          digitalBatchItemIds: selectedAssemblyItemIds,
          notes: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo ensamblar las unidades");
      }

      toast.success("Unidades ensambladas");
      setSelectedAssemblyItemIds([]);
      await Promise.all([loadProductionOrders({ silent: true }), loadAssemblyCandidates()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al ensamblar unidades");
    } finally {
      setAssemblingUnits(false);
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
          <Factory className="h-8 w-8 text-primary" /> Producción y ensamblaje
        </h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Convierte QR/link impresos en unidades físicas trazables. Toda unidad ensamblada queda pendiente de QA antes de entrar al inventario disponible.
        </p>
      </div>

      <ProductionWorkflowSection />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Ordenes", value: productionMetrics.total, icon: Factory, tone: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Borrador", value: productionMetrics.draft, icon: ClipboardList, tone: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Planificadas", value: productionMetrics.planned, icon: CheckCircle2, tone: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "En produccion", value: productionMetrics.started, icon: Wrench, tone: "bg-purple-50 text-purple-700 border-purple-200" },
          { label: "Completadas", value: productionMetrics.completed, icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "Producido", value: formatQuantity(productionMetrics.produced), icon: Package, tone: "bg-cyan-50 text-cyan-700 border-cyan-200" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
              </div>
              <div className={`rounded-xl border p-2 ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </div>

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
              Aún no hay órdenes de producción
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Crea una orden cuando necesites ensamblar unidades desde QR/link impresos.
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
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productionOrders.map((order) => {
                  const status = ORDER_STATUS_CONFIG[order.status] || {
                    label: order.status,
                    color: "bg-slate-50 border-slate-200 text-slate-700",
                  };
                  const actions = ACTIONS_BY_STATUS[order.status] || [];

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
                      <td className="px-4 py-4">
                        {actions.length === 0 ? (
                          <p className="text-right text-[10px] font-black uppercase tracking-widest text-slate-300">
                            Sin acciones
                          </p>
                        ) : (
                          <div className="flex min-w-[180px] flex-wrap justify-end gap-2">
                            {actions.map((action) => {
                              const eventKey = `${order.id}:${action.eventType}`;
                              const saving = savingEventKey === eventKey;

                              return (
                                <button
                                  key={action.eventType}
                                  type="button"
                                  onClick={() => handleProductionAction(order, action.eventType)}
                                  disabled={Boolean(savingEventKey)}
                                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-50 ${action.tone}`}
                                >
                                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Ensamblaje de unidades</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Convierte items printed y recibidos en unidades terminadas en estado QA pendiente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={assemblyProductionOrderId}
              onChange={(event) => {
                setAssemblyProductionOrderId(event.target.value);
                setSelectedAssemblyItemIds([]);
              }}
              className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
            >
              <option value="">Selecciona orden de produccion</option>
              {assemblyOrderOptions.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.code} · {order.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAssembleUnits}
              disabled={assemblingUnits || !assemblyProductionOrderId || selectedAssemblyItemIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {assemblingUnits ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              Ensamblar
            </button>
          </div>
        </div>

        {loadingAssemblyCandidates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : filteredAssemblyCandidates.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              No hay QR/link impresos disponibles para ensamblaje
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Primero recibe una orden a imprenta.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredAssemblyCandidates.map((item) => {
              const selected = selectedAssemblyItemIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAssemblyItem(item.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  <p className="font-mono text-xs font-black text-primary">{item.internalLabel}</p>
                  <p className="mt-2 text-sm font-black text-slate-950">{item.batchCode}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    {item.productType || "tipo no definido"} · {item.status}
                  </p>
                </button>
              );
            })}
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
                    placeholder="PROD-PT-001"
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

      {producedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleProducedSubmit} className="space-y-6 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Evento inmutable</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Registrar producido</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {producedOrder.code} · {producedOrder.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeProducedModal}
                  disabled={Boolean(savingEventKey)}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                Este evento incrementa el producido acumulado de la orden. Los eventos no se editan ni se borran.
              </div>

              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad producida</span>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={producedForm.quantity}
                    onChange={(event) => updateProducedForm("quantity", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="25"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Razon</span>
                  <input
                    value={producedForm.reason}
                    onChange={(event) => updateProducedForm("reason", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Produccion parcial, cierre de tanda o ajuste operativo"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeProducedModal}
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
                  {savingEventKey === `${producedOrder.id}:PRODUCED` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  Guardar producido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

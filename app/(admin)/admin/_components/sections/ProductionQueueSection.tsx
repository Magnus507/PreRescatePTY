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
  ClipboardCheck,
  Printer,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import FabricationSection from "./FabricationSection";
import { buildProductionDigitalIdentity } from "@/lib/operations/digital-identity";

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
  digitalItems?: Array<{
    id: string;
    batchId: string;
    internalLabel: string;
    shortCode: string | null;
    activationUrl: string | null;
    qrUrl: string | null;
    nfcUrl: string | null;
    nfcProgrammed: boolean;
    qrPrepared: boolean;
    status: string;
    preparedAt: string | null;
    notes: string | null;
    finishedGoodUnits?: Array<{
      id: string;
      qaStatus: string | null;
      status: string;
      reservedOrderId: string | null;
    }>;
  }>;
  printOrders?: Array<{
    id: string;
    code: string;
    supplierName: string;
    status: string;
    sentAt: string | null;
    receivedAt: string | null;
    quantity: number;
    rangeStartLabel: string;
    rangeEndLabel: string;
    items: Array<{ id: string; internalLabel: string; status: string }>;
  }>;
}

type ProductionFlowStage = "identity" | "print" | "assembly" | "qc" | "result";

const FLOW_STAGES: Array<{ id: ProductionFlowStage; title: string; description: string }> = [
  { id: "identity", title: "Identidad digital / QR / NFC", description: "Genera y valida shortCode, QR y NFC canónicos." },
  { id: "print", title: "Imprenta", description: "Envía la identidad digital a imprenta y confirma recepción." },
  { id: "assembly", title: "Ensamblaje físico", description: "Completa chip, sticker y empaque por unidad." },
  { id: "qc", title: "QC de la orden", description: "Aprobación o rechazo por unidad dentro de Producción." },
  { id: "result", title: "Salida a inventario", description: "Muestra el resultado final de cada unidad." },
];

function getOriginTypeLabel(order: ProductionOrder) {
  const note = (order.notes || "").toLowerCase();
  if (note.includes("[commercialorderid:") && note.includes("pedido interno")) return "Interno";
  if (note.includes("[commercialorderid:")) return "Cliente";
  return "Operativo";
}

function getOriginLabel(order: ProductionOrder) {
  const note = order.notes || "";
  const markerLine = note.split("\n").find((line) => line.includes("[commercialOrderId:"));
  if (markerLine?.includes("Pedido interno")) return "Pedido interno";
  if (markerLine) return "Pedido origen";
  return "Orden de producción";
}

function getProductionStageLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Pendiente de producción",
    planned: "Planificada",
    started: "En proceso",
    paused: "Pausada",
    completed: "Completada",
    cancelled: "Cancelada",
    sent_to_print: "En imprenta",
    print_received: "Imprenta recibida",
    qa_pending: "En QC",
    qa_passed: "QC aprobado",
  };
  return map[status] || status;
}

function isInternalProduction(order: ProductionOrder) {
  return Boolean(order.notes?.includes("[commercialOrderId:")) && order.title.toLowerCase().includes("interna");
}

function getPublicActivationPath(value: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function getPrintStatusLabel(status: string | null) {
  if (!status) return "Sin orden";
  const map: Record<string, string> = {
    draft: "Borrador",
    sent: "Enviada",
    received: "Recibida",
    printed: "Impresa",
    cancelled: "Cancelada",
  };
  return map[status] || status;
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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  initial_chip: <Smartphone className="h-3 w-3" />,
  bracelet: <Layers className="h-3 w-3" />,
  credential: <FileText className="h-3 w-3" />,
  sticker_nfc_qr: <Sticker className="h-3 w-3" />,
};

export default function ProductionQueueSection() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [printOrders, setPrintOrders] = useState<Array<{ id: string; digitalBatchId: string; code: string; supplierName: string; status: string; sentAt: string | null; receivedAt: string | null; quantity: number; rangeStartLabel: string; rangeEndLabel: string; items: Array<{ id: string; internalLabel: string; status: string }> }>>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, inProduction: 0, packing: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<ProductionFlowStage, boolean>>({
    identity: true,
    print: false,
    assembly: false,
    qc: false,
    result: false,
  });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState<ProductionOrderFormState>(EMPTY_PRODUCTION_ORDER_FORM);
  const [assemblyCandidates, setAssemblyCandidates] = useState<AssemblyCandidate[]>([]);
  const [loadingAssemblyCandidates, setLoadingAssemblyCandidates] = useState(true);
  const [assemblyProductionOrderId, setAssemblyProductionOrderId] = useState("");
  const [selectedAssemblyItemIds, setSelectedAssemblyItemIds] = useState<string[]>([]);
  const [assemblingUnits, setAssemblingUnits] = useState(false);
  const [preparingDigitalOrderId, setPreparingDigitalOrderId] = useState<string | null>(null);
  const [savingDigitalKey, setSavingDigitalKey] = useState<string | null>(null);

  const selectedProductionOrder = useMemo(
    () => productionOrders.find((order) => order.id === openOrderId) || null,
    [openOrderId, productionOrders]
  );

  const digitalProgress = useMemo(() => {
    const items = selectedProductionOrder?.digitalItems || [];
    const ready = items.filter((item) => item.nfcProgrammed && item.qrPrepared).length;
    return { total: items.length, ready };
  }, [selectedProductionOrder]);
  const digitalPreparationLabel = digitalProgress.total > 0 ? "Actualizar preparación digital" : "Generar QR/link de producción";
  const digitalPreparationEmpty = digitalProgress.total === 0;

  const printOrder = useMemo(() => {
    const batchId = selectedProductionOrder?.digitalItems?.[0]?.batchId;
    if (!batchId) return null;
    return printOrders.find((order) => order.digitalBatchId === batchId) || null;
  }, [printOrders, selectedProductionOrder]);

  const copyTextToClipboard = useCallback(async (text: string, successMessage: string) => {
    if (!text) {
      toast.error("No hay contenido para copiar");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = text;
      document.body.appendChild(fallback);
      fallback.select();
      try {
        document.execCommand("copy");
        toast.success(successMessage);
      } catch {
        toast.error("No se pudo copiar el contenido");
      } finally {
        document.body.removeChild(fallback);
      }
    }
  }, []);

  const handleCopyQrPayload = useCallback((payload: string) => {
    void copyTextToClipboard(payload, "Payload QR copiado");
  }, [copyTextToClipboard]);

  const handleCopyNfcUrl = useCallback((url: string) => {
    void copyTextToClipboard(url, "URL NFC copiada");
  }, [copyTextToClipboard]);

  const handleDownloadQr = useCallback(async (item: NonNullable<ProductionOrder["digitalItems"]>[number]) => {
    if (!item.qrUrl) {
      toast.error("Falta QR visual para descargar");
      return;
    }

    try {
      const response = await fetch(item.qrUrl);
      if (!response.ok) throw new Error("No se pudo descargar el QR");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `QR-${item.internalLabel}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("QR descargado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al descargar QR");
    }
  }, []);

  const digitalItems = selectedProductionOrder?.digitalItems || [];
  const hasDigitalItems = digitalItems.length > 0;
  const allDigitalReady = hasDigitalItems && digitalItems.every((item) => item.nfcProgrammed && item.qrPrepared);
  const hasPrintOrder = Boolean(printOrder);
  const printSent = Boolean(printOrder && ["sent", "printed", "received"].includes(printOrder.status));
  const printReceived = Boolean(printOrder && ["received", "printed"].includes(printOrder.status));
  const allAssembled = hasDigitalItems && digitalItems.every((item) => item.status === "completed" || item.status === "qa_pending" || item.status === "qa_passed");
  const sentToQa = Boolean(selectedProductionOrder && ["qa_pending", "qa_passed"].includes(selectedProductionOrder.status));
  const hasQcResults = hasDigitalItems && digitalItems.some((item) => item.finishedGoodUnits?.some((unit) => ["passed", "failed"].includes(unit.qaStatus || "")));
  const allCanonicalIdentities = hasDigitalItems && digitalItems.every((item) => buildProductionDigitalIdentity({ internalLabel: item.internalLabel, shortCode: item.shortCode }).canPrint && buildProductionDigitalIdentity({ internalLabel: item.internalLabel, shortCode: item.shortCode }).shortCode);
  const currentStage: ProductionFlowStage = !allDigitalReady
    ? "identity"
    : !printReceived
      ? "print"
      : !allAssembled
        ? "assembly"
        : !hasQcResults
          ? "qc"
          : "result";

  useEffect(() => {
    setExpandedStages({
      identity: currentStage === "identity",
      print: currentStage === "print",
      assembly: currentStage === "assembly",
      qc: currentStage === "qc",
      result: currentStage === "result",
    });
  }, [currentStage]);

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

  const loadPrintOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/print-orders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar ordenes a imprenta");
      setPrintOrders(Array.isArray(data.printOrders) ? data.printOrders : []);
    } catch {
      toast.error("Error al cargar ordenes a imprenta");
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
    loadPrintOrders();
    loadAssemblyCandidates();
  }, [loadAssemblyCandidates, loadQueue, loadProductionOrders, loadPrintOrders]);

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

  const productionSummaryCards = useMemo(
    () => [
      { label: "Pendientes", value: productionOrders.filter((order) => order.status === "draft").length, icon: ClipboardList, tone: "bg-amber-50 text-amber-700 border-amber-200" },
      { label: "En preparación", value: productionOrders.filter((order) => order.status === "planned").length, icon: CheckCircle2, tone: "bg-blue-50 text-blue-700 border-blue-200" },
      { label: "En imprenta", value: productionOrders.filter((order) => order.status === "sent_to_print" || order.status === "print_received").length, icon: Printer, tone: "bg-violet-50 text-violet-700 border-violet-200" },
      { label: "En ensamblaje", value: productionOrders.filter((order) => order.status === "started" || order.status === "paused").length, icon: Wrench, tone: "bg-purple-50 text-purple-700 border-purple-200" },
      { label: "En QC", value: productionOrders.filter((order) => order.status === "qa_pending").length, icon: ClipboardCheck, tone: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      { label: "Completadas", value: productionOrders.filter((order) => order.status === "completed").length, icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    ],
    [productionOrders]
  );

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

  const handlePrepareDigitalItems = async (order: ProductionOrder) => {
    setPreparingDigitalOrderId(order.id);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${order.id}/prepare-digital-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: order.plannedQuantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo preparar recursos digitales");
      toast.success("Recursos digitales preparados");
      await loadProductionOrders({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al preparar recursos digitales");
    } finally {
      setPreparingDigitalOrderId(null);
    }
  };

  const handleMarkDigitalItem = async (
    orderId: string,
    itemId: string,
    action: "nfc-programmed" | "qr-prepared"
  ) => {
    setSavingDigitalKey(`${itemId}:${action}`);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${orderId}/unit-preparation/${itemId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar la preparacion");
      await Promise.all([loadProductionOrders({ silent: true }), loadPrintOrders()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar la preparacion");
    } finally {
      setSavingDigitalKey(null);
    }
  };

  const handleMarkAssemblyStep = async (
    orderId: string,
    itemId: string,
    action: "assembled" | "packaging-completed" | "complete"
  ) => {
    setSavingDigitalKey(`${itemId}:${action}`);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${orderId}/unit-assembly/${itemId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar el ensamblaje");
      await Promise.all([loadProductionOrders({ silent: true }), loadPrintOrders()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el ensamblaje");
    } finally {
      setSavingDigitalKey(null);
    }
  };

  const handleSendToPrint = async (order: ProductionOrder) => {
    setSavingDigitalKey(`${order.id}:send-to-print`);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${order.id}/send-to-print`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar a imprenta");
      toast.success("Orden enviada a imprenta");
      await Promise.all([loadProductionOrders({ silent: true }), loadPrintOrders()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar a imprenta");
    } finally {
      setSavingDigitalKey(null);
    }
  };

  const handleMarkPrintReceived = async (order: ProductionOrder) => {
    setSavingDigitalKey(`${order.id}:mark-print-received`);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${order.id}/mark-print-received`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar la recepción");
      toast.success("Imprenta recibida");
      await Promise.all([loadProductionOrders({ silent: true }), loadPrintOrders()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al marcar recepción");
    } finally {
      setSavingDigitalKey(null);
    }
  };

  const handleSendToQa = async (order: ProductionOrder) => {
    setSavingDigitalKey(`${order.id}:send-to-qa`);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${order.id}/send-to-qa`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar a QC");
      toast.success("Enviado a QC");
      await Promise.all([loadProductionOrders({ silent: true }), loadPrintOrders()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar a QC");
    } finally {
      setSavingDigitalKey(null);
    }
  };

  const handleQaPass = async (order: ProductionOrder, unitId: string) => {
    setSavingDigitalKey(`${unitId}:qa-pass`);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${order.id}/qa/${unitId}/pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist: {
            nfcWorks: true,
            qrWorks: true,
            internalLabelCorrect: true,
            stickerCorrect: true,
            packagingCorrect: true,
            sealedReady: true,
          },
          notes: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo aprobar QC");
      toast.success("QC aprobado");
      await Promise.all([loadProductionOrders({ silent: true }), loadPrintOrders()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al aprobar QC");
    } finally {
      setSavingDigitalKey(null);
    }
  };

  const handleQaFail = async (order: ProductionOrder, unitId: string) => {
    const reason = window.prompt("Motivo del QC fallido");
    if (!reason) return;
    setSavingDigitalKey(`${unitId}:qa-fail`);
    try {
      const res = await fetch(`/api/admin/operations/production-orders/${order.id}/qa/${unitId}/fail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, notes: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar QC fallido");
      toast.success("QC fallido registrado");
      await Promise.all([loadProductionOrders({ silent: true }), loadPrintOrders()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar QC fallido");
    } finally {
      setSavingDigitalKey(null);
    }
  };

  const filtered = statusFilter ? queue.filter((o) => o.productionStatus === statusFilter) : queue;

  const updateStageExpansion = (stage: ProductionFlowStage, value?: boolean) => {
    setExpandedStages((current) => ({
      ...current,
      [stage]: typeof value === "boolean" ? value : !current[stage],
    }));
  };

  const stageMeta: Record<ProductionFlowStage, { summary: string; badge: string; disabled?: boolean }> = {
    identity: {
      summary: digitalPreparationEmpty
        ? "Aún no hay recursos digitales generados."
        : allDigitalReady
          ? `${digitalProgress.ready}/${digitalProgress.total} listas para imprenta`
          : `${digitalProgress.ready}/${digitalProgress.total} parcialmente listas`,
      badge: allDigitalReady ? "Listo" : "En curso",
    },
    print: {
      summary: hasPrintOrder
        ? printReceived
          ? "Imprenta recibida"
          : "Orden enviada a imprenta"
        : "Pendiente de envío",
      badge: printReceived ? "Recibida" : printSent ? "Enviada" : "Pendiente",
    },
    assembly: {
      summary: `${digitalItems.filter((item) => item.status === "completed").length}/${digitalItems.length || 0} cerradas`,
      badge: allAssembled ? "Cerrada" : "Activa",
    },
    qc: {
      summary: hasQcResults ? "QC completado" : sentToQa ? "Pendiente de aprobar" : "Bloqueada",
      badge: hasQcResults ? "Resultados" : sentToQa ? "Abierta" : "Pendiente",
    },
    result: {
      summary: hasQcResults ? "Salida a inventario disponible" : "Aún sin resultados",
      badge: hasQcResults ? "Visible" : "Oculta",
    },
  };

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
        {selectedProductionOrder && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="space-y-3">
              {FLOW_STAGES.map((stage, index) => {
                if (index > FLOW_STAGES.findIndex((item) => item.id === currentStage)) return null;
                const isOpen = expandedStages[stage.id];
                const isCurrent = stage.id === currentStage;
                const isPast = index < FLOW_STAGES.findIndex((item) => item.id === currentStage);
                const stageClasses = isCurrent
                  ? "border-primary bg-primary/5 shadow-sm"
                  : isPast
                    ? "border-slate-200 bg-slate-50"
                    : "border-slate-200 bg-white";
                return (
                  <div key={stage.id} className={`rounded-3xl border p-4 ${stageClasses}`}>
                    <button
                      type="button"
                      onClick={() => updateStageExpansion(stage.id)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Etapa {index + 1}
                        </p>
                        <h4 className="mt-1 text-base font-black tracking-tight text-slate-950">
                          {stage.title}
                        </h4>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{stage.description}</p>
                        <p className="mt-2 text-xs font-black uppercase tracking-widest text-slate-500">
                          {stageMeta[stage.id].summary}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                        {expandedStages[stage.id] ? "Ocultar" : "Ver detalles"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-4">
                        {stage.id === "identity" && (
                          <>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Preparación digital / NFC / QR</p>
                                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                                  {selectedProductionOrder.code} · {selectedProductionOrder.title}
                                </h3>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                  Programa cada NFC con su link de activación y guarda el QR correspondiente. La activación final ocurre después de la entrega.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePrepareDigitalItems(selectedProductionOrder)}
                                disabled={Boolean(preparingDigitalOrderId)}
                                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-violet-800 disabled:opacity-50"
                              >
                                {preparingDigitalOrderId === selectedProductionOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                {digitalPreparationLabel}
                              </button>
                            </div>
                            <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-600">
                              <span>Progreso digital:</span>
                              <span className="font-black text-slate-950">{digitalProgress.ready}/{digitalProgress.total}</span>
                              <span className="text-slate-400">
                                {digitalPreparationEmpty
                                  ? "Aún no hay QR/link generados para esta orden."
                                  : "Programa cada NFC con su link y marca el QR como preparado."}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3">
                              {digitalItems.map((item) => {
                                const ready = item.nfcProgrammed && item.qrPrepared;
                                const partial = item.nfcProgrammed || item.qrPrepared;
                                const badge = ready ? "Lista para imprenta" : partial ? "Parcial" : "Pendiente";
                                const identity = buildProductionDigitalIdentity({ internalLabel: item.internalLabel, shortCode: item.shortCode });
                                const activationPath = getPublicActivationPath(identity.activationFallbackUrl);
                                const qrTarget = identity.canonicalPublicUrl || "";
                                const nfcTarget = item.nfcUrl || item.activationUrl || "";
                                const shortCodeIsReal = Boolean(identity.shortCode);
                                return (
                                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-950">{item.internalLabel}</p>
                                        <p className="text-xs font-semibold text-slate-500">
                                          shortCode: {shortCodeIsReal ? item.shortCode : "No generado"}
                                        </p>
                                        <p className="text-xs font-semibold text-slate-500">URL canónica: {identity.canonicalPublicUrl || "Sin shortCode real"}</p>
                                        <p className="text-xs font-semibold text-slate-500">Ruta auxiliar: {activationPath || "Sin ruta auxiliar"}</p>
                                        <p className="text-xs font-semibold text-slate-500">QR payload: {qrTarget || "Sin QR"}</p>
                                        <p className="text-xs font-semibold text-slate-500">NFC: {nfcTarget || "Sin NFC"}</p>
                                        <p className="text-xs font-semibold text-slate-500">
                                          NFC {item.nfcProgrammed ? "programado" : "pendiente"} · QR {item.qrPrepared ? "preparado" : "pendiente"}
                                        </p>
                                      </div>
                                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                        ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : partial ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700"
                                      }`}>
                                        {badge}
                                      </span>
                                    </div>
                                    <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                        {item.qrUrl && identity.qrImageUrl ? (
                                          <img
                                            src={identity.qrImageUrl}
                                            alt={`QR para ${item.internalLabel}`}
                                            className="h-auto w-full rounded-xl"
                                          />
                                        ) : (
                                          <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
                                            QR no disponible
                                          </div>
                                        )}
                                      </div>
                                      <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                          <button type="button" onClick={() => identity.nfcUrl && handleCopyNfcUrl(identity.nfcUrl)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">Copiar URL NFC</button>
                                          <button type="button" onClick={() => handleCopyQrPayload(qrTarget)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-800">Copiar enlace QR</button>
                                          <button type="button" onClick={() => handleDownloadQr(item)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-800">Descargar QR</button>
                                          <button type="button" onClick={() => handleMarkDigitalItem(selectedProductionOrder.id, item.id, "nfc-programmed")} disabled={Boolean(savingDigitalKey)} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-sky-800 disabled:opacity-50">NFC programado</button>
                                          <button type="button" onClick={() => handleMarkDigitalItem(selectedProductionOrder.id, item.id, "qr-prepared")} disabled={Boolean(savingDigitalKey)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 disabled:opacity-50">QR preparado</button>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">
                                          <p className="font-black uppercase tracking-widest text-slate-400">QR visual</p>
                                          <p className="mt-1 break-all text-slate-600">{identity.canonicalPublicUrl || "Falta shortCode real"}</p>
                                          <p className="mt-2 font-black text-slate-900">
                                            {identity.shortCode ? "El QR codifica la misma URL pública que se graba en el NFC." : "Falta shortCode real. Esta unidad aún no puede enviarse a imprenta."}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {stage.id === "print" && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Orden a imprenta</p>
                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                  {hasPrintOrder
                                    ? "La orden digital ya tiene un lote asociado para imprenta."
                                    : "Esta acción envía los QR/link preparados a imprenta. No crea inventario ni asigna usuario final."}
                                </p>
                              </div>
                              <button type="button" onClick={() => handleSendToPrint(selectedProductionOrder)} disabled={!allDigitalReady || !allCanonicalIdentities} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-800 disabled:opacity-50">
                                {savingDigitalKey === `${selectedProductionOrder.id}:send-to-print` ? "Enviando..." : hasPrintOrder ? "Orden a imprenta creada" : "Enviar a imprenta"}
                              </button>
                            </div>
                            {!allCanonicalIdentities && (
                              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                                Falta shortCode real. Esta unidad aún no puede enviarse a imprenta.
                              </div>
                            )}
                            {printOrder ? (
                              <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <p className="font-mono text-xs font-black text-primary">{printOrder.code}</p>
                                  <p className="mt-1 text-sm font-black text-slate-950">{printOrder.supplierName}</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Estado: {getPrintStatusLabel(printOrder.status)} · Cantidad: {printOrder.quantity} · {printOrder.rangeStartLabel} - {printOrder.rangeEndLabel}
                                  </p>
                                </div>
                                {printSent && !printReceived && (
                                  <button type="button" onClick={() => handleMarkPrintReceived(selectedProductionOrder)} disabled={printOrder.status === "received"} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 disabled:opacity-50">
                                    {savingDigitalKey === `${selectedProductionOrder.id}:mark-print-received` ? "Marcando..." : "Marcar imprenta recibida"}
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}

                        {stage.id === "assembly" && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Ensamblaje físico</p>
                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                  En esta etapa se completa chip + sticker, empaque y cierre final por unidad antes de enviar a QC.
                                </p>
                              </div>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                                {digitalItems.filter((item) => item.status === "completed").length}/{digitalItems.length} cerradas
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3">
                              {digitalItems.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-mono text-xs font-black text-primary">{item.internalLabel}</p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">{item.shortCode || "Sin shortCode"}</p>
                                    </div>
                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">{item.status}</span>
                                  </div>
                                  <div className="mt-2 grid gap-2 text-xs font-semibold text-slate-600">
                                    <p>NFC programado: {item.nfcProgrammed ? "sí" : "no"}</p>
                                    <p>QR preparado: {item.qrPrepared ? "sí" : "no"}</p>
                                    <p>Ensamblaje físico: {item.status === "assembled" || item.status === "packaged" || item.status === "completed" ? "sí" : "no"}</p>
                                    <p>Empaque cerrado: {item.status === "packaged" || item.status === "completed" ? "sí" : "no"}</p>
                                    <p>Unidad cerrada: {item.status === "completed" ? "sí" : "no"}</p>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => handleMarkDigitalItem(selectedProductionOrder.id, item.id, "nfc-programmed")} disabled={Boolean(savingDigitalKey)} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-sky-800 disabled:opacity-50">Marcar NFC</button>
                                    <button type="button" onClick={() => handleMarkDigitalItem(selectedProductionOrder.id, item.id, "qr-prepared")} disabled={Boolean(savingDigitalKey)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 disabled:opacity-50">Marcar QR</button>
                                    <button type="button" onClick={() => handleMarkAssemblyStep(selectedProductionOrder.id, item.id, "assembled")} disabled={Boolean(savingDigitalKey) || item.status !== "printed"} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-violet-800 disabled:opacity-50">Ensamblado</button>
                                    <button type="button" onClick={() => handleMarkAssemblyStep(selectedProductionOrder.id, item.id, "packaging-completed")} disabled={Boolean(savingDigitalKey) || item.status !== "assembled"} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-800 disabled:opacity-50">Empaque</button>
                                    <button type="button" onClick={() => handleMarkAssemblyStep(selectedProductionOrder.id, item.id, "complete")} disabled={Boolean(savingDigitalKey) || item.status !== "packaged"} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 disabled:opacity-50">Cerrar unidad</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {stage.id === "qc" && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">QC de la orden</p>
                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                  El inventario final se habilita solo con QC Pass. No se asigna usuario final desde Producción.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSendToQa(selectedProductionOrder)}
                                disabled={!allAssembled || sentToQa}
                                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-800 disabled:opacity-50"
                              >
                                {savingDigitalKey === `${selectedProductionOrder.id}:send-to-qa` ? "Enviando..." : "Enviar a QC"}
                              </button>
                            </div>
                            <div className="mt-3 grid gap-3">
                              {digitalItems.map((item) => {
                                const unit = item.finishedGoodUnits?.[0] || null;
                                const qaStatus = unit?.qaStatus || "pending";
                                const inventoryStatus = unit?.status || "qa_pending";
                                return (
                                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div>
                                        <p className="font-mono text-xs font-black text-primary">{item.internalLabel}</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-500">{item.shortCode || "Sin shortCode"}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                          QA: {qaStatus} · Inventario: {inventoryStatus} · {unit?.reservedOrderId ? `Pedido ${unit.reservedOrderId}` : "Sin reserva"}
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => unit && handleQaPass(selectedProductionOrder, unit.id)} disabled={!unit || qaStatus === "passed"} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800 disabled:opacity-50">
                                          {savingDigitalKey === `${unit?.id}:qa-pass` ? "Aprobando..." : "Pass QC"}
                                        </button>
                                        <button type="button" onClick={() => unit && handleQaFail(selectedProductionOrder, unit.id)} disabled={!unit || qaStatus === "failed"} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-800 disabled:opacity-50">
                                          {savingDigitalKey === `${unit?.id}:qa-fail` ? "Marcando..." : "Fail QC"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {stage.id === "result" && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Resultado</p>
                            <div className="mt-3 grid gap-3">
                              {digitalItems.map((item) => {
                                const unit = item.finishedGoodUnits?.[0] || null;
                                if (!unit || !["passed", "failed"].includes(unit.qaStatus || "")) return null;
                                return (
                                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="font-mono text-xs font-black text-primary">{item.internalLabel}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-600">
                                      QA: {unit.qaStatus} · Inventario: {unit.status}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {unit.qaStatus === "passed"
                                        ? "Disponible en inventario según el flujo operativo. No hay usuario final asignado desde Producción."
                                        : "Unidad rechazada en QC. No se habilita inventario final."}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <FabricationSection orderId={openOrderId} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Producción</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Producción</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Gestiona las órdenes de producción creadas desde pedidos internos o pedidos sin stock.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadProductionOrders({ silent: true })}
              disabled={refreshingOrders}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white disabled:opacity-50"
            >
              {refreshingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>
      </section>

      {productionOrders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {productionSummaryCards.map(({ label, value, icon: Icon, tone }) => (
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
      )}

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
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">No hay órdenes de producción.</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Las órdenes nacen desde Pedidos cuando falta stock o cuando se crea un pedido interno.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Origen</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo origen</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Producto</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Etapa</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Progreso</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productionOrders.map((order) => {
                  const originType = getOriginTypeLabel(order);
                  const originLabel = getOriginLabel(order);
                  const stageLabel = getProductionStageLabel(order.status);
                  const progress = order.plannedQuantity > 0 ? Math.min(100, Math.round((order.producedQuantity / order.plannedQuantity) * 100)) : 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-black text-primary">{order.code}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-black text-slate-900">{originLabel}</p>
                          {isInternalProduction(order) && (
                            <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-violet-700">Pedido interno para fabricar inventario</p>
                          )}
                          <p className="mt-1 max-w-xs truncate text-[11px] font-semibold text-slate-500">
                            {order.notes?.split("\n").find((line) => line.startsWith("Motivo interno:"))?.replace("Motivo interno: ", "") || order.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">{originType}</span>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-600">{order.outputType}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-slate-900">
                        {formatQuantity(order.plannedQuantity)}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{stageLabel}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span>{formatQuantity(order.producedQuantity)} / {formatQuantity(order.plannedQuantity)}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatDate(order.updatedAt)}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenOrderId(order.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10"
                        >
                          Abrir flujo
                        </button>
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

    </div>
  );
}

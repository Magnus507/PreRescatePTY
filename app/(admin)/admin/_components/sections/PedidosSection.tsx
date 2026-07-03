"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Loader2, View, CheckCircle2, Truck, RefreshCw, ExternalLink, Building2, XCircle, Copy, Download, ExternalLink as ExternalLinkIcon, UserRound, AlertCircle, X } from "lucide-react";
const QRCodeCanvas = dynamic(() => import("qrcode.react").then((mod) => ({ default: mod.QRCodeCanvas })), { ssr: false });
import { toast } from "sonner";
import Link from "next/link";
import { canAdminApproveManual, canAdminRejectManual } from "@/lib/order-status";
import { resolveImageSrc } from "@/lib/resolve-image-src";
import { ReceiptModal } from "../modals/ReceiptModal";
import { formatShippingAddress, getPaymentMethodLabel, getPaymentStatusLabel } from "../../_utils/order-helpers";
import FabricationSection from "./FabricationSection";

interface CorporateEmployeeItem {
  id: string;
  orderId: string;
  productId: string;
  chipId: string | null;
  fulfillmentStatus: string;
  activatedAt: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    productType: string;
    estimatedProductionTime: string | null;
    requiresPersonalization: boolean;
  };
  chip: {
    id: string;
    shortCode: string;
    serialPublic: string;
    status: string;
  } | null;
  organizationMember: {
    id: string;
    corporateStatus: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  existingCorporateChip?: {
    id: string;
    shortCode: string;
    serialPublic: string;
    status: string;
  } | null;
}

interface FinishedGoodOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  balance: number;
}

interface Order {
  id: string;
  provider: string;
  orderNumber: string;
  sourceOrderNumber?: string | null;
  operationalReference?: string | null;
  displayOrderCode?: string | null;
  operationsOrderCode?: string | null;
  paymentProofAvailable?: boolean;
  paymentSubmittedAt?: string | null;
  paymentReference?: string | null;
  paymentRejectionReason?: string | null;
  paymentStatusLabel?: string | null;
  paymentStatusHuman?: string | null;
  canApprovePayment?: boolean;
  canRejectPayment?: boolean;
  canArchiveOrder?: boolean;
  canAcceptOrder?: boolean;
  canRejectOrder?: boolean;
  canReserveInternalLabel?: boolean;
  canSendToProduction?: boolean;
  canCreateDispatch?: boolean;
  orderStatusLabel?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  amount: number;
  currency?: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  manualPaymentReference: string | null;
  adminReviewStatus: string | null;
  adminReviewNotes: string | null;
  paymentProofUrl: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingNotes: string | null;
  createdAt: string;
  orderType: string | null;
  corporateDeliveryStatus?: string | null;
  estimatedDeliveryDate?: string | null;
  deliveryNote?: string | null;
  items: {
    id: string;
    productType: string;
    quantity: number;
    totalPrice: number;
    profile?: {
      id: string;
      firstName: string;
      lastName: string;
      displayNamePublic?: string | null;
      profileType: string;
    } | null;
    chip?: {
      id: string;
      shortCode: string;
      serialPublic: string;
      status: string;
    } | null;
  }[];
  chipClaimTokens: {
    id: string;
    activationCode: string;
    chip: {
      serialPublic: string;
      shortCode: string;
      internalLabel: string | null;
    }
  }[];
  corporateEmployeeItems?: CorporateEmployeeItem[];
  organizationMemberId?: string;
  commercialItemName?: string | null;
  commercialQuantity?: number | null;
  commercialTotal?: number | null;
  operationalProductCode?: string | null;
  operationalProductName?: string | null;
  operationalQuantity?: number | null;
  operationsReferenceCode?: string | null;
  channel?: string | null;
  deliveryReference?: string | null;
  productionOrder?: {
    id: string;
    code: string;
    status: string;
  } | null;
  dispatch?: {
    id: string;
    code: string;
    status: string;
  } | null;
  reservedUnits?: Array<{
    id: string;
    internalLabel?: string | null;
    shortCode?: string | null;
    qaStatus?: string | null;
    inventoryStatus?: string | null;
    activationStatus?: string | null;
  }>;
  blockedReasons?: string[];
}

export function PedidosSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [reviewNote, setReviewNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const loadOrdersRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const initializedOrderIdRef = useRef<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [showInternalOrderModal, setShowInternalOrderModal] = useState(false);
  const [creatingInternalOrder, setCreatingInternalOrder] = useState(false);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodOption[]>([]);
  const [internalOrderForm, setInternalOrderForm] = useState({
    finishedGoodId: "",
    quantity: "1",
    reason: "Reposición de inventario",
  });

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    if (!isSilent) setLoading(true);
    if (isSilent) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/orders?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error(isSilent ? "No se pudo actualizar pedidos" : "Error al cargar pedidos");
    } finally {
      if (!isSilent) setLoading(false);
      if (isSilent) setRefreshing(false);
    }
  }, []);

  const loadFinishedGoods = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/finished-goods", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setFinishedGoods(Array.isArray(data.finishedGoods) ? data.finishedGoods : []);
      }
    } catch {
      toast.error("No se pudo cargar Inventario PT");
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadFinishedGoods();
  }, [loadFinishedGoods, loadOrders]);

  useEffect(() => {
    loadOrdersRef.current = loadOrders;
  }, [loadOrders]);

  // Initialize review note only when opening a different order
  useEffect(() => {
    if (selectedOrder && selectedOrder.id !== initializedOrderIdRef.current) {
      initializedOrderIdRef.current = selectedOrder.id;
      setReviewNote(selectedOrder.adminReviewNotes || "");
    }
  }, [selectedOrder, selectedOrder?.adminReviewNotes]);

  useEffect(() => {
    const handleWindowFocus = () => {
      loadOrdersRef.current();
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  useEffect(() => {
    if (viewMode === "detail") return;
    const interval = window.setInterval(() => {
      loadOrders({ silent: true });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [viewMode, loadOrders]);

  const handleStatusChange = async (id: string, newStatus: string, actionText: string) => {
    const isCompleted = newStatus === "completed";

    if (!confirm(`¿Estás seguro de marcar esta orden como '${actionText}'?`)) return;
    
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           id, 
           orderStatus: newStatus,
           paymentStatus: isCompleted ? "paid" : undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Orden actualizada a '${actionText}'`);
        setSelectedOrder(null);
        loadOrders();
      } else if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.message || "El pedido cambió de estado o no cumple los requisitos para esta acción.");
      } else if (res.status === 403) {
        toast.error("No tienes permiso para actualizar este pedido.");
      } else if (res.status === 404) {
        toast.error("El pedido ya no está disponible.");
      } else {
        toast.error("No se pudo actualizar el pedido. Inténtalo nuevamente.");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating(false);
    }
  };

  const handleBackToOrders = useCallback(() => {
    setViewMode("list");
    setSelectedOrder(null);
    setReviewNote("");
    setReviewAction(null);
    initializedOrderIdRef.current = null;
  }, []);

  const handleCorporateDelivery = async () => {
    if (!selectedOrder) return;
    if (!confirm("¿Marcar este lote corporativo como entregado a la empresa?")) return;

    setMarkingDelivered(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/corporate-delivery`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.success("Lote marcado como entregado a empresa.");
        setSelectedOrder((current) =>
          current
            ? {
                ...current,
                corporateDeliveryStatus: data?.order?.corporateDeliveryStatus ?? "delivered",
                deliveryNote: data?.order?.deliveryNote ?? current.deliveryNote,
                estimatedDeliveryDate: data?.order?.estimatedDeliveryDate ?? current.estimatedDeliveryDate,
              }
            : current
        );
        loadOrders();
      } else if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.message || "El pedido cambió de estado o no cumple los requisitos para esta acción.");
      } else if (res.status === 401 || res.status === 403) {
        toast.error("No tienes permiso para actualizar este pedido.");
      } else if (res.status === 404) {
        toast.error("El pedido ya no está disponible.");
      } else {
        toast.error("No se pudo marcar el lote como entregado.");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setMarkingDelivered(false);
    }
  };

  const handleApprove = async (targetOrder?: Order) => {
    const order = targetOrder ?? selectedOrder;
    if (!order || order.provider !== "manual") return;
    setReviewAction("approve");
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminReviewNotes: reviewNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Pago aprobado correctamente.");
        setSelectedOrder(null);
        loadOrders();
      } else if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.message || "El pago ya fue revisado o el pedido cambió de estado.");
      } else if (res.status === 403) {
        toast.error("No tienes permiso para revisar este pago.");
      } else if (res.status === 404) {
        toast.error("El pedido ya no está disponible.");
      } else {
        toast.error("No se pudo actualizar el pago. Inténtalo nuevamente.");
      }
    } catch {
      toast.error("No se pudo actualizar el pago. Inténtalo nuevamente.");
    } finally {
      setUpdating(false);
      setReviewAction(null);
    }
  };

  const handleReject = async (targetOrder?: Order) => {
    const order = targetOrder ?? selectedOrder;
    if (!order || order.provider !== "manual") return;
    const trimmedNote = reviewNote.trim();
    if (!trimmedNote) {
      toast.error("Indique el motivo del rechazo.");
      return;
    }
    setReviewAction("reject");
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminReviewNotes: trimmedNote,
        }),
      });

      if (res.ok) {
        toast.success("Pago rechazado correctamente.");
        setSelectedOrder(null);
        loadOrders();
      } else if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.message || "El pago ya fue revisado o el pedido cambió de estado.");
      } else if (res.status === 403) {
        toast.error("No tienes permiso para revisar este pago.");
      } else if (res.status === 404) {
        toast.error("El pedido ya no está disponible.");
      } else {
        toast.error("No se pudo actualizar el pago. Inténtalo nuevamente.");
      }
    } catch {
      toast.error("No se pudo actualizar el pago. Inténtalo nuevamente.");
    } finally {
      setUpdating(false);
      setReviewAction(null);
    }
  };

  const copyOrderNumber = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      toast.success("Código cliente copiado");
    } catch {
      toast.error("No se pudo copiar el código cliente");
    }
  };

  const getVisibleCustomerCode = (order: Order) => {
    if (order.displayOrderCode?.trim()) return order.displayOrderCode.trim();
    if (order.sourceOrderNumber?.trim()) return order.sourceOrderNumber.trim();
    if (order.orderNumber.startsWith("OP-CLI-")) return order.orderNumber.replace(/^OP-CLI-/, "");
    if (order.orderNumber.startsWith("OP-EMP-")) return order.orderNumber.replace(/^OP-EMP-/, "");
    return order.orderNumber;
  };

  const getOperationalReference = (order: Order) => {
    if (order.operationsOrderCode?.trim()) return order.operationsOrderCode.trim();
    if (order.operationalReference?.trim()) return order.operationalReference.trim();
    if (order.orderNumber.startsWith("OP-")) return order.orderNumber;
    return `OP-CLI-${order.orderNumber}`;
  };

  const getPaymentReviewLabel = (order: Order) => {
    if (order.paymentStatusLabel?.trim()) return order.paymentStatusLabel.trim();
    if (order.paymentStatus === "rejected") return "Pago rechazado";
    if (order.paymentStatus === "paid") return "Pago aprobado";
    if (order.paymentProofAvailable || order.paymentProofUrl || order.manualPaymentReference) return "Pago en revisión";
    if (order.paymentStatus === "under_review") return "Pago en revisión";
    return getPaymentStatusLabel(order.paymentStatus);
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "rejected") {
      return <span className="px-2 py-1 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold uppercase">Pago Rechazado</span>;
    }

    switch(status) {
      case "pending": return <span className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-xs font-bold uppercase">Pendiente</span>;
      case "processing": return <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded-lg text-xs font-bold uppercase">Revisión Pagos</span>;
      case "shipped": return <span className="px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-xs font-bold uppercase">Enviado</span>;
      case "completed": return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-bold uppercase">Completado</span>;
      case "cancelled": return <span className="px-2 py-1 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold uppercase">Cancelada</span>;
      default: return <span className="px-2 py-1 bg-slate-500/10 text-slate-600 rounded-lg text-xs font-bold uppercase">{status}</span>;
    }
  };

  const toggleExpandedOrder = useCallback((order: Order) => {
    setExpandedOrderIds((current) => {
      const next = new Set(current);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      return next;
    });
  }, []);

  const handleCreateInternalOrder = async () => {
    if (!internalOrderForm.finishedGoodId.trim()) {
      toast.error("Selecciona el producto a fabricar");
      return;
    }

    const quantity = Number(internalOrderForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    setCreatingInternalOrder(true);
    try {
      const selectedFinishedGood = finishedGoods.find((item) => item.id === internalOrderForm.finishedGoodId);
      const res = await fetch("/api/admin/operations/commercial-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType: "internal",
          internalReason: internalOrderForm.reason.trim() || "Reposición de inventario",
          items: [
            {
              finishedGoodId: internalOrderForm.finishedGoodId,
              productCode: selectedFinishedGood?.code || undefined,
              productName: selectedFinishedGood?.name || "Producto interno",
              quantity,
              unitPrice: 0,
              unit: selectedFinishedGood?.unit || "unit",
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el pedido interno");
      }
      toast.success(`Pedido interno ${data.commercialOrder?.code || "creado"} enviado a producción`);
      setShowInternalOrderModal(false);
      setInternalOrderForm({ finishedGoodId: "", quantity: "1", reason: "Reposición de inventario" });
      await loadOrders({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear el pedido interno");
    } finally {
      setCreatingInternalOrder(false);
    }
  };

  const filteredOrders = orders;

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat("es-PA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase text-xs tracking-widest animate-pulse">Cargando Pedidos...</p>
      </div>
    );
  }

  if (viewMode === "detail" && selectedOrder) {
    const isCorporateOrder = selectedOrder.orderType === "corporate_employee_purchase";
    const isCorporatePaymentApproved =
      selectedOrder.paymentStatus === "paid" &&
      selectedOrder.adminReviewStatus === "approved";
    const canMarkCorporateDelivered =
      isCorporatePaymentApproved &&
      selectedOrder.orderType === "corporate_employee_purchase" &&
      selectedOrder.corporateDeliveryStatus !== "delivered";
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-500 blur-none">
         {/* Integrated Admin Dashboard Header */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button
                 type="button"
                 onClick={handleBackToOrders}
                 className="h-10 w-10 flex items-center justify-center bg-white border border-border rounded-xl hover:bg-slate-50 transition-all group"
               >
                  <RefreshCw className="h-5 w-5 text-muted-foreground group-hover:rotate-180 transition-transform duration-500" />
               </button>
               <div>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2">
                       <h2 className="text-2xl font-black uppercase tracking-tighter" title={getVisibleCustomerCode(selectedOrder)}>Pedido #{getVisibleCustomerCode(selectedOrder)}</h2>
                       {isCorporateOrder && (
                         <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
                           <Building2 className="h-3.5 w-3.5" /> Corporativo
                         </span>
                       )}
                       <button
                         type="button"
                         onClick={() => copyOrderNumber(getVisibleCustomerCode(selectedOrder))}
                         className="text-[9px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-slate-900 hover:bg-slate-50"
                         title="Copiar código cliente"
                       >
                         Copiar
                       </button>
                     </div>
                     {getStatusBadge(selectedOrder.orderStatus, selectedOrder.paymentStatus)}
                  </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">
                    {isCorporateOrder ? "Pedido corporativo" : "Operación canónica de pedidos"}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">
                    Referencia operativa: {selectedOrder.operationsReferenceCode || getOperationalReference(selectedOrder)}
                  </p>
               </div>
            </div>

            <button
              type="button"
              onClick={handleBackToOrders}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
               Volver al Listado
            </button>
         </div>

         <div className="flex-1">
            <div className="space-y-6">
               {/* ==================== CORPORATE ORDER DETAIL ==================== */}
               {isCorporateOrder && (
                 <div className="space-y-6">
                   {/* Corporate summary card */}
                   <div className="rounded-[2rem] border border-blue-200 bg-blue-50/50 p-6 space-y-4">
                     <div className="flex items-center gap-3">
                       <Building2 className="h-5 w-5 text-blue-600" />
                       <h3 className="text-lg font-black">Pedido corporativo</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-white rounded-xl p-4 border border-blue-100">
                         <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Empresa</p>
                         <p className="font-bold">{selectedOrder.customerName || "Corporativo"}</p>
                         {selectedOrder.customerEmail && <p className="text-xs text-muted-foreground">{selectedOrder.customerEmail}</p>}
                       </div>
                        <div className="bg-white rounded-xl p-4 border border-blue-100">
                          <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Colaboradores</p>
                          <p className="font-bold text-2xl">{new Set((selectedOrder?.corporateEmployeeItems ?? []).map((item) => item.organizationMember?.id).filter(Boolean)).size}</p>
                        </div>
                       <div className="bg-white rounded-xl p-4 border border-blue-100">
                         <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Total</p>
                         <p className="font-bold text-2xl text-primary">${selectedOrder.amount.toFixed(2)}</p>
                       </div>
                     </div>
                     <div className="flex flex-wrap gap-2">
                       <span className="px-3 py-1 bg-white rounded-full text-[10px] font-bold border border-blue-200">
                         Estado: {getPaymentReviewLabel(selectedOrder)}
                       </span>
                       {selectedOrder.adminReviewStatus && (
                         <span className="px-3 py-1 bg-white rounded-full text-[10px] font-bold border border-blue-200">
                           Revisión: {selectedOrder.adminReviewStatus === "approved" ? "Aprobado" : selectedOrder.adminReviewStatus === "rejected" ? "Rechazado" : selectedOrder.adminReviewStatus}
                         </span>
                       )}
                       <span className="px-3 py-1 bg-white rounded-full text-[10px] font-bold border border-blue-200">
                         {new Date(selectedOrder.createdAt).toLocaleDateString()}
                       </span>
                     </div>
                   </div>

                   {/* Payment proof */}
                   {selectedOrder.paymentProofUrl && (
                         <div className="rounded-[2rem] border border-slate-200 p-5 bg-white">
                           <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary mb-3">Comprobante de pago</h3>
                       <div className="relative aspect-video max-w-md overflow-hidden rounded-xl border border-border bg-slate-100 cursor-zoom-in" onClick={() => window.open(selectedOrder.paymentProofUrl!, '_blank')}>
                         <Image
                           src={resolveImageSrc(selectedOrder.paymentProofUrl, "payment-proofs")}
                           alt="Pago"
                           fill
                           sizes="(max-width: 768px) 100vw, 448px"
                           className="object-contain p-2"
                         />
                       </div>
                     </div>
                   )}

                   {/* Corporate payment review */}
                   {selectedOrder.provider === "manual" && canAdminApproveManual(selectedOrder) && (
                     <div className="rounded-[2rem] border border-amber-200 bg-amber-50/50 p-6 space-y-4">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-700">Revisión de pago corporativo</h3>
                       <p className="text-sm text-amber-800">
                         Al aprobar este pago, los colaboradores pasarán a Pagados / activos. Los productos quedarán en seguimiento operativo según su estado de fabricación, entrega o asignación de chip.
                       </p>
                       <textarea
                         value={reviewNote}
                         onChange={(e) => setReviewNote(e.target.value)}
                         className="w-full min-h-[80px] rounded-xl border border-amber-200 bg-white p-3 text-sm font-medium outline-none focus:ring-4 focus:ring-amber-200"
                         placeholder="Nota para aprobación o rechazo..."
                       />
                       <div className="flex gap-3">
                         <button
                           disabled={updating || !canAdminApproveManual(selectedOrder)}
                           onClick={() => void handleApprove(selectedOrder)}
                           className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                         >
                           {reviewAction === "approve" ? "Aprobando..." : "Aprobar pago"}
                         </button>
                         <button
                           disabled={updating || !canAdminRejectManual(selectedOrder)}
                           onClick={() => void handleReject(selectedOrder)}
                           className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                         >
                           {reviewAction === "reject" ? "Rechazando..." : "Rechazar pago"}
                         </button>
                       </div>
                     </div>
                   )}

                   {/* Approved / Rejected status */}
                   {selectedOrder.adminReviewStatus === "approved" && (
                     <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/50 p-5">
                       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                         <div className="flex items-center gap-3">
                           <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                           <p className="font-black text-emerald-700">Pago aprobado</p>
                         </div>
                         {selectedOrder.corporateDeliveryStatus === "delivered" ? (
                           <span className="px-3 py-1.5 bg-white rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-200 inline-flex items-center gap-2 w-fit">
                             <Truck className="h-3.5 w-3.5" />
                             Entregado a empresa
                           </span>
                         ) : canMarkCorporateDelivered ? (
                           <button
                             type="button"
                             onClick={handleCorporateDelivery}
                             disabled={markingDelivered}
                             className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                           >
                             {markingDelivered ? (
                               <Loader2 className="h-4 w-4 animate-spin" />
                             ) : (
                               <Truck className="h-4 w-4" />
                             )}
                             Marcar entregado a empresa
                           </button>
                         ) : null}
                       </div>
                     </div>
                   )}
                   {selectedOrder.adminReviewStatus === "rejected" && (
                     <div className="rounded-[2rem] border border-red-200 bg-red-50/50 p-5">
                       <div className="flex items-center gap-3">
                         <XCircle className="h-6 w-6 text-red-600" />
                         <p className="font-black text-red-700">Pago rechazado: {selectedOrder.adminReviewNotes?.trim() || "No especificado"}</p>
                       </div>
                     </div>
                   )}

                    {/* Colaboradores — grouped by collaborator */}
                    {!isCorporatePaymentApproved && (selectedOrder?.corporateEmployeeItems?.length ?? 0) > 0 && (
                      <div className="rounded-[2rem] border border-amber-200 bg-amber-50/50 p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-6 bg-amber-500 rounded-full" />
                          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-700">
                            Colaboradores
                          </h3>
                        </div>
                        <p className="text-[10px] font-bold text-amber-700 flex items-center gap-2">
                          🔒 Operación bloqueada hasta aprobar el pago corporativo.
                        </p>
                        <p className="text-[10px] text-amber-600">Puedes revisar el comprobante y aprobar o rechazar el pago arriba.</p>
                      </div>
                    )}
                    {isCorporatePaymentApproved && (selectedOrder?.corporateEmployeeItems?.length ?? 0) > 0 && (() => {
                      const items = selectedOrder?.corporateEmployeeItems ?? [];
                      const groups = new Map<string, CorporateEmployeeItem[]>();
                      for (const item of items) {
                        const mid = item.organizationMember?.id || "unknown";
                        if (!groups.has(mid)) groups.set(mid, []);
                        groups.get(mid)!.push(item);
                      }
                      const total = groups.size;
                      const completed = Array.from(groups.values()).filter(g => g.every(i => i.fulfillmentStatus === "delivered" || i.fulfillmentStatus === "activated")).length;

                      return (
                      <div className="rounded-[2rem] border border-indigo-200 bg-indigo-50/50 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-6 bg-indigo-500 rounded-full" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-700">
                              Seguimiento corporativo
                            </h3>
                          </div>
                          <span className="px-3 py-1 bg-white rounded-full text-[9px] font-bold border border-indigo-200">
                            {completed}/{total} completados
                          </span>
                        </div>

                        {completed === total && total > 0 && (
                          <div className="rounded-xl bg-emerald-100 border border-emerald-200 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                Pedido operativo listo para entrega
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          {Array.from(groups.entries()).map(([memberId, groupItems]) => {
                            const first = groupItems[0];
                            const member = first?.organizationMember;
                            const profile = member?.profile;
                            const groupStatus = (() => {
                              const allDone = groupItems.every(i => i.fulfillmentStatus === "delivered" || i.fulfillmentStatus === "activated");
                              if (allDone) return { label: "Completado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
                              const anyProduction = groupItems.some(i => i.fulfillmentStatus === "in_production");
                              if (anyProduction) return { label: "En fabricación", color: "bg-purple-100 text-purple-700 border-purple-200" };
                              const allReady = groupItems.every(i => i.fulfillmentStatus === "ready_for_assignment" || i.fulfillmentStatus === "delivered" || i.fulfillmentStatus === "activated");
                              if (allReady) return { label: "Listo", color: "bg-teal-100 text-teal-700 border-teal-200" };
                              return { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200" };
                            })();
                            const mainChip = 
                              groupItems.find(i => i.chip)?.chip || 
                              groupItems.find(i => i.existingCorporateChip)?.existingCorporateChip || 
                              null;

                            return (
                              <div key={memberId} className={`bg-white rounded-xl border overflow-hidden ${
                                groupStatus.label === "Completado" ? "border-emerald-200 bg-emerald-50/30" : "border-indigo-100"
                              }`}>
                                {/* Header */}
                                <div className="flex items-center justify-between p-4">
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shrink-0">
                                      <UserRound className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-sm">
                                          {profile?.firstName || "—"} {profile?.lastName || ""}
                                        </p>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${groupStatus.color}`}>
                                          {groupStatus.label}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-muted-foreground">
                                        <span>{groupItems.length} producto{groupItems.length === 1 ? "" : "s"}</span>
                                        {mainChip && (
                                          <span className="font-mono text-indigo-600">Usando chip empresarial existente · /e/{mainChip.shortCode}</span>
                                        )}
                                        {!mainChip && (
                                          <span className="text-amber-600 font-bold uppercase tracking-widest">Sin chip empresarial</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Products */}
                                <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                                  {groupItems.map((item: CorporateEmployeeItem) => (
                                    <div key={item.id} className="flex flex-col md:flex-row md:items-start justify-between gap-3 pl-14">
                                      <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[11px] font-bold">{item.product?.name || item.product?.productType || "Producto"}</span>
                                          <span className="text-[9px] text-muted-foreground">x{item.quantity}</span>
                                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                            item.fulfillmentStatus === "activated" ? "bg-emerald-100 text-emerald-700" :
                                            item.fulfillmentStatus === "assigned_reserved" ? "bg-blue-100 text-blue-700" :
                                            item.fulfillmentStatus === "in_production" ? "bg-purple-100 text-purple-700" :
                                            item.fulfillmentStatus === "ready_for_assignment" ? "bg-teal-100 text-teal-700" :
                                            item.fulfillmentStatus === "delivered" ? "bg-slate-200 text-slate-700" :
                                            "bg-amber-100 text-amber-700"
                                          }`}>
                                            {item.fulfillmentStatus === "activated" ? "✔ Activado" :
                                             item.fulfillmentStatus === "assigned_reserved" ? "🔷 Asignado" :
                                             item.fulfillmentStatus === "in_production" ? "⚙ Fabricación" :
                                             item.fulfillmentStatus === "ready_for_assignment" ? "✅ Listo" :
                                             item.fulfillmentStatus === "delivered" ? "📦 Entregado" :
                                             "⏳ Pendiente"}
                                          </span>
                                        </div>
                                        {item.product?.productType && (
                                          <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded font-bold uppercase text-muted-foreground">{item.product.productType}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* QR principal del colaborador */}
                                {mainChip && (
                                  <div className="px-4 pb-4">
                                    <div className="ml-14 bg-slate-50 border border-slate-200 rounded-xl p-3 inline-flex items-center gap-4">
                                      <div className="bg-white p-1 rounded-lg border border-slate-100">
                                        {typeof window !== "undefined" && (
                                          <QRCodeCanvas value={`${window.location.origin}/e/${mainChip.shortCode}`} size={56} />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">QR / Link principal</p>
                                        <p className="text-[10px] font-mono truncate max-w-[120px] bg-white px-1 py-0.5 rounded border border-slate-100">/e/{mainChip.shortCode}</p>
                                        <div className="flex gap-1 mt-1.5">
                                          <button onClick={async () => {
                                            const url = `${window.location.origin}/e/${mainChip.shortCode}`;
                                            try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
                                            catch { toast.error("No se pudo copiar"); }
                                          }} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[7px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"><Copy className="h-2.5 w-2.5" /> Copiar</button>
                                          <a href={`/e/${mainChip.shortCode}`} target="_blank" className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[7px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1"><ExternalLinkIcon className="h-2.5 w-2.5" /> Abrir</a>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      );
                    })()}
                 </div>
               )}

                {/* ==================== FABRICACIÓN CORPORATIVA ==================== */}
                {isCorporateOrder && selectedOrder && <FabricationSection orderId={selectedOrder.id} />}

                {/* ==================== NORMAL ORDER DETAIL ==================== */}
                {!isCorporateOrder && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* COL 1: Buyer & Delivery */}
                  <div className="space-y-6">
                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Destinatario
                        </h3>
                        <div className="bg-muted/30 p-5 rounded-[1.75rem] border border-border/50">
                           <p className="text-2xl font-black tracking-tight mb-1 leading-none">{selectedOrder.customerName || "—"}</p>
                           <p className="text-sm font-medium text-muted-foreground">{selectedOrder.customerEmail}</p>
                           <div className="mt-4 flex flex-col gap-2">
                              {selectedOrder.customerPhone && (
                                 <Link href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`} target="_blank" className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10">
                                    Abrir WhatsApp
                                 </Link>
                              )}
                              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between text-[10px] font-black uppercase">
                                 <span className="text-muted-foreground tracking-widest">Documento:</span>
                                 <span>{selectedOrder.customerDocument || "—"}</span>
                              </div>
                           </div>
                        </div>
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Dirección de Envío
                        </h3>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.75rem] border border-border shadow-sm">
                           <div className="flex items-start gap-3">
                              <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 flex-shrink-0">
                                 <Truck className="h-6 w-6" />
                              </div>
                              <p className="text-base font-bold leading-tight tracking-tight">{formatShippingAddress(selectedOrder)}</p>
                           </div>
                        </div>
                     </section>
                  </div>

                  {/* COL 2: Payment, Receipt, Total, Review */}
                  <div className="lg:col-span-2 space-y-6">
                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Revisión de Pago
                        </h3>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.75rem] border border-border shadow-sm space-y-3">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Método</p>
                                 <p className="text-sm font-black text-slate-900 dark:text-white">{getPaymentMethodLabel(selectedOrder.paymentMethod)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado del pago</p>
                                 <p className="text-sm font-black uppercase mt-0.5">{getPaymentStatusLabel(selectedOrder.paymentStatus)}</p>
                              </div>
                           </div>
                           {selectedOrder.manualPaymentReference && (
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Referencia</p>
                               <p className="text-sm font-bold text-slate-900 dark:text-white break-all">{selectedOrder.manualPaymentReference}</p>
                             </div>
                           )}
                        </div>
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Comprobante
                        </h3>
                        {selectedOrder.paymentProofUrl ? (
                          <>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.75rem] border border-border shadow-sm">
                               <div className="relative aspect-video max-w-sm overflow-hidden rounded-xl border border-border bg-slate-100 cursor-zoom-in" onClick={() => setReceiptModalOrder(selectedOrder)}>
                                  <Image
                                    src={resolveImageSrc(selectedOrder.paymentProofUrl, "payment-proofs")}
                                    alt="Pago"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 384px"
                                    className="object-contain p-2"
                                  />
                               </div>
                              <button onClick={() => setReceiptModalOrder(selectedOrder)} className="mt-3 w-full px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">
                                  Ver comprobante
                              </button>
                            </div>
                            <p className="mt-3 text-[10px] font-bold text-amber-700">
                              Comprobante enviado por el cliente. Pago en revisión.
                            </p>
                          </>
                        ) : (
                           <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.75rem] border border-border shadow-sm text-center">
                              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No se adjuntó comprobante de pago.</p>
                           </div>
                        )}
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Total del Pedido
                        </h3>
                        <div className="bg-slate-900 dark:bg-black p-5 rounded-[1.75rem] text-white shadow-lg">
                           <p className="text-3xl font-black tracking-tighter text-primary">${selectedOrder.amount.toFixed(2)}</p>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">USD</p>
                        </div>
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Decisión del Pago
                        </h3>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.75rem] border border-border shadow-sm space-y-3">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Nota de revisión</p>
                              <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                className="w-full min-h-[80px] rounded-xl border border-border bg-slate-50 dark:bg-slate-950 p-3 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10"
                                placeholder="Agrega una observación para la aprobación o rechazo..."
                              />
                           </div>
                           {selectedOrder.adminReviewStatus === "rejected" && (
                             <div className="p-3 rounded-xl border border-red-200 bg-red-50">
                               <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
                                 Motivo de rechazo: {selectedOrder.adminReviewNotes?.trim() || "No especificado"}
                               </p>
                             </div>
                           )}
                           {selectedOrder.provider === "manual" && canAdminApproveManual(selectedOrder) && (
                              <>
                               <p className="text-[10px] text-amber-700 font-semibold">Recomendado: indique el motivo del rechazo.</p>
                               <div className="flex flex-col gap-2">
                                 <button
                                    disabled={updating || !canAdminApproveManual(selectedOrder)}
                                   onClick={() => void handleApprove(selectedOrder)}
                                    className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                                 >
                                   {reviewAction === "approve" ? "Aprobando..." : "Aprobar pago"}
                                 </button>
                                 <button
                                    disabled={updating || !canAdminRejectManual(selectedOrder)}
                                   onClick={() => void handleReject(selectedOrder)}
                                    className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                                 >
                                   {reviewAction === "reject" ? "Rechazando..." : "Rechazar pago"}
                                 </button>
                              </div>
                              </>
                           )}
                        </div>
                     </section>
                  </div>

                  {/* Receipt Modal */}
                  {receiptModalOrder && (
                    <ReceiptModal
                      receiptUrl={receiptModalOrder.paymentProofUrl}
                      orderNumber={receiptModalOrder.orderNumber}
                      onClose={() => setReceiptModalOrder(null)}
                    />
                  )}

                  {/* Personalización de accesorios */}
                  {selectedOrder.items.some(item => item.profile || 
                    ['sticker','llavero','tarjeta','credencial','brazalete'].includes(item.productType.toLowerCase())
                  ) && (
                    <div className="lg:col-span-3 space-y-6">
                      <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                          <div className="h-1.5 w-6 bg-primary rounded-full" />
                          Personalización
                        </h3>
                        <div className="space-y-3">
                          {selectedOrder.items.map(item => {
                            const needsProfile = !!item.profile ||
                              ['sticker','llavero','tarjeta','credencial','brazalete'].includes(item.productType.toLowerCase());
                            if (!needsProfile) return null;
                            const profile = item.profile;
                            const chip = item.chip;
                            return (
                              <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-[1.75rem] border border-border shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    {item.productType}
                                    <span className="ml-2 text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">x{item.quantity}</span>
                                  </p>
                                </div>

                                {profile ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                        <UserRound className="h-5 w-5 text-indigo-600" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-900">
                                          {profile.firstName} {profile.lastName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                            {profile.profileType === "personal" ? "Principal" : profile.profileType}
                                          </span>
                                          {profile.displayNamePublic && (
                                            <span className="text-[10px] text-indigo-600 font-mono">
                                              Alias: {profile.displayNamePublic}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                      {chip ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                          <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-0.5">QR a imprimir</p>
                                            <p className="font-mono text-sm font-bold text-slate-900">/e/{chip.shortCode}</p>
                                          </div>
                                          <span className={`px-2 py-1 rounded-full text-[9px] font-bold border ${
                                            chip.status === "activated" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                            chip.status === "sold" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                            "bg-slate-100 text-slate-600 border-slate-200"
                                          }`}>
                                            {chip.status}
                                          </span>
                                        </div>
                                        {typeof window !== "undefined" && (
                                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 inline-flex items-center gap-4 w-full">
                                            <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                                              <QRCodeCanvas value={`${window.location.origin}/e/${chip.shortCode}`} size={72} />
                                            </div>
                                            <div>
                                              <button onClick={() => {
                                                const canvas = document.querySelector(`#qr-personalization-${item.id}`) as HTMLCanvasElement | null;
                                                if (canvas) {
                                                  const url = canvas.toDataURL("image/png");
                                                  const a = document.createElement("a");
                                                  a.href = url; a.download = `qr-${chip.shortCode}.png`; a.click();
                                                }
                                              }} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-1.5">
                                                <Download className="h-3.5 w-3.5" /> Descargar QR
                                              </button>
                                              <div className="hidden">
                                                <QRCodeCanvas id={`qr-personalization-${item.id}`} value={`${window.location.origin}/e/${chip.shortCode}`} size={256} />
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <button onClick={async () => {
                                            const url = `${window.location.origin}/e/${chip.shortCode}`;
                                            try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
                                            catch { toast.error("No se pudo copiar"); }
                                          }} className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-700 transition-all inline-flex items-center justify-center gap-1.5">
                                            <Copy className="h-3 w-3" /> Copiar link
                                          </button>
                                          <a href={`/e/${chip.shortCode}`} target="_blank" className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all inline-flex items-center justify-center gap-1.5">
                                            <ExternalLink className="h-3 w-3" /> Abrir ficha
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                          <p className="text-[10px] font-bold text-amber-700">
                                            Perfil seleccionado sin chip asignado. Verifica antes de fabricar este accesorio.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                                    <div className="flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                      <p className="text-[10px] font-bold text-rose-700">
                                        Producto personalizado sin perfil seleccionado.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  )}

               </div>
               )}
            </div>

            {/* Action Bar */}
            {!isCorporateOrder && (() => {
              const isPaymentApproved = selectedOrder.paymentStatus === "paid" || selectedOrder.adminReviewStatus === "approved";
              const canShip = selectedOrder.orderStatus !== "cancelled" && selectedOrder.orderStatus !== "shipped" && selectedOrder.orderStatus !== "completed" && isPaymentApproved;
              const canComplete = selectedOrder.orderStatus === "shipped" && isPaymentApproved;
              const canCancel = selectedOrder.orderStatus !== "cancelled" && selectedOrder.orderStatus !== "shipped" && selectedOrder.orderStatus !== "completed" && !isPaymentApproved;

              return (
                <div className="px-6 py-5 border-t border-border bg-muted/30 flex justify-between items-center gap-4">
                  <div className="flex gap-4">
                    {canCancel && (
                      <button onClick={() => handleStatusChange(selectedOrder.id, "cancelled", "Archivado")} disabled={updating} className="px-6 py-3 border border-red-500/20 text-red-500 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                        Archivar pedido
                      </button>
                    )}
                    {!isPaymentApproved && selectedOrder.orderStatus !== "cancelled" && selectedOrder.orderStatus !== "shipped" && selectedOrder.orderStatus !== "completed" && (
                      <span className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                        ⚠ Requiere pago aprobado para enviar
                      </span>
                    )}
                   </div>

                  <div className="flex gap-4">
                    {canShip && (
                       <>
                          <button
                            onClick={() => handleStatusChange(selectedOrder.id, "shipped", "Enviado")}
                            disabled={updating}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
                          >
                             Marcar como Enviado
                          </button>

                          <button
                            onClick={() => handleStatusChange(selectedOrder.id, "completed", "Completado")}
                            disabled={updating}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
                          >
                             Finalizar Pedido
                          </button>
                       </>
                    )}
                     {canComplete && (
                        <button
                           onClick={() => handleStatusChange(selectedOrder.id, "completed", "Completado")}
                          disabled={updating} 
                          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all"
                        >
                          Confirmar Entrega Manual
                       </button>
                    )}
                  </div>
                </div>
              );
            })()}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Gestión de Pedidos</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Bandeja operativa para validar compras existentes y generar pedidos internos de reposición.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInternalOrderModal(true)}
            className="rounded-xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-950"
          >
            Crear pedido interno
          </button>
          <button onClick={() => loadOrders({ silent: true })} disabled={refreshing} className="p-3 border border-border rounded-xl hover:bg-accent transition-all">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showInternalOrderModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Pedido interno</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">Reposición de inventario</h3>
                <p className="mt-1 text-sm text-slate-500">La creación de pedidos se gestiona desde los flujos de origen; Pedidos solo opera pedidos existentes.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInternalOrderModal(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Producto</span>
                <select
                  value={internalOrderForm.finishedGoodId}
                  onChange={(event) => setInternalOrderForm((current) => ({ ...current, finishedGoodId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium"
                >
                  <option value="">Selecciona un producto</option>
                  {finishedGoods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.code} · stock {item.balance}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={internalOrderForm.quantity}
                    onChange={(event) => setInternalOrderForm((current) => ({ ...current, quantity: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo</span>
                  <input
                    type="text"
                    value={internalOrderForm.reason}
                    onChange={(event) => setInternalOrderForm((current) => ({ ...current, reason: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowInternalOrderModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCreateInternalOrder()}
                disabled={creatingInternalOrder}
                className="rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
              >
                {creatingInternalOrder ? "Creando..." : "Crear pedido interno"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const isCorporateOrder = order.orderType === "corporate_employee_purchase";
          const isExpanded = expandedOrderIds.has(order.id);
          const collapsedByDefault = ["paid", "rejected", "cancelled", "completed"].includes(order.orderStatus);
          const expanded = isExpanded || !collapsedByDefault;
          const hasReceipt = Boolean(order.paymentProofUrl || order.paymentProofAvailable);
          const commercialQty = order.commercialQuantity || order.items[0]?.quantity || 1;
          const operationalQty = order.operationalQuantity || commercialQty;

          const stop = (event: React.MouseEvent) => event.stopPropagation();

          return (
            <article
              key={order.id}
              onClick={() => toggleExpandedOrder(order)}
              className={`rounded-[2rem] border bg-white p-5 md:p-6 shadow-sm transition-all hover:shadow-lg ${expanded ? "border-slate-200" : "border-slate-100"}`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`rounded-2xl border px-4 py-3 ${isCorporateOrder ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Código principal</p>
                      <p className="mt-1 font-mono text-lg font-black break-all">#{getVisibleCustomerCode(order)}</p>
                    </div>
                    {isCorporateOrder && (
                      <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> Corporativo
                      </span>
                    )}
                    {hasReceipt && (
                      <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                        Comprobante enviado
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(order.orderStatus, order.paymentStatus)}
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {order.paymentStatusLabel || getPaymentReviewLabel(order)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {expanded ? "Expandida" : "Expandir"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Cliente</p>
                      <p className="mt-2 text-sm font-black text-slate-900">{order.customerName || "—"}</p>
                      <p className="text-xs text-slate-500 break-all">{order.customerEmail || "Sin email"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Monto</p>
                      <p className="mt-2 text-2xl font-black text-primary">${order.amount.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{order.currency || "USD"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Resumen</p>
                      <p className="mt-2 text-sm font-black text-slate-900">{order.commercialItemName || order.items[0]?.productType || "Combo no especificado"} x{commercialQty}</p>
                      <p className="text-xs text-slate-500">{operationalQty} unidades físicas</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Actualizado</p>
                      <p className="mt-2 text-sm font-black text-slate-900">{formatDateTime(order.createdAt)}</p>
                      <p className="text-xs text-slate-500">{order.dispatch ? `Despacho ${order.dispatch.code}` : "Sin despacho"}</p>
                    </div>
                  </div>

                  {expanded && (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Envío y pago</p>
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold text-slate-700">Canal: {order.channel || "checkout"}</p>
                          <p className="font-semibold text-slate-700">Teléfono: {order.customerPhone || "Sin teléfono"}</p>
                          <p className="font-semibold text-slate-700">Contacto: {order.customerName}</p>
                          <p className="font-semibold text-slate-700">Ciudad / área: {order.shippingCity || "Sin ciudad"}</p>
                          <p className="font-semibold text-slate-700">Dirección exacta: {order.shippingAddress || "Sin dirección"}</p>
                          <p className="font-semibold text-slate-700">Notas: {order.shippingNotes || "Sin notas"}</p>
                          <p className="font-semibold text-slate-700">Método de pago: {getPaymentMethodLabel(order.paymentMethod)}</p>
                          <p className="font-semibold text-slate-700">Pago: {getPaymentReviewLabel(order)}</p>
                        </div>
                        {order.paymentProofUrl ? (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                stop(e);
                                setReceiptModalOrder(order);
                              }}
                              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                            >
                              Ver comprobante
                            </button>
                            <p className="text-[10px] font-bold text-emerald-700">Comprobante enviado por el cliente. Pago en revisión.</p>
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-slate-500">No se adjuntó comprobante de pago.</p>
                        )}
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Item comercial y operativo</p>
                        <p className="text-sm font-black text-slate-900">{order.commercialItemName || order.items[0]?.productType || "Combo no especificado"} x{commercialQty}</p>
                        <p className="text-xs font-semibold text-slate-500">Comercial total: ${order.commercialTotal ? order.commercialTotal.toFixed(2) : order.amount.toFixed(2)}</p>
                        <p className="text-sm font-black text-slate-900">{order.operationalProductName || "Sticker PreRescatePTY"} x{operationalQty}</p>
                        <p className="text-xs font-semibold text-slate-700">{order.operationalProductCode || "PRP-FG-STICKER"}</p>

                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Unidades reservadas</p>
                          {order.reservedUnits && order.reservedUnits.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {order.reservedUnits.map((unit) => (
                                <div key={unit.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                  <p className="font-mono text-sm font-black text-slate-900">{unit.internalLabel || "Sin etiqueta"}</p>
                                  <p className="text-xs text-slate-500">/{unit.shortCode || "sin-shortCode"}</p>
                                  <p className="text-[10px] font-semibold text-slate-600">QC: {unit.qaStatus || "pendiente"} · Inventario: {unit.inventoryStatus || "pendiente"}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm font-semibold text-slate-500">Sin unidades reservadas</p>
                          )}
                        </div>

                        {order.productionOrder && (
                          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-500">Producción vinculada</p>
                            <p className="mt-1 text-sm font-black text-violet-900">{order.productionOrder.code} · {order.productionOrder.status}</p>
                          </div>
                        )}
                        {order.dispatch && (
                          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600">Despacho</p>
                            <p className="mt-1 text-sm font-black text-cyan-900">{order.dispatch.code} · {order.dispatch.status}</p>
                          </div>
                        )}
                        {order.blockedReasons && order.blockedReasons.length > 0 && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">Bloqueos</p>
                            <p className="mt-1 text-xs font-semibold text-amber-800">{order.blockedReasons.join(" · ")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-row gap-2 lg:flex-col lg:w-44 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      stop(e);
                      toggleExpandedOrder(order);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
                  >
                    <View className="h-4 w-4" />
                    {expanded ? "Contraer" : "Expandir"}
                  </button>
                  {order.canApprovePayment && (
                    <button
                      type="button"
                      onClick={(e) => {
                        stop(e);
                        setSelectedOrder(order);
                        void handleApprove(order);
                      }}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-100"
                    >
                      Aprobar pago
                    </button>
                  )}
                  {order.canRejectPayment && (
                    <button
                      type="button"
                      onClick={(e) => {
                        stop(e);
                        setSelectedOrder(order);
                        void handleReject(order);
                      }}
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700 transition-all hover:bg-red-100"
                    >
                      Rechazar pago
                    </button>
                  )}
                  {order.canArchiveOrder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        stop(e);
                        handleStatusChange(order.id, "cancelled", "Archivado");
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50"
                    >
                      Archivar
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center text-muted-foreground font-bold">
            No hay pedidos registrados
          </div>
        )}
      </div>
    </div>
  );
}

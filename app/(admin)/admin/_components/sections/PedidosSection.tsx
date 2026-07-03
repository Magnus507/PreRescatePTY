"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Loader2, View, CheckCircle2, Truck, RefreshCw, ExternalLink, Building2, XCircle, Copy, Download, ExternalLink as ExternalLinkIcon, UserRound, AlertCircle } from "lucide-react";
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
  orderStatusLabel?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  amount: number;
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
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'under_review' | 'paid' | 'rejected' | 'completed'>('all');
  const loadOrdersRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const initializedOrderIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  const handleApprove = async () => {
    if (!selectedOrder || selectedOrder.provider !== "manual") return;
    setReviewAction("approve");
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/approve`, {
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

  const handleReject = async () => {
    if (!selectedOrder || selectedOrder.provider !== "manual") return;
    const trimmedNote = reviewNote.trim();
    if (!trimmedNote) {
      toast.error("Indique el motivo del rechazo.");
      return;
    }
    setReviewAction("reject");
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/reject`, {
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
                           onClick={handleApprove}
                           className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                         >
                           {reviewAction === "approve" ? "Aprobando..." : "Aprobar pago"}
                         </button>
                         <button
                           disabled={updating || !canAdminRejectManual(selectedOrder)}
                           onClick={handleReject}
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
                                   onClick={handleApprove}
                                    className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                                 >
                                   {reviewAction === "approve" ? "Aprobando..." : "Aprobar pago"}
                                 </button>
                                 <button
                                    disabled={updating || !canAdminRejectManual(selectedOrder)}
                                   onClick={handleReject}
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
      <div className="flex items-end justify-between">
         <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Gestión de Pedidos</h1>
            <p className="text-muted-foreground text-sm font-medium">CRM manual para validación de compras y pagos.</p>
         </div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
            {([
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pending' },
              { id: 'under_review', label: 'Under Review' },
              { id: 'paid', label: 'Paid' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'completed', label: 'Completados' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                 {tab.label}
              </button>
            ))}
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => loadOrders({ silent: true })} disabled={refreshing} className="p-3 border border-border rounded-xl hover:bg-accent transition-all">
               <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
         </div>
      </div>
      </div>

      <div className="bg-card border border-border rounded-[1.25rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
             <thead className="bg-muted/50 border-b border-border">
                <tr>
                   <th className="p-3 text-[11px] font-black uppercase text-muted-foreground tracking-widest pl-5">ID / Fecha</th>
                   <th className="p-3 text-[11px] font-black uppercase text-muted-foreground tracking-widest">Cliente</th>
                   <th className="p-3 text-[11px] font-black uppercase text-muted-foreground tracking-widest">Contacto</th>
                   <th className="p-3 text-[11px] font-black uppercase text-muted-foreground tracking-widest">Monto (Items)</th>
                   <th className="p-3 text-[11px] font-black uppercase text-muted-foreground tracking-widest">Estado</th>
                   <th className="p-3 text-[11px] font-black uppercase text-muted-foreground tracking-widest pr-5">Acciones</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-border">
                {orders.filter(o => {
                  if (activeTab === 'pending') return o.paymentStatus === 'pending';
                  if (activeTab === 'under_review') return o.paymentStatus === 'under_review';
                  if (activeTab === 'paid') return o.paymentStatus === 'paid';
                  if (activeTab === 'rejected') return o.paymentStatus === 'rejected';
                  if (activeTab === 'completed') return o.orderStatus === 'completed';
                  return true;
                }).map(o => (
                   <tr key={o.id} className="hover:bg-accent/30 transition-all">
                      <td className={`p-3 pl-5 ${o.orderType === "corporate_employee_purchase" ? "border-l-4 border-l-blue-400" : ""}`}>
                         <div className="flex items-center gap-2 flex-wrap">
                           <p className="font-mono font-bold text-sm break-all" title={getVisibleCustomerCode(o)}>#{getVisibleCustomerCode(o)}</p>
                           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                             Ref. operativa: {getOperationalReference(o)}
                           </p>
                           {o.orderType === "corporate_employee_purchase" && (
                             <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
                               <Building2 className="h-3 w-3" /> Corporativo
                             </span>
                           )}
                           <button
                             type="button"
                             onClick={() => copyOrderNumber(getVisibleCustomerCode(o))}
                             className="text-[9px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-slate-900 hover:bg-slate-50"
                         title="Copiar código cliente"
                           >
                             Copiar
                           </button>
                         </div>
                         <p className="text-[10px] uppercase text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="p-3">
                         <p className="font-black text-sm">{o.customerName || "—"}</p>
                         {o.customerDocument && <p className="text-xs text-muted-foreground">{o.customerDocument}</p>}
                         {o.orderType === "corporate_employee_purchase" && (
                           <p className="text-[10px] font-bold text-blue-600 mt-1 inline-flex items-center gap-1">
                             <Building2 className="h-3 w-3" /> Empresa
                           </p>
                         )}
                      </td>
                      <td className="p-3 space-y-1">
                         {o.customerEmail && <p className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded max-w-fit truncate">{o.customerEmail}</p>}
                         {o.customerPhone && (
                            <Link href={`https://wa.me/${o.customerPhone.replace(/\D/g, '')}`} target="_blank" className="text-[10px] font-bold bg-green-500/10 text-green-700 px-2 py-0.5 rounded max-w-fit block hover:bg-green-500/20">
                               WA: {o.customerPhone}
                            </Link>
                         )}
                      </td>
                      <td className="p-3">
                         <p className="font-black text-base text-primary">${o.amount.toFixed(2)}</p>
                         {o.orderType === "corporate_employee_purchase" && o.corporateEmployeeItems ? (
                           <>
                             <p className="text-[10px] font-black uppercase text-muted-foreground">
                               {o.corporateEmployeeItems.length} empleado{o.corporateEmployeeItems.length === 1 ? "" : "s"}
                             </p>
                             <p className="text-[10px] font-black uppercase text-muted-foreground">
                               {o.corporateEmployeeItems.reduce((s, i) => s + (i.product?.name ? 1 : 0), 0)} producto{o.corporateEmployeeItems.reduce((s, i) => s + (i.product?.name ? 1 : 0), 0) === 1 ? "" : "s"}
                             </p>
                           </>
                         ) : (
                           <>
                              <p className="text-[10px] font-black uppercase text-muted-foreground">{o.commercialItemName || o.items[0]?.productType || "Combo no especificado"}</p>
                             <p className="text-[10px] font-black uppercase text-muted-foreground">{o.commercialQuantity ? `${o.commercialQuantity} combo${o.commercialQuantity === 1 ? "" : "s"} / ${o.operationalQuantity || o.commercialQuantity} unidad${(o.operationalQuantity || o.commercialQuantity) === 1 ? "" : "es"} físicas` : "0 unidades físicas"}</p>
                           </>
                         )}
                      </td>
                      <td className="p-3">
                         {getStatusBadge(o.orderStatus, o.paymentStatus)}
                         {(o.paymentProofUrl || o.paymentProofAvailable) && <p className="text-[9px] font-black text-emerald-600 uppercase mt-1">✓ Comprobante enviado</p>}
                      </td>
                      <td className="p-3 pr-5">
                         <button
                           onClick={() => {
                             setSelectedOrder(o);
                             setViewMode("detail");
                           }}
                           className="p-2 border border-border rounded-lg hover:bg-primary/5 hover:text-primary transition-all flex items-center justify-center"
                         >
                            <View className="h-4 w-4" />
                         </button>
                      </td>
                   </tr>
                ))}
                {orders.length === 0 && (
                   <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground font-bold">
                         No hay pedidos registrados
                      </td>
                   </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

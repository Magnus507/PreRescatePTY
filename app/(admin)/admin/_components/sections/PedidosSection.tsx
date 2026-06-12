"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, View, CheckCircle2, Truck, RefreshCw, Trash2, ExternalLink, Building2, XCircle, Copy, Download, ExternalLink as ExternalLinkIcon, UserRound, AlertCircle } from "lucide-react";
const QRCodeCanvas = dynamic(() => import("qrcode.react").then((mod) => ({ default: mod.QRCodeCanvas })), { ssr: false });
import { toast } from "sonner";
import Link from "next/link";
import { canAdminApproveManual, canAdminRejectManual } from "@/lib/order-status";
import { resolveImageSrc } from "@/lib/resolve-image-src";

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
}

export function PedidosSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'under_review' | 'paid' | 'rejected' | 'completed'>('all');
  const loadOrdersRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    if (!isSilent) setLoading(true);
    if (isSilent) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/orders?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders || []);
      if (selectedOrder) {
        const refreshedSelectedOrder = (data.orders || []).find((o: Order) => o.id === selectedOrder.id) || null;
        setSelectedOrder(refreshedSelectedOrder);
      }
    } catch {
      toast.error(isSilent ? "No se pudo actualizar pedidos" : "Error al cargar pedidos");
    } finally {
      if (!isSilent) setLoading(false);
      if (isSilent) setRefreshing(false);
    }
  }, [selectedOrder]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadOrdersRef.current = loadOrders;
  }, [loadOrders]);

  useEffect(() => {
    if (selectedOrder) {
      setReviewNote(selectedOrder.adminReviewNotes || "");
    }
  }, [selectedOrder]);

  useEffect(() => {
    const handleWindowFocus = () => {
      loadOrdersRef.current();
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  useEffect(() => {
    if (selectedOrder) return;
    const interval = window.setInterval(() => {
      loadOrders({ silent: true });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [selectedOrder, loadOrders]);

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
      } else {
        toast.error("Error al actualizar la orden");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating(false);
    }
  };

  const handleReviewAction = async (id: string, action: "approve" | "reject") => {
    if (selectedOrder?.provider !== "manual") {
      toast.error("La revisión manual solo aplica a órdenes con provider manual.");
      return;
    }

    const confirmMessage = action === "approve"
      ? "¿Aprobar el pago y marcar esta orden como pagada?"
      : "¿Rechazar el pago y devolver la orden a pendiente?";

    if (!confirm(confirmMessage)) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/orders/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminReviewNotes: reviewNote,
        }),
      });

      if (res.ok) {
        toast.success(action === "approve" ? "Pago aprobado" : "Pago rechazado");
        setSelectedOrder(null);
        loadOrders();
      } else {
        toast.error("Error al actualizar la revisión");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating(false);
    }
  };

  const clearCancelledOrders = async () => {
    if (!confirm("¿Deseas eliminar permanentemente TODAS las órdenes canceladas? Esta acción no se puede deshacer.")) return;
    
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/orders?bulk=cancelled", { method: "DELETE", cache: "no-store" });
      if (res.ok) {
        toast.success("Órdenes canceladas eliminadas correctamente");
        loadOrders();
      } else {
        toast.error("Error al eliminar órdenes");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating(false);
    }
  };

  const copyOrderNumber = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      toast.success("Número de pedido copiado");
    } catch {
      toast.error("No se pudo copiar el número");
    }
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

  if (selectedOrder) {
    const isCorporateOrder = selectedOrder.orderType === "corporate_employee_purchase";
    const isCorporatePaymentApproved =
      selectedOrder.paymentStatus === "paid" &&
      selectedOrder.adminReviewStatus === "approved";
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-500 blur-none">
         {/* Integrated Admin Dashboard Header */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setSelectedOrder(null)}
               className="h-10 w-10 flex items-center justify-center bg-white border border-border rounded-xl hover:bg-slate-50 transition-all group"
               >
                  <RefreshCw className="h-5 w-5 text-muted-foreground group-hover:rotate-180 transition-transform duration-500" />
               </button>
               <div>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2">
                       <h2 className="text-2xl font-black uppercase tracking-tighter" title={selectedOrder.orderNumber}>Pedido #{selectedOrder.orderNumber}</h2>
                       {isCorporateOrder && (
                         <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
                           <Building2 className="h-3.5 w-3.5" /> Corporativo
                         </span>
                       )}
                       <button
                         type="button"
                         onClick={() => copyOrderNumber(selectedOrder.orderNumber)}
                         className="text-[9px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-slate-900 hover:bg-slate-50"
                         title="Copiar número de pedido"
                       >
                         Copiar
                       </button>
                     </div>
                     {getStatusBadge(selectedOrder.orderStatus, selectedOrder.paymentStatus)}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">
                    {isCorporateOrder ? "Pedido corporativo" : "Logística de Despacho & CRM"}
                  </p>
               </div>
            </div>

            <button 
              onClick={() => setSelectedOrder(null)}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
               Volver al Listado
            </button>
         </div>

         <div className="bg-card w-full overflow-hidden rounded-[2rem] border border-border shadow-lg min-h-[70vh] flex flex-col">
            <div className="flex-1 p-6 lg:p-8">
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
                         Estado: {selectedOrder.paymentStatus === "paid" ? "Pagado" : selectedOrder.paymentStatus === "under_review" ? "En revisión" : selectedOrder.paymentStatus}
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
                       <div className="aspect-video max-w-md rounded-xl border border-border overflow-hidden bg-slate-100 cursor-zoom-in" onClick={() => window.open(selectedOrder.paymentProofUrl!, '_blank')}>
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img 
                           src={resolveImageSrc(selectedOrder.paymentProofUrl, "payment-proofs")} 
                           alt="Pago" 
                           className="object-contain w-full h-full p-2" 
                           onError={(e) => { if (e.currentTarget.src !== selectedOrder.paymentProofUrl) e.currentTarget.src = selectedOrder.paymentProofUrl!; }}
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
                           onClick={() => handleReviewAction(selectedOrder.id, "approve")}
                           className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                         >
                           Aprobar pago corporativo
                         </button>
                         <button
                           disabled={updating || !canAdminRejectManual(selectedOrder)}
                           onClick={() => handleReviewAction(selectedOrder.id, "reject")}
                           className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                         >
                           Rechazar pago
                         </button>
                       </div>
                     </div>
                   )}

                   {/* Approved / Rejected status */}
                   {selectedOrder.adminReviewStatus === "approved" && (
                     <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/50 p-5">
                       <div className="flex items-center gap-3">
                         <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                         <p className="font-black text-emerald-700">Pago aprobado</p>
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

               {/* ==================== NORMAL ORDER DETAIL ==================== */}
               {!isCorporateOrder && (
               <div className="grid grid-cols-1 lg:grid-cols-16 gap-6">
                  
                  {/* COL 1: Logistics & Delivery */}
                  <div className="lg:col-span-4 space-y-6">
                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Destinatario
                        </h3>
                        <div className="bg-muted/30 p-5 rounded-[1.75rem] border border-border/50 relative overflow-hidden group">
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
                           <div className="flex items-start gap-3 mb-4">
                              <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 flex-shrink-0">
                                 <Truck className="h-6 w-6" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">{selectedOrder.shippingCity || "Panamá"}</p>
                                 <p className="text-base font-bold leading-tight tracking-tight">{selectedOrder.shippingAddress || "Recojo en sucursal"}</p>
                              </div>
                           </div>
                           {selectedOrder.shippingNotes && (
                              <div className="p-3 bg-muted/50 rounded-xl border border-dashed border-border">
                                 <p className="text-[10px] font-bold text-muted-foreground italic leading-relaxed">&quot;{selectedOrder.shippingNotes}&quot;</p>
                              </div>
                           )}
                        </div>
                     </section>
                  </div>

                   {/* COL 2: Activation Info */}
                   <div className="lg:col-span-4 space-y-6 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[2rem] border border-border/60">
                      <section className="space-y-4">
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                            <div className="h-1.5 w-6 bg-primary rounded-full" />
                            Vinculación de Chips
                         </h3>
                         <div className="p-6 bg-indigo-50 rounded-[1.75rem] border border-indigo-100 shadow-inner space-y-3">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                               </div>
                               <p className="text-[11px] font-black uppercase tracking-widest text-indigo-800 leading-tight">Activación Automática</p>
                            </div>
                            <p className="text-xs font-medium text-indigo-700/70 leading-relaxed">
                               Los chips se vinculan automáticamente cuando el cliente activa su código desde su cuenta.
                            </p>
                            <div className="pt-2 space-y-2">
                               <div className="flex items-center gap-2 text-[10px] text-indigo-600/60 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                  Admin aprueba pago
                               </div>
                               <div className="flex items-center gap-2 text-[10px] text-indigo-600/60 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                  Cliente recibe producto físico
                               </div>
                               <div className="flex items-center gap-2 text-[10px] text-indigo-600/60 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                  Cliente activa con código → chip vinculado automáticamente
                               </div>
                            </div>
                         </div>
                      </section>
                   </div>

                  <div className="lg:col-span-4 space-y-6">
                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Revisión de Pago
                        </h3>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.75rem] border border-border shadow-sm space-y-3">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Método de Pago</p>
                              <p className="text-base font-black text-slate-900 dark:text-white">{selectedOrder.paymentMethod ? selectedOrder.paymentMethod.replace("_", " ").toUpperCase() : "Manual"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Referencia Manual</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white break-all">{selectedOrder.manualPaymentReference || "—"}</p>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-border">
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado de orden</p>
                                 <p className="text-sm font-bold uppercase mt-2">{selectedOrder.orderStatus}</p>
                              </div>
                              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-border">
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado de pago</p>
                                 <p className="text-sm font-bold uppercase mt-2">{selectedOrder.paymentStatus}</p>
                              </div>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Notas de revisión</p>
                              <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                className="w-full min-h-[90px] rounded-xl border border-border bg-slate-50 dark:bg-slate-950 p-3 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10"
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
                               <div className="flex flex-col gap-2 sm:flex-row">
                                 <button
                                    disabled={updating || !canAdminApproveManual(selectedOrder)}
                                   onClick={() => handleReviewAction(selectedOrder.id, "approve")}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                                 >
                                   Aprobar Pago
                                 </button>
                                 <button
                                    disabled={updating || !canAdminRejectManual(selectedOrder)}
                                   onClick={() => handleReviewAction(selectedOrder.id, "reject")}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                                 >
                                   Rechazar Pago
                                 </button>
                              </div>
                              </>
                           )}
                        </div>
                     </section>
                  </div>

                  {/* Personalización de accesorios */}
                  {selectedOrder.items.some(item => item.profile || 
                    ['sticker','llavero','tarjeta','credencial','brazalete'].includes(item.productType.toLowerCase())
                  ) && (
                    <div className="lg:col-span-4 space-y-6">
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

                  {/* COL 3: Summary & Evidence */}
                  <div className="lg:col-span-4 space-y-6">
                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Monto Total
                        </h3>
                        <div className="bg-slate-900 dark:bg-black p-6 rounded-[1.75rem] text-white shadow-lg">
                           <p className="text-4xl font-black tracking-tighter text-primary mb-1">${selectedOrder.amount.toFixed(2)}</p>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Dólares Americanos (USD)</p>
                        </div>
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                           <div className="h-1.5 w-6 bg-primary rounded-full" />
                           Comprobante
                        </h3>
                        {selectedOrder.paymentProofUrl ? (
                           <div className="aspect-video w-full rounded-[1.5rem] border border-border overflow-hidden bg-slate-100 shadow-sm cursor-zoom-in" onClick={() => window.open(selectedOrder.paymentProofUrl!, '_blank')}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={resolveImageSrc(selectedOrder.paymentProofUrl, "payment-proofs")} 
                                alt="Pago" 
                                className="object-contain w-full h-full p-2" 
                                onError={(e) => { if (e.currentTarget.src !== selectedOrder.paymentProofUrl) e.currentTarget.src = selectedOrder.paymentProofUrl!; }}
                              />
                           </div>
                        ) : (
                           <div className="p-6 rounded-[1.5rem] border-2 border-dashed border-border text-center text-muted-foreground">
                              <p className="text-xs font-black uppercase tracking-widest">Sin Comprobante</p>
                           </div>
                        )}
                     </section>
                  </div>

               </div>
               )}
            </div>

            {/* Action Bar */}
            {!isCorporateOrder && <div className="px-6 py-5 border-t border-border bg-muted/30 flex justify-between items-center gap-4">
               <div className="flex gap-4">
                  {selectedOrder.orderStatus === "cancelled" && (
                     <button onClick={async () => {
                        if(!confirm("¿Eliminar de forma permanente? No se puede deshacer.")) return;
                        setUpdating(true);
                        try {
                          const res = await fetch(`/api/admin/orders?id=${selectedOrder.id}`, { method: "DELETE", cache: "no-store" });
                          if (res.ok) { toast.success("Orden borrada"); setSelectedOrder(null); loadOrders(); }
                        } finally { setUpdating(false); }
                     }} disabled={updating} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all">
                        Eliminar Permanente
                     </button>
                  )}
                  {selectedOrder.orderStatus !== "cancelled" && selectedOrder.orderStatus !== "shipped" && selectedOrder.orderStatus !== "completed" && selectedOrder.provider !== "manual" && (
                    <button onClick={() => handleStatusChange(selectedOrder.id, "cancelled", "Cancelado")} disabled={updating} className="px-6 py-3 border border-red-500/20 text-red-500 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                      Declinar Orden
                    </button>
                  )}
               </div>
               
               <div className="flex gap-4">
                  {selectedOrder.orderStatus !== "shipped" && selectedOrder.orderStatus !== "completed" && selectedOrder.orderStatus !== "cancelled" && (
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
                  {selectedOrder.orderStatus === "shipped" && (
                     <button 
                        onClick={() => handleStatusChange(selectedOrder.id, "completed", "Completado")} 
                        disabled={updating} 
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all"
                      >
                        Confirmar Entrega Manual
                     </button>
                  )}
               </div>
            </div>}
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
            <button 
              onClick={clearCancelledOrders} 
              disabled={updating || loading}
              className="p-3 border border-red-100 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              title="Limpiar Cancelados"
            >
               <Trash2 className="h-4 w-4" />
               <span className="hidden sm:inline">Limpiar Cancelados</span>
            </button>
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
                           <p className="font-mono font-bold text-sm break-all" title={o.orderNumber}>#{o.orderNumber}</p>
                           {o.orderType === "corporate_employee_purchase" && (
                             <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest inline-flex items-center gap-1">
                               <Building2 className="h-3 w-3" /> Corporativo
                             </span>
                           )}
                           <button
                             type="button"
                             onClick={() => copyOrderNumber(o.orderNumber)}
                             className="text-[9px] px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-slate-900 hover:bg-slate-50"
                             title="Copiar número de pedido"
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
                             <p className="text-[10px] font-black uppercase text-muted-foreground">{o.items[0]?.productType || "Combo no especificado"}</p>
                             <p className="text-[10px] font-black uppercase text-muted-foreground">{o.items[0] ? `${o.items[0].quantity} chip${o.items[0].quantity === 1 ? "" : "s"} incluido${o.items[0].quantity === 1 ? "" : "s"}` : "0 chips incluidos"}</p>
                           </>
                         )}
                      </td>
                      <td className="p-3">
                         {getStatusBadge(o.orderStatus, o.paymentStatus)}
                         {o.paymentProofUrl && <p className="text-[9px] font-black text-emerald-600 uppercase mt-1">✓ Pago Subido</p>}
                      </td>
                      <td className="p-3 pr-5">
                         <button 
                           onClick={() => setSelectedOrder(o)}
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

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, View, CheckCircle2, Truck, RefreshCw, Trash2 } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ManualPaymentReview } from "@/app/(admin)/admin/_components/orders/ManualPaymentReview";
import { ChipAssignmentPanel } from "@/app/(admin)/admin/_components/orders/ChipAssignmentPanel";
import { toast } from "sonner";
import Link from "next/link";
import { canAdminApproveManual, canAdminRejectManual } from "@/lib/order-status";

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
  items: {
    id: string;
    productType: string;
    quantity: number;
    totalPrice: number;
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
}

interface InventoryChip {
  id: string;
  serialPublic: string;
  shortCode: string;
  internalLabel: string | null;
  isPhysical: boolean;
}

export function PedidosSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [inventory, setInventory] = useState<InventoryChip[]>([]);
  const [assignedChipIds, setAssignedChipIds] = useState<string[]>([]);
  const [searchInventory, setSearchInventory] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'under_review' | 'paid' | 'rejected' | 'completed'>('all');
  const loadOrdersRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const loadInventoryRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    loadOrders();
    loadInventory();
  }, []);

  useEffect(() => {
    loadOrdersRef.current = loadOrders;
    loadInventoryRef.current = loadInventory;
  }, [loadOrders, loadInventory]);

  async function loadInventory() {
    try {
      const res = await fetch(`/api/admin/chips/inventory?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setInventory(data.chips || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadOrders(options?: { silent?: boolean }) {
    const isSilent = options?.silent ?? false;
    if (!isSilent) setLoading(true);
    if (isSilent) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/orders?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      const nextOrders = data.orders || [];
      setOrders(nextOrders);
      if (selectedOrder?.id) {
        const updatedSelectedOrder = nextOrders.find((o: Order) => o.id === selectedOrder.id);
        if (updatedSelectedOrder) {
          setSelectedOrder(updatedSelectedOrder);
        }
      }
    } catch (e) {
      toast.error(isSilent ? "No se pudo actualizar pedidos" : "Error al cargar pedidos");
    } finally {
      if (!isSilent) setLoading(false);
      if (isSilent) setRefreshing(false);
    }
  }

  useEffect(() => {
    if (selectedOrder) {
      loadInventoryRef.current();
    }
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (selectedOrder) {
      setReviewNote(selectedOrder.adminReviewNotes || "");
    }
  }, [selectedOrder?.id, selectedOrder?.adminReviewNotes]);

  useEffect(() => {
    const handleWindowFocus = () => {
      loadOrdersRef.current();
      loadInventoryRef.current();
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
  }, [selectedOrder]);

  const calculateNeededChips = (order: Order) => {
    return order.items.reduce((sum, item) => sum + Math.max(0, item.quantity || 0), 0);
  };

  const handleStatusChange = async (id: string, newStatus: string, actionText: string) => {
    const isCompleted = newStatus === "completed";
    const needed = selectedOrder ? calculateNeededChips(selectedOrder) : 0;

    if (isCompleted && assignedChipIds.length !== needed && needed > 0) {
       if (!confirm(`Has seleccionado ${assignedChipIds.length} chips, pero el pedido requiere aproximadamente ${needed}. ¿Deseas continuar de todos modos?`)) return;
    } else {
       if (!confirm(`¿Estás seguro de marcar esta orden como '${actionText}'?`)) return;
    }
    
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
           generateTokens: isCompleted,
           assignedChipIds: isCompleted ? assignedChipIds : undefined
        }),
      });

      if (res.ok) {
        toast.success(`Orden actualizada a '${actionText}'`);
        setSelectedOrder(null);
        setAssignedChipIds([]);
        loadOrders();
        loadInventory();
      } else {
        toast.error("Error al actualizar la orden");
      }
    } catch (e) {
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
        body: JSON.stringify({ adminReviewNotes: reviewNote }),
      });

      if (res.ok) {
        toast.success(action === "approve" ? "Pago aprobado" : "Pago rechazado");
        setSelectedOrder(null);
        setAssignedChipIds([]);
        loadOrders();
        loadInventory();
      } else {
        toast.error("Error al actualizar la revisión");
      }
    } catch (e) {
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
    } catch (e) {
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


  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase text-xs tracking-widest animate-pulse">Cargando Pedidos...</p>
      </div>
    );
  }

  if (selectedOrder) {
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
                       <button
                         type="button"
                         onClick={() => copyOrderNumber(selectedOrder.orderNumber)}
                         className="text-[9px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-slate-900 hover:bg-slate-50"
                         title="Copiar número de pedido"
                       >
                         Copiar
                       </button>
                     </div>
                     <OrderStatusBadge
                       orderStatus={selectedOrder.orderStatus}
                       paymentStatus={selectedOrder.paymentStatus}
                       adminReviewStatus={selectedOrder.adminReviewStatus}
                       variant="admin"
                     />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Logística de Despacho & CRM</p>
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
                                 <p className="text-[10px] font-bold text-muted-foreground italic leading-relaxed">"{selectedOrder.shippingNotes}"</p>
                              </div>
                           )}
                        </div>
                     </section>
                  </div>

                  {/* COL 2: Fulfillment & Picking */}
                  <div className="lg:col-span-4 space-y-6 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[2rem] border border-border/60">
                    <ChipAssignmentPanel
                      orderStatus={selectedOrder.orderStatus}
                      purchasedChips={calculateNeededChips(selectedOrder)}
                      chipClaimTokens={selectedOrder.chipClaimTokens}
                      inventory={inventory}
                      assignedChipIds={assignedChipIds}
                      searchInventory={searchInventory}
                      onSearchChange={setSearchInventory}
                      onToggleChip={(chipId) => {
                        if (assignedChipIds.includes(chipId)) {
                          setAssignedChipIds((prev) => prev.filter((id) => id !== chipId));
                        } else if (assignedChipIds.length < calculateNeededChips(selectedOrder)) {
                          setAssignedChipIds((prev) => [...prev, chipId]);
                        } else {
                          toast.error(`Este pedido solo incluye ${calculateNeededChips(selectedOrder)} chips.`);
                        }
                      }}
                    />
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <ManualPaymentReview
                      order={selectedOrder}
                      reviewNote={reviewNote}
                      updating={updating}
                      onReviewNoteChange={setReviewNote}
                      onApprove={() => handleReviewAction(selectedOrder.id, "approve")}
                      onReject={() => handleReviewAction(selectedOrder.id, "reject")}
                    />
                  </div>

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
                              <img 
                                src={`/api/image-proxy?bucket=payment-proofs&path=${encodeURIComponent(selectedOrder.paymentProofUrl!.split('/').slice(-2).join('/'))}`} 
                                alt="Pago" 
                                className="object-contain w-full h-full p-2" 
                                onError={(e) => { e.currentTarget.src = selectedOrder.paymentProofUrl!; }}
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
            </div>

            {/* Action Bar */}
            <div className="px-6 py-5 border-t border-border bg-muted/30 flex justify-between items-center gap-4">
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
{selectedOrder.orderStatus !== "cancelled"
  && selectedOrder.orderStatus !== "shipped"
  && selectedOrder.orderStatus !== "completed"
  // OCULTAR botón PATCH para órdenes manuales
  && selectedOrder.provider !== "manual" && (
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
                          disabled={updating || assignedChipIds.length < calculateNeededChips(selectedOrder)} 
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
                        >
                           Marcar como Enviado
                        </button>
                        
                        <button 
                          onClick={() => handleStatusChange(selectedOrder.id, "completed", "Completado")} 
                          disabled={updating || assignedChipIds.length < calculateNeededChips(selectedOrder)} 
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
            </div>
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
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pending' },
              { id: 'under_review', label: 'Under Review' },
              { id: 'paid', label: 'Paid' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'completed', label: 'Completados' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
                      <td className="p-3 pl-5">
                         <div className="flex items-center gap-2">
                           <p className="font-mono font-bold text-sm break-all" title={o.orderNumber}>#{o.orderNumber}</p>
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
                         <p className="text-[10px] font-black uppercase text-muted-foreground">{o.items[0]?.productType || "Combo no especificado"}</p>
                         <p className="text-[10px] font-black uppercase text-muted-foreground">{o.items[0] ? `${o.items[0].quantity} chip${o.items[0].quantity === 1 ? "" : "s"} incluido${o.items[0].quantity === 1 ? "" : "s"}` : "0 chips incluidos"}</p>
                      </td>
                      <td className="p-3">
                          <OrderStatusBadge
                            orderStatus={o.orderStatus}
                            paymentStatus={o.paymentStatus}
                            adminReviewStatus={o.adminReviewStatus}
                            variant="admin"
                          />
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

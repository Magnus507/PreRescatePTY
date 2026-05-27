"use client";

import { useEffect, useState, Suspense } from "react";
import { 
  Package, Truck, CheckCircle2, AlertCircle, Clock, 
  ShoppingBag, QrCode, Banknote, Upload, Loader2 
} from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  productType: string;
  quantity: number;
  totalPrice: number;
}

interface ChipClaimToken {
  id: string;
  activationCode: string;
  chip: {
    serialPublic: string;
    shortCode: string;
  }
}

interface Order {
  id: string;
  orderNumber: string;
  amount: number;
  provider: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  manualPaymentReference: string | null;
  adminReviewStatus: string | null;
  paymentProofUrl: string | null;
  createdAt: string;
  items: OrderItem[];
  chipClaimTokens: ChipClaimToken[];
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingNotes: string | null;
}

function PedidosContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [paymentProofDraft, setPaymentProofDraft] = useState<Record<string, string>>({});
  const [paymentRefDraft, setPaymentRefDraft] = useState<Record<string, string>>({});
  
  // Shipping states for updates
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  
  // Dynamic instructions
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  useEffect(() => {
    loadOrders();
    loadPaymentConfig();
  }, []);

  async function loadPaymentConfig() {
    try {
      const res = await fetch("/api/public/config");
      const data = await res.json();
      if (data.configs) setPaymentConfig(data.configs);
    } catch (e) {
      console.error("Error loading payment config", e);
    }
  }

  async function loadOrders() {
    try {
      const res = await fetch(`/api/orders?_t=${Date.now()}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy pesado (máx 5MB)");
      return;
    }

    setUploadingFor(orderId);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "payment");
    formData.append("bucket", "payment-proofs");

    try {
      // 1. Optimize and Upload
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Error al procesar imagen");
      const { url } = await uploadRes.json();

      // 2. Register payment proof in manual flow endpoint
      const res = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentProofUrl: url,
          manualPaymentReference: paymentRefDraft[orderId] || undefined,
        }),
      });
      
      if (res.ok) {
        toast.success("Comprobante enviado. Tu pago está bajo revisión.");
        loadOrders();
      } else {
        toast.error("Error al actualizar el pedido");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al subir el comprobante");
    } finally {
      setUploadingFor(null);
    }
  };

  const handleSubmitReference = async (orderId: string) => {
    const manualPaymentReference = paymentRefDraft[orderId];
    const paymentProofUrl = paymentProofDraft[orderId];
    if (!manualPaymentReference && !paymentProofUrl) {
      toast.error("Ingresa referencia Yappy o URL de comprobante");
      return;
    }
    setUploadingFor(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualPaymentReference, paymentProofUrl }),
      });
      if (res.ok) {
        toast.success("Referencia/comprobante enviado. Pago bajo revisión.");
        loadOrders();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "No se pudo enviar la referencia");
      }
    } finally {
      setUploadingFor(null);
    }
  };

  const getStatusDisplay = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "rejected") {
      return { label: "Pago Rechazado", icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" };
    }
    if (paymentStatus === "under_review") {
      return { label: "Pago en Revisión", icon: Clock, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
    }
    if (paymentStatus === "paid") {
      return { label: "Pago Aprobado", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    }

    switch(status) {
      case "pending": return { label: "Esperando Pago", icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
      case "processing": return { label: "Trabajando en tu pedido", icon: ShoppingBag, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
      case "shipped": return { label: "En camino", icon: Truck, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" };
      case "completed": return { label: "Completado", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
      case "cancelled": return { label: "Cancelado", icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" };
      default: return { label: "Desconocido", icon: AlertCircle, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium tracking-tight uppercase text-[10px] tracking-widest">Cargando Historial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      <div>
        <h1 className="text-4xl font-black tracking-tighter mb-1 uppercase">Mis Pedidos</h1>
        <p className="text-muted-foreground font-medium">Rastrea tus stickers y paquetes de protección.</p>
      </div>

      <div className="max-w-4xl">
        {orders.length === 0 ? (
          <div className="py-24 rounded-[3.5rem] border-2 border-dashed border-border text-center flex flex-col items-center bg-slate-50/50">
            <Package className="h-16 w-16 text-muted-foreground/20 mb-6" />
            <p className="text-muted-foreground font-black uppercase text-xs tracking-widest">No tienes órdenes activas.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map(order => {
              const status = getStatusDisplay(order.orderStatus, order.paymentStatus);
              const StatusIcon = status.icon;
              const items = order.items ?? [];
              const isFinalCompactState =
                order.orderStatus === "cancelled" ||
                order.paymentStatus === "cancelled" ||
                order.paymentStatus === "rejected" ||
                order.adminReviewStatus === "rejected";
              const showManualPaymentBlock =
                order.provider === "manual" &&
                !isFinalCompactState &&
                (order.paymentStatus === "pending" || order.paymentStatus === "under_review");
              
              return (
                <div key={order.id} className={`border border-border bg-white shadow-xl shadow-black/[0.02] flex flex-col transition-all hover:shadow-2xl hover:shadow-black/[0.1] ${isFinalCompactState ? "p-6 sm:p-7 rounded-[2rem] gap-4" : "p-8 sm:p-10 rounded-[3.5rem] gap-8"}`}>
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between ${isFinalCompactState ? "gap-3" : "gap-6"}`}>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Pedido #{order.orderNumber.substring(0, 10)}</p>
                      <h3 className={`${isFinalCompactState ? "text-2xl" : "text-3xl"} font-black tracking-tighter`}>${order.amount.toFixed(2)}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">Pago: {(order.paymentMethod || "manual").replace("_", " ")}</p>
                    </div>
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${status.color}`}>
                      <StatusIcon className="h-5 w-5" />
                      <span className="text-xs font-black uppercase tracking-widest">{status.label}</span>
                    </div>
                  </div>
                  
                  {/* MANUAL FLOW P0 HARDENING */}
                  {showManualPaymentBlock && (
                    <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-border flex flex-col items-center gap-8 text-center">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        <div className="p-6 rounded-3xl bg-white border border-border flex flex-col items-center gap-3 shadow-sm transition-all hover:scale-[1.02]">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            {paymentConfig?.yappy_qr_url ? (
                              <img src={paymentConfig.yappy_qr_url} alt="QR" className="h-full w-full object-contain p-1" />
                            ) : (
                              <QrCode className="h-6 w-6" />
                            )}
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">YAPPY</p>
                          <p className="text-sm font-black text-indigo-600">{paymentConfig?.yappy_handle || "@PreRescue.ID"}</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-white border border-border flex flex-col items-center gap-3 shadow-sm transition-all hover:scale-[1.02]">
                          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Banknote className="h-6 w-6" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{paymentConfig?.bank_name || "BANCO GENERAL"}</p>
                          <p className="text-[11px] font-bold leading-tight">
                            {paymentConfig?.bank_account_type || "Cta Corriente"}: {paymentConfig?.bank_account_number || "03-72-01-..."}<br/>
                            {paymentConfig?.bank_account_name || "PreRescue ID PTY S.A."}
                          </p>
                        </div>
                      </div>

                      <div className="w-full space-y-4 px-4 py-2 border-y border-border/50 pt-6 text-left">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5" /> Información de Envío
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-muted-foreground ml-1">Ciudad / Área</p>
                            <input 
                              type="text" 
                              placeholder="Ej: David, Chiriquí" 
                              className="w-full bg-white border border-border rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                              defaultValue={order.shippingCity || ""}
                              onChange={(e) => setShippingCity(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-muted-foreground ml-1">Dirección Detallada</p>
                            <input 
                              type="text" 
                              placeholder="Calle, Edificio/Piso, # de Casa" 
                              className="w-full bg-white border border-border rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                              defaultValue={order.shippingAddress || ""}
                              onChange={(e) => setShippingAddress(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-1">
                          <p className="text-[9px] font-black uppercase text-muted-foreground ml-1">Referencias de entrega (Opcional)</p>
                          <textarea 
                            placeholder="Ej: Portón blanco, frente al parque..." 
                            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none min-h-[90px] resize-none"
                            defaultValue={order.shippingNotes || ""}
                            onChange={(e) => setShippingNotes(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4 w-full">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Referencia / comprobante de pago</p>
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Referencia Yappy / transferencia"
                            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-xs font-bold"
                            value={paymentRefDraft[order.id] ?? order.manualPaymentReference ?? ""}
                            onChange={(e) => setPaymentRefDraft((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          />
                          <input
                            type="text"
                            placeholder="URL comprobante (opcional)"
                            className="w-full bg-white border border-border rounded-xl px-4 py-3 text-xs font-bold"
                            value={paymentProofDraft[order.id] ?? order.paymentProofUrl ?? ""}
                            onChange={(e) => setPaymentProofDraft((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                          <label className="relative cursor-pointer bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex-1">
                            {uploadingFor === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploadingFor === order.id ? 'Subiendo...' : 'Subir Comprobante'}
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, order.id)} disabled={uploadingFor === order.id} />
                          </label>
                          <button 
                             onClick={() => handleSubmitReference(order.id)}
                             disabled={uploadingFor === order.id}
                             className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all min-w-[170px] disabled:opacity-50"
                          >
                             Enviar Referencia
                          </button>
                          <button 
                             onClick={async () => {
                               if(!confirm("¿Cancelar pedido?")) return;
                               setUploadingFor(order.id);
                               await fetch(`/api/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }), headers: { "Content-Type": "application/json" } });
                               toast.success("Cancelado"); loadOrders();
                               setUploadingFor(null);
                             }}
                             className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all min-w-[150px]"
                          >
                             Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  { (order.orderStatus === "completed" || order.orderStatus === "shipped") && order.chipClaimTokens.length > 0 && (
                    <div className="p-8 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 text-indigo-900">
                      <div className="flex items-center justify-between mb-6">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
                            {order.orderStatus === "shipped" ? <Truck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            {order.orderStatus === "shipped" ? "Códigos Disponibles (En Envío)" : "Códigos de Activación Listos"}
                         </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {order.chipClaimTokens.map(t => (
                          <div key={t.id} className="p-4 bg-white border border-indigo-200 rounded-[1.5rem] shadow-sm text-center transition-all hover:scale-[1.05]">
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1 tracking-widest">{t.chip.serialPublic}</p>
                            <p className="text-[10px] font-bold text-indigo-500/50 mt-1 uppercase tracking-widest italic">Activar con código físico</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                       {items.length} {items.length === 1 ? 'artículo' : 'artículos'} • {items.map(i => i.productType.replace('COMBO_', '')).join(', ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center uppercase font-black text-xs animate-pulse opacity-50">Cargando Pedidos...</div>}>
      <PedidosContent />
    </Suspense>
  );
}

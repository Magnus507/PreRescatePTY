"use client";

import { useEffect, useState, Suspense } from "react";
import { 
  Package, Truck, CheckCircle2, Upload, Loader2 
} from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { RejectionReasonBox } from "./_components/RejectionReasonBox";
import { PaymentInstructions } from "./_components/PaymentInstructions";
import { PaymentProofForm } from "./_components/PaymentProofForm";
import { toast } from "sonner";
import { canCustomerCancelManual, canSubmitManualProof, getOrderStatusLabel, isManualOrderFinal } from "@/lib/order-status";

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
  adminReviewNotes: string | null;
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

  const copyOrderNumber = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      toast.success("Número de pedido copiado");
    } catch {
      toast.error("No se pudo copiar el número");
    }
  };

  const handleCancel = async (orderId: string) => {
    if(!confirm("¿Cancelar pedido?")) return;
    setUploadingFor(orderId);
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }), headers: { "Content-Type": "application/json" } });
    toast.success("Cancelado"); loadOrders();
    setUploadingFor(null);
  };

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
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Error al actualizar el pedido");
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
    const label = getOrderStatusLabel(status, paymentStatus);
    return { label };
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
              const items = order.items ?? [];
              const isFinalCompactState = isManualOrderFinal(order) || order.orderStatus === "cancelled";
              const showManualPaymentBlock = canSubmitManualProof(order);
              
              return (
                <div key={order.id} className={`border border-border bg-white shadow-xl shadow-black/[0.02] flex flex-col transition-all hover:shadow-2xl hover:shadow-black/[0.1] ${isFinalCompactState ? "p-6 sm:p-7 rounded-[2rem] gap-4" : "p-8 sm:p-10 rounded-[3.5rem] gap-8"}`}>
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between ${isFinalCompactState ? "gap-3" : "gap-6"}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] break-all" title={order.orderNumber}>Pedido #{order.orderNumber}</p>
                        <button
                          type="button"
                          onClick={() => copyOrderNumber(order.orderNumber)}
                          className="text-[9px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-slate-900 hover:bg-slate-50"
                          title="Copiar número de pedido"
                        >
                          Copiar
                        </button>
                      </div>
                      <h3 className={`${isFinalCompactState ? "text-2xl" : "text-3xl"} font-black tracking-tighter`}>${order.amount.toFixed(2)}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">Pago: {(order.paymentMethod || "manual").replace("_", " ")}</p>
                    </div>
                    <OrderStatusBadge
                      orderStatus={order.orderStatus}
                      paymentStatus={order.paymentStatus}
                      variant="customer"
                    />
                  </div>

                  {(order.paymentStatus === "rejected" || order.adminReviewStatus === "rejected") && (
                    <RejectionReasonBox adminReviewNotes={order.adminReviewNotes} />
                  )}
                  
                  {/* MANUAL FLOW P0 HARDENING */}
                  {showManualPaymentBlock && (
                    <PaymentProofForm
                      order={{
                        id: order.id,
                        manualPaymentReference: order.manualPaymentReference,
                        paymentProofUrl: order.paymentProofUrl,
                        shippingAddress: order.shippingAddress,
                        shippingCity: order.shippingCity,
                        shippingNotes: order.shippingNotes,
                        canCancel: canCustomerCancelManual(order),
                      }}
                      uploadingFor={uploadingFor}
                      paymentRefDraft={paymentRefDraft}
                      paymentProofDraft={paymentProofDraft}
                      onRefChange={(oid, val) => setPaymentRefDraft((prev) => ({ ...prev, [oid]: val }))}
                      onProofUrlChange={(oid, val) => setPaymentProofDraft((prev) => ({ ...prev, [oid]: val }))}
                      onUpload={handleFileUpload}
                      onSubmitReference={handleSubmitReference}
                      onCancel={handleCancel}
                      onShippingChange={{
                        address: setShippingAddress,
                        city: setShippingCity,
                        notes: setShippingNotes,
                      }}
                      paymentInstructions={<PaymentInstructions paymentConfig={paymentConfig} />}
                    />
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
                      {items.length > 0
                        ? `${items[0].productType} • ${items[0].quantity} chip${items[0].quantity === 1 ? "" : "s"} incluido${items[0].quantity === 1 ? "" : "s"}`
                        : "Combo no especificado"}
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

"use client";

import { useEffect, useState, Suspense } from "react";
import { 
  Package, Truck, CheckCircle2, Upload, Loader2 
} from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { RejectionReasonBox } from "./_components/RejectionReasonBox";
import { PaymentInstructions } from "./_components/PaymentInstructions";
import { PaymentProofForm } from "./_components/PaymentProofForm";
import { YappyPaymentButton } from "@/components/payments/YappyPaymentButton";
import { toast } from "sonner";
import { canCustomerCancelManual, canSubmitManualProof, isManualOrderFinal } from "@/lib/order-status";

interface OrderItem {
  id: string;
  productType: string;
  quantity: number;
  totalPrice: number;
  profileId?: string | null;
  chipId?: string | null;
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
  total?: number | null;
  commercialTotal?: number | null;
  provider: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  manualPaymentReference: string | null;
  adminReviewStatus: string | null;
  adminReviewNotes: string | null;
  paymentProofUrl: string | null;
  customerFulfillmentSummary?: {
    hasBackorder: boolean;
    productionEstimateDays: number;
    customerMessage: string | null;
  } | null;
  createdAt: string;
  items: OrderItem[];
  chipClaimTokens: ChipClaimToken[];
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingNotes: string | null;
  customerPhone: string | null;
}

interface PaymentConfig {
  yappy_qr_url?: string | null;
  yappy_handle?: string | null;
  bank_name?: string | null;
  bank_account_type?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
}

function PedidosContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [paymentProofDraft, setPaymentProofDraft] = useState<Record<string, string>>({});
  const [paymentRefDraft, setPaymentRefDraft] = useState<Record<string, string>>({});
  
  // Shipping states for updates
  const [, setShippingAddress] = useState("");
  const [, setShippingCity] = useState("");
  const [, setShippingNotes] = useState("");
  
  // Dynamic instructions
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

  const formatMoney = (value: number | null | undefined) => `$${(Number(value) || 0).toFixed(2)}`;
  const getPositiveMoneyValue = (...values: Array<number | null | undefined>) => {
    for (const value of values) {
      const normalized = Number(value);
      if (Number.isFinite(normalized) && normalized > 0) return normalized;
    }
    return 0;
  };
  const toSafeDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : null;
    }
    return null;
  };
  const formatDateSafe = (value: unknown, fallback = "Sin fecha") => {
    const date = toSafeDate(value);
    if (!date) return fallback;
    return date.toLocaleDateString("es-PA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

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
    } catch {
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
    const order = orders.find(o => o.id === orderId);
    if (order && (order.orderStatus === "shipped" || order.orderStatus === "completed")) {
      toast.error("Este pedido ya fue procesado y no puede cancelarse desde el panel.");
      return;
    }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="h-16 w-16 rounded-[1.75rem] bg-white border border-slate-200 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#DA1A21]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-slate-900">Cargando pedidos</p>
          <p className="text-xs font-medium text-slate-500">Preparamos tu seguimiento, estados y comprobantes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      <div className="rounded-[2rem] bg-white border border-slate-200 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.2)] px-6 py-8 sm:px-8 sm:py-10">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <Truck className="h-3.5 w-3.5 text-[#DA1A21]" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Seguimiento premium</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-950 text-balance">
              Mis pedidos
            </h1>
            <p className="max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-slate-500">
              Revisa el estado de cada pedido, su pago manual y el avance operativo desde una sola vista clara.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl">
        {orders.length === 0 ? (
          <div className="py-24 rounded-[2rem] border border-dashed border-slate-200 text-center flex flex-col items-center bg-white shadow-[0_24px_80px_-60px_rgba(15,23,42,0.18)]">
            <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 border border-slate-200 flex items-center justify-center mb-6">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">No tienes pedidos todavía.</p>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">
              Cuando realices una compra, aquí verás su seguimiento, comprobantes y estados operativos.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map(order => {
              const items = order.items ?? [];
              const isFinalCompactState = isManualOrderFinal(order) || order.orderStatus === "cancelled";
              const isYappyOrder = order.paymentMethod === "yappy";
              const showManualPaymentBlock = !isYappyOrder && canSubmitManualProof(order);
              
              return (
                <div key={order.id} className={`group border border-slate-200 bg-white shadow-[0_24px_80px_-55px_rgba(15,23,42,0.22)] flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] ${isFinalCompactState ? "p-6 sm:p-7 rounded-[2rem] gap-4" : "p-7 sm:p-8 rounded-[2.25rem] gap-7"}`}>
                  <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${isFinalCompactState ? "gap-3" : "gap-6"}`}>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] break-all" title={order.orderNumber}>Pedido #{order.orderNumber}</p>
                        <button
                          type="button"
                          onClick={() => copyOrderNumber(order.orderNumber)}
                          className="text-[9px] px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                          title="Copiar número de pedido"
                          aria-label={`Copiar número de pedido ${order.orderNumber}`}
                        >
                          Copiar
                        </button>
                      </div>
                      <h3 className={`${isFinalCompactState ? "text-2xl" : "text-3xl"} font-black tracking-tighter text-slate-950`}>{formatMoney(getPositiveMoneyValue(order.total, order.commercialTotal, order.amount))}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        <span>{formatDateSafe(order.createdAt)}</span>
                        <span>Pago: {(order.paymentMethod || "manual").replace("_", " ")}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <OrderStatusBadge
                        orderStatus={order.orderStatus}
                        paymentStatus={order.paymentStatus}
                        variant="customer"
                        className="rounded-full px-4 sm:px-5 py-3 sm:py-3.5 border-slate-200 bg-slate-50 text-slate-900 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.28)]"
                      />
                    </div>
                  </div>

                  {order.customerFulfillmentSummary && (
                    <div className="rounded-[2rem] border border-sky-200 bg-sky-50/70 p-5 sm:p-6 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-700">Producción estimada</p>
                          <p className="text-sm font-bold text-slate-900 leading-relaxed">
                            {order.customerFulfillmentSummary.customerMessage || "Si tu pedido supera el stock disponible, producción estimada: 2 semanas."}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 mt-1">
                            Backorder visible · estimado {order.customerFulfillmentSummary.productionEstimateDays} días
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(order.paymentStatus === "rejected" || order.adminReviewStatus === "rejected") && (
                    <RejectionReasonBox adminReviewNotes={order.adminReviewNotes} />
                  )}

                  {isYappyOrder && order.paymentStatus === "pending" && order.orderStatus !== "cancelled" && (
                    <YappyPaymentButton
                      orderId={order.id}
                      initialPhone={order.customerPhone}
                      onPaymentUpdate={loadOrders}
                    />
                  )}
                  
                  {/* MANUAL FLOW — pending: full form, under_review: compact summary */}
                  {showManualPaymentBlock && order.paymentStatus === "pending" && (
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

                  {/* UNDER REVIEW — compact summary */}
                  {showManualPaymentBlock && order.paymentStatus === "under_review" && (
                    <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-200 space-y-4 shadow-[0_16px_40px_-30px_rgba(16,185,129,0.35)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-full border border-emerald-200 mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Comprobante Enviado</span>
                          </div>
                          <h3 className="text-lg font-black text-slate-950 tracking-tight">Pago en revisión</h3>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            Tu comprobante está siendo verificado por el equipo de PreRescate.
                          </p>
                        </div>
                      </div>
                      <PaymentInstructions paymentConfig={paymentConfig} />
                      {order.paymentProofUrl && (
                        <div className="flex flex-wrap gap-3 pt-2">
                          <a
                            href={order.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-50"
                          >
                            <Upload className="h-4 w-4" /> Ver comprobante
                          </a>
                        </div>
                      )}
                      {order.manualPaymentReference && (
                        <div className="p-3 rounded-2xl bg-emerald-100/50 border border-emerald-200">
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-0.5">Referencia de pago</p>
                          <p className="text-sm font-bold text-slate-900">{order.manualPaymentReference}</p>
                        </div>
                      )}
                      <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700 mb-1">Comprobante</p>
                        <p className="text-sm font-medium text-slate-600">
                          Puedes volver a subir tu comprobante desde esta tarjeta o desde el mismo pedido si necesitas actualizarlo.
                        </p>
                      </div>
                    </div>
                  )}

                  { (order.orderStatus === "completed" || order.orderStatus === "shipped") && order.chipClaimTokens.length > 0 && (
                    <div className="p-6 sm:p-7 rounded-[2rem] bg-indigo-50 border border-indigo-100 text-indigo-900 shadow-[0_16px_40px_-30px_rgba(99,102,241,0.35)]">
                      <div className="flex items-center justify-between mb-5">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
                            {order.orderStatus === "shipped" ? <Truck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            {order.orderStatus === "shipped" ? "Códigos Disponibles (En Envío)" : "Códigos de Activación Listos"}
                         </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {order.chipClaimTokens.map(t => (
                          <div key={t.id} className="p-4 bg-white border border-indigo-200 rounded-[1.5rem] shadow-[0_12px_30px_-24px_rgba(99,102,241,0.3)] text-center transition-all hover:-translate-y-0.5">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">{t.chip.serialPublic}</p>
                            <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest">Activar con código físico</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items detail — accesorios personalizados */}
                  <div className="space-y-4 pt-5 border-t border-slate-100">
                    {items.map((item) => {
                      const hasProfile = !!item.profile;
                      const hasChip = !!item.chip?.shortCode;
                      return (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50/60 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-black text-slate-900">{item.productType}</span>
                              <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">x{item.quantity}</span>
                              <span className="text-[10px] font-bold text-slate-500">${(item.totalPrice || 0).toFixed(2)}</span>
                            </div>

                            {/* Personalized for a profile */}
                            {hasProfile && item.profile && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                                <span className="text-indigo-700 font-semibold">
                                  Personalizado para: {item.profile.firstName} {item.profile.lastName}
                                  {item.profile.displayNamePublic && (
                                    <span className="text-muted-foreground ml-1">({item.profile.displayNamePublic})</span>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Chip / QR info */}
                            {hasChip && item.chip && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  QR: /e/{item.chip.shortCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const url = `${window.location.origin}/e/${item.chip!.shortCode}`;
                                    try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
                                    catch { toast.error("No se pudo copiar"); }
                                  }}
                                  className="text-[9px] px-2 py-0.5 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
                                >
                                  Copiar link
                                </button>
                                <a
                                  href={`/e/${item.chip.shortCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] px-2 py-0.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                                >
                                  Abrir ficha
                                </a>
                              </div>
                            )}

                            {/* Profile exists but no chip */}
                            {hasProfile && !hasChip && (
                              <div className="mt-1.5">
                                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  Este accesorio aún no tiene chip/QR asociado.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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

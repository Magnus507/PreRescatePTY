"use client";

import Link from "next/link";
import { Loader2, CheckCircle2, Clock, Users, XCircle, MapPin } from "lucide-react";

// Types
type MemberProfile = {
  firstName?: string;
  lastName?: string;
  user?: { email?: string } | null;
};

type CorporateOrderItem = {
  id: string;
  organizationMemberId: string;
  quantity: number;
  subtotal?: number;
  fulfillmentStatus?: string | null;
  chip?: { shortCode?: string } | null;
  activatedAt?: string | null;
  product?: { id?: string; name?: string };
  organizationMember?: {
    profile?: MemberProfile | null;
    employeePosition?: string | null;
    employeeDepartment?: string | null;
    employeeNationalId?: string | null;
  };
};

type CorporateOrder = {
  id: string;
  paymentStatus?: string;
  adminReviewStatus?: string;
  orderType?: string;
  orderStatus?: string;
  orderNumber?: string;
  amount?: number;
  createdAt?: string;
  corporateEmployeeItems?: CorporateOrderItem[];
  paymentProofUrl?: string;
  corporateDeliveryStatus?: string;
  estimatedDeliveryDate?: string;
  deliveryNote?: string;
};

interface EnterpriseOrdersSectionProps {
  corporateOrders: CorporateOrder[];
  cancellingOrder: string | null;
  onCancelOrder: (orderId: string) => Promise<void>;
  initialStatusFilter?: string;
}

export default function EnterpriseOrdersSection({
  corporateOrders,
  cancellingOrder,
  onCancelOrder,
  initialStatusFilter,
}: EnterpriseOrdersSectionProps) {
  const statusFilter = initialStatusFilter || "all";

  const pendingOrders = corporateOrders.filter(
    (o) => o.paymentStatus === "under_review" || o.adminReviewStatus === "pending"
  );
  const processedOrders = corporateOrders.filter(
    (o) => o.adminReviewStatus === "approved" || o.paymentStatus === "rejected"
  );

  if (pendingOrders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border p-5 bg-amber-50/30 border-amber-200 space-y-2">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Compras corporativas enviadas con comprobante y pendientes de revisión por PreRescue ID.
          </p>
          <p className="text-[10px] text-amber-700/70 leading-relaxed">
            Los colaboradores incluidos en estas órdenes <strong>Aprobado pendiente</strong> hasta que PreRescue ID apruebe o cancele el pago.
            Si el pago es aprobado, pasarán directamente a <strong>Pagados / activos</strong>.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Clock className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-slate-700 mb-1">Sin pagos enviados pendientes</p>
          <p className="text-sm text-muted-foreground">Todas las compras corporativas han sido procesadas o aún no se han enviado.</p>
        </div>
        {processedOrders.length > 0 && statusFilter === "all" && (
          <ProcessedOrdersSection processedOrders={processedOrders} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-5 bg-amber-50/30 border-amber-200 space-y-2">
        <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Compras corporativas enviadas con comprobante y pendientes de revisión por PreRescue ID.
        </p>
        <p className="text-[10px] text-amber-700/70 leading-relaxed">
          Los colaboradores incluidos en estas órdenes <strong>Aprobado pendiente</strong> hasta que PreRescue ID apruebe o cancele el pago.
          Si el pago es aprobado, pasarán directamente a <strong>Pagados / activos</strong>.
        </p>
      </div>
      {pendingOrders.map((order) => {
        const totalMembers = new Set(
          (order.corporateEmployeeItems || []).map((item) => item.organizationMemberId).filter(Boolean)
        ).size;
        const memberNames = [
          ...new Set(
            (order.corporateEmployeeItems || []).map(
              (item) =>
                `${item.organizationMember?.profile?.firstName || ""} ${item.organizationMember?.profile?.lastName || ""}`
            ).filter(Boolean)
          ),
        ];
        return (
          <div
            key={order.id}
            className="rounded-[2rem] border border-blue-200/50 bg-white shadow-lg shadow-blue-500/5 overflow-hidden transition-all hover:shadow-xl"
          >
            {/* Order header */}
            <div className="p-5 md:p-6 bg-gradient-to-r from-blue-50/50 to-white border-b border-blue-100/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black">
                      #
                    </div>
                    <p className="font-black text-lg tracking-tight">Orden {order.orderNumber}</p>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200/50">
                      En revisión
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 ml-1">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("es-PA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Total
                    </p>
                    <p className="text-2xl font-black text-primary">
                      ${order.amount?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Collaborators included — visible by default */}
            <div className="p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-black text-blue-900 uppercase tracking-wider">
                    {totalMembers} {totalMembers === 1 ? "colaborador incluido" : "colaboradores incluidos"}
                  </p>
                </div>
                {memberNames.length > 0 && (
                  <p className="text-[10px] text-muted-foreground italic truncate max-w-[200px] md:max-w-none">
                    {memberNames.join(", ")}
                  </p>
                )}
              </div>

              {/* Detailed item list */}
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {/* Header row */}
                <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  <span className="flex-[2]">Colaborador</span>
                  <span className="flex-1">Cédula</span>
                  <span className="flex-[2]">Producto</span>
                  <span className="w-16 text-center">Cant.</span>
                  <span className="w-24 text-right">Subtotal</span>
                </div>
                {order.corporateEmployeeItems?.map((item, idx: number) => {
                  const m = item.organizationMember;
                  const name = m?.profile
                    ? `${m.profile.firstName || ""} ${m.profile.lastName || ""}`.trim()
                    : "—";
                  return (
                    <div
                      key={item.id}
                      className="px-4 md:px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex-[2] flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                          {m?.employeePosition && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {m.employeePosition}
                              {m?.employeeDepartment ? ` · ${m.employeeDepartment}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 text-xs text-muted-foreground">
                        {m?.employeeNationalId || "—"}
                      </div>
                      <div className="flex-[2] text-xs font-medium text-slate-700">
                        {item.product?.name || "Producto"}
                      </div>
                      <div className="w-16 text-center text-sm font-bold text-slate-800">
                        x{item.quantity || 1}
                      </div>
                      <div className="w-24 text-right text-sm font-bold text-primary">
                        ${item.subtotal?.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment proof & delivery status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  {order.paymentProofUrl && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Comprobante adjuntado
                    </div>
                  )}
                  {order.corporateDeliveryStatus && (
                    <span
                      className={`px-3 py-1.5 rounded-xl border text-[10px] font-semibold ${
                        order.corporateDeliveryStatus === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {order.corporateDeliveryStatus === "delivered"
                        ? "✅ Entregado por PreRescue"
                        : "⏳ Pendiente de entrega por PreRescue"}
                    </span>
                  )}
                  {order.estimatedDeliveryDate && (
                    <span className="px-3 py-1.5 rounded-xl border bg-slate-50 text-slate-600 text-[10px] font-semibold">
                      Est: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {order.deliveryNote && (
                    <span className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">
                      &ldquo;{order.deliveryNote}&rdquo;
                    </span>
                  )}
                  <button
                    onClick={() => onCancelOrder(order.id)}
                    disabled={cancellingOrder === order.id}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold hover:bg-rose-100 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {cancellingOrder === order.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    Cancelar compra
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {statusFilter === "all" || statusFilter === "approved" || statusFilter === "rejected" ? (
        <ProcessedOrdersSection processedOrders={processedOrders} statusFilter={statusFilter} />
      ) : null}
    </div>
  );
}

function ProcessedOrdersSection({
  processedOrders,
  statusFilter,
}: {
  processedOrders: CorporateOrder[];
  statusFilter?: string;
}) {
  const approvedOrders = processedOrders.filter((o) => o.adminReviewStatus === "approved");
  const rejectedOrders = processedOrders.filter((o) => o.paymentStatus === "rejected");

  const ordersToShow = statusFilter === "approved" ? approvedOrders : statusFilter === "rejected" ? rejectedOrders : processedOrders;
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-2">
        Mostrar {processedOrders.length} orden(es) procesada(s)
      </summary>
      <div className="mt-3 space-y-3">
        {ordersToShow.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Orden #{order.orderNumber}</p>
                <p className="text-[10px] text-muted-foreground">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {order.adminReviewStatus === "approved" && order.corporateDeliveryStatus === "delivered" && (
                  <Link
                    href={`/dashboard/pedidos-corporativos/${order.id}/distribucion`}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" />
                    Distribución
                  </Link>
                )}
                <span
                  className={`px-2 py-1 rounded-full text-[9px] font-bold border ${
                    order.adminReviewStatus === "approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {order.adminReviewStatus === "approved" ? "✅ Aprobado" : "❌ Rechazado"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
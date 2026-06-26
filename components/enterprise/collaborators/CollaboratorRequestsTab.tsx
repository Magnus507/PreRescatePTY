"use client";

import { CorporateKitData } from "./types";
import { Loader2, FileText, Package } from "lucide-react";

interface CollaboratorRequestsTabProps {
  kitData: CorporateKitData | null;
  kitLoading: boolean;
  kitError: string | null;
  onRetry: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_company_approval: { label: "Pendiente de aprobación", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  approved_pending_payment: { label: "Aprobada", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  payment_under_review: { label: "Pago en revisión", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  paid_approved: { label: "Pagada / aprobada", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  rejected_by_company: { label: "Rechazada", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  cancelled: { label: "Cancelada", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

export default function CollaboratorRequestsTab({ kitData, kitLoading, kitError, onRetry }: CollaboratorRequestsTabProps) {
  if (kitLoading) {
    return (
      <div className="py-12 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando solicitudes...</p>
      </div>
    );
  }

  if (kitError) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
        <p className="text-sm font-semibold text-red-700">{kitError}</p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!kitData || !kitData.productRequests || kitData.productRequests.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          Este colaborador no tiene solicitudes de productos registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Solicitudes de productos</h3>
      <div className="space-y-3">
        {kitData.productRequests.map((req) => {
          const config = STATUS_CONFIG[req.status] || { label: req.status, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
          return (
            <div key={req.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Solicitud #{req.id.slice(-6)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
              </div>

              <div className="space-y-2">
                {req.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{item.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.product.productType}</p>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        ×{item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
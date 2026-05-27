"use client";

import { canAdminApproveManual, canAdminRejectManual } from "@/lib/order-status";

interface Order {
  id: string;
  provider: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  manualPaymentReference: string | null;
  adminReviewStatus: string | null;
  adminReviewNotes: string | null;
}

interface ManualPaymentReviewProps {
  order: Order;
  reviewNote: string;
  updating: boolean;
  onReviewNoteChange: (val: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * Payment review section for manual orders.
 * Shows payment method, reference, statuses, review notes, and approve/reject buttons.
 */
export function ManualPaymentReview({
  order,
  reviewNote,
  updating,
  onReviewNoteChange,
  onApprove,
  onReject,
}: ManualPaymentReviewProps) {
  return (
    <section className="space-y-4">
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
        <div className="h-1.5 w-6 bg-primary rounded-full" />
        Revisión de Pago
      </h3>
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.75rem] border border-border shadow-sm space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Método de Pago</p>
          <p className="text-base font-black text-slate-900 dark:text-white">
            {order.paymentMethod ? order.paymentMethod.replace("_", " ").toUpperCase() : "Manual"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Referencia Manual</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white break-all">{order.manualPaymentReference || "—"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado de orden</p>
            <p className="text-sm font-bold uppercase mt-2">{order.orderStatus}</p>
          </div>
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Estado de pago</p>
            <p className="text-sm font-bold uppercase mt-2">{order.paymentStatus}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Notas de revisión</p>
          <textarea
            value={reviewNote}
            onChange={(e) => onReviewNoteChange(e.target.value)}
            className="w-full min-h-[90px] rounded-xl border border-border bg-slate-50 dark:bg-slate-950 p-3 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10"
            placeholder="Agrega una observación para la aprobación o rechazo..."
          />
        </div>
        {order.adminReviewStatus === "rejected" && (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
              Motivo de rechazo: {order.adminReviewNotes?.trim() || "No especificado"}
            </p>
          </div>
        )}
        {order.provider === "manual" && canAdminApproveManual(order) && (
          <>
            <p className="text-[10px] text-amber-700 font-semibold">Recomendado: indique el motivo del rechazo.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                disabled={updating || !canAdminApproveManual(order)}
                onClick={onApprove}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                Aprobar Pago
              </button>
              <button
                disabled={updating || !canAdminRejectManual(order)}
                onClick={onReject}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
              >
                Rechazar Pago
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
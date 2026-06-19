"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface PaymentConfirmModalProps {
  type: "approve" | "reject";
  orderNumber: string;
  note: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
  onNoteChange: (note: string) => void;
}

export const PaymentConfirmModal: React.FC<PaymentConfirmModalProps> = ({
  type,
  orderNumber,
  note,
  onConfirm,
  onCancel,
  isProcessing,
  onNoteChange,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    cancelButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  const handleConfirm = async () => {
    setError(null);
    if (type === "reject" && !note.trim()) {
      setError("Indique el motivo del rechazo.");
      return;
    }
    try {
      await onConfirm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el pago";
      setError(message);
    }
  };

  const isApprove = type === "approve";

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onCancel();
      }}
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        aria-describedby="payment-modal-desc"
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-border p-6 shadow-2xl my-[15vh] sm:my-auto max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isApprove ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
              {isApprove ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <h2 id="payment-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
              {isApprove ? "Aprobar pago" : "Rechazar pago"}
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Cancelar"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div id="payment-modal-desc" className="mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {isApprove
              ? "Confirma que el comprobante y el monto fueron revisados correctamente."
              : "Confirma el rechazo del pago. El motivo quedará registrado en el pedido."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Pedido: <span className="font-mono font-black text-slate-900 dark:text-white">#{orderNumber}</span>
          </p>
        </div>

        {/* Note field (required for reject, optional for approve) */}
        <div className="mb-4">
          <label htmlFor="review-note" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Nota de revisión {!isApprove && <span className="text-red-600">*</span>}
          </label>
          <textarea
            id="review-note"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            disabled={isProcessing}
            placeholder={isApprove ? "Nota opcional..." : "Indique el motivo del rechazo..."}
            aria-required={!isApprove}
            aria-invalid={!isApprove && !note.trim()}
            aria-describedby={!isApprove && !note.trim() ? "review-note-error" : undefined}
            className="w-full min-h-[80px] rounded-xl border border-border bg-slate-50 dark:bg-slate-950 p-3 text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
          />
          {!isApprove && !note.trim() && (
            <p id="review-note-error" className="text-xs text-red-600 mt-1 font-semibold">
              Indique el motivo del rechazo.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs font-bold text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-5 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center gap-2 ${
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : isApprove ? (
              "Aprobar pago"
            ) : (
              "Rechazar pago"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
};

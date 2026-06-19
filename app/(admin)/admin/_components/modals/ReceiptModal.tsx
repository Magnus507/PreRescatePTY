"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, ExternalLink, Download, FileText } from "lucide-react";

interface ReceiptModalProps {
  receiptUrl: string | null;
  orderNumber: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receiptUrl,
  orderNumber,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const firstFocusable = modal.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
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
  }, [onClose]);

  const handleDownload = async () => {
    if (!receiptUrl) return;
    try {
      const response = await fetch(receiptUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante-pedido-${orderNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(receiptUrl, "_blank");
    }
  };

  const isImage = receiptUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(receiptUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 id="receipt-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
              Comprobante de pago
            </h2>
            <span className="text-xs text-muted-foreground font-mono">#{orderNumber}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {receiptUrl ? (
            <div className="flex flex-col items-center gap-4">
              {isImage && !imageError ? (
                <img
                  src={receiptUrl}
                  alt={`Comprobante de pago del pedido ${orderNumber}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl border border-border"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm font-black uppercase tracking-widest">No se adjuntó comprobante de pago</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {receiptUrl && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
            <button
              onClick={() => window.open(receiptUrl, "_blank")}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 min-h-[44px]"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir en nueva pestaña
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2 min-h-[44px]"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
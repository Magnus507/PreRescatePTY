"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  chip: {
    id: string;
    shortCode: string;
    internalLabel?: string | null;
  };
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  chip,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Focus cancel button initially (safe default)
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
    try {
      await onConfirm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el chip";
      setError(message);
    }
  };

  const displayLabel = chip.internalLabel || chip.shortCode;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-border p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 id="delete-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
              Eliminar chip disponible
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Cancelar eliminación"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div id="delete-modal-desc" className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Vas a eliminar el chip <span className="font-mono font-black text-slate-900 dark:text-white">{displayLabel}</span>.
            Esta acción solo está permitida para chips sin uso, sin asignaciones y sin historial. No se puede deshacer.
          </p>
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
            disabled={isDeleting}
            className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-3 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar definitivamente"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
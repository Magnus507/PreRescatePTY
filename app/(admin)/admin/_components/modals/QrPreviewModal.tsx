"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Download, X, Copy, Check, AlertCircle } from "lucide-react";
import { getChipPublicUrl, getChipCanonicalUrl } from "../../_utils/chip-url";

interface QrPreviewModalProps {
  shortCode: string;
  internalLabel?: string | null;
  isPhysical: boolean;
  onClose: () => void;
}

export const QrPreviewModal: React.FC<QrPreviewModalProps> = ({
  shortCode,
  internalLabel,
  isPhysical,
  onClose,
}) => {
  const qrApiUrl = `/api/public/qr?data=${encodeURIComponent(getChipCanonicalUrl(shortCode))}`;
  const publicUrl = getChipPublicUrl(shortCode);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus close button initially
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silent fail - user can manually copy
      }
      document.body.removeChild(textArea);
    }
  }, [publicUrl]);

  const handleDownloadPng = useCallback(async () => {
    setDownloadStatus("downloading");
    try {
      const response = await fetch(qrApiUrl);
      if (!response.ok) throw new Error("Failed to fetch QR");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedCode = shortCode.replace(/[^a-zA-Z0-9_-]/g, "");
      a.download = `prerescue-${sanitizedCode}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus("done");
      setTimeout(() => setDownloadStatus("idle"), 2000);
    } catch {
      setDownloadStatus("error");
      setTimeout(() => setDownloadStatus("idle"), 3000);
    }
  }, [qrApiUrl, shortCode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-border p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="qr-modal-title" className="text-lg font-black text-slate-900 dark:text-white">
            QR del Chip
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Public ID */}
        <div className="text-center mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            ID Público
          </p>
          <p className="font-mono text-xl font-black tracking-widest text-slate-900 dark:text-white">
            {shortCode}
          </p>
        </div>

        {/* Chip type */}
        <div className="text-center mb-4">
          <span
            className={`inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
              isPhysical
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isPhysical ? "Físico" : "Digital"}
          </span>
          {internalLabel && (
            <span className="ml-2 text-xs text-slate-400 font-mono">
              {internalLabel}
            </span>
          )}
        </div>

        {/* QR Image */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-4 mb-4 flex items-center justify-center min-h-[200px]">
          {!imageLoaded && !imageError && (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
          {imageError ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <AlertCircle className="h-8 w-8" />
              <p className="text-xs font-bold">Error al cargar QR</p>
              <button
                onClick={() => {
                  setImageError(false);
                  setImageLoaded(false);
                }}
                className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <img
              src={qrApiUrl}
              alt={`QR code for chip ${shortCode}`}
              width={240}
              height={240}
              className={`max-w-full h-auto ${imageLoaded ? "opacity-100" : "opacity-0 absolute"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
        </div>

        {/* Encoded URL info */}
        <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            URL codificada en el QR:
          </p>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
            {publicUrl}
          </p>
        </div>

        {/* Security disclaimer */}
        <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
            Este QR contiene únicamente el enlace público permanente del chip. No contiene el código de activación.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={downloadStatus === "downloading"}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors min-h-[44px]"
            aria-label="Descargar QR como PNG"
          >
            {downloadStatus === "downloading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : downloadStatus === "done" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloadStatus === "downloading"
              ? "Descargando..."
              : downloadStatus === "done"
              ? "Descargado"
              : "Descargar PNG"}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
            aria-label="Copiar enlace del chip"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>
        </div>
      </div>
    </div>
  );
};
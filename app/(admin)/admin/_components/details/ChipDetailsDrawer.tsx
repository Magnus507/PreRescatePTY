"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Copy, Check, ExternalLink, Cpu, Package, Activity, ShoppingCart, Wrench } from "lucide-react";
import { getChipPublicUrl } from "../../_utils/chip-url";
import type { ChipAdmin } from "../../_types/admin";

// Extended type matching what InventorySection provides
interface ChipDetailData extends ChipAdmin {
  activationCode?: string;
  updatedAt?: string;
  latestToken?: {
    orderId?: string | null;
    usedAt?: string | null;
    expiresAt?: string | null;
    createdAt?: string | null;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
  } | null;
  customer?: {
    name: string | null;
    email: string | null;
  } | null;
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface ChipDetailsDrawerProps {
  chip: ChipDetailData;
  onClose: () => void;
  formatDate: (value?: string | null) => string;
  formatDateTime: (value?: string | null) => string;
}

export const ChipDetailsDrawer: React.FC<ChipDetailsDrawerProps> = ({
  chip,
  onClose,
  formatDate,
  formatDateTime,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const publicUrl = getChipPublicUrl(chip.shortCode);

  // Focus trap and keyboard handling
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const copyToClipboard = useCallback(async (value: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        // Silent
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const safeValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (value === "null" || value === "undefined" || value === "NaN") return "";
    return String(value);
  };

  const displayValue = (value: unknown, fallback = "—"): string => {
    const v = safeValue(value);
    return v || fallback;
  };

  const activationCode = chip.activationCode || chip.claimTokens?.[0]?.activationCode || null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-drawer-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-border z-10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="details-drawer-title" className="text-lg font-black text-slate-900 dark:text-white">
              Detalle del Chip
            </h2>
            <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
              {chip.shortCode}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar detalle"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* A. Identification */}
          <section>
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-4">
              <Cpu className="h-3.5 w-3.5" /> Identificación
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Etiqueta interna"
                value={displayValue(chip.internalLabel)}
                copyValue={chip.internalLabel || undefined}
                onCopy={copyToClipboard}
                copiedField={copiedField}
                fieldName="internalLabel"
              />
              <DetailRow
                label="ID Público"
                value={chip.shortCode}
                copyValue={chip.shortCode}
                onCopy={copyToClipboard}
                copiedField={copiedField}
                fieldName="shortCode"
              />
              <DetailRow
                label="Código de activación"
                value={displayValue(activationCode)}
                copyValue={activationCode || undefined}
                onCopy={copyToClipboard}
                copiedField={copiedField}
                fieldName="activationCode"
                mono
              />
            </div>
          </section>

          {/* B. Traceability */}
          <section>
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4">
              <Package className="h-3.5 w-3.5" /> Trazabilidad
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Serial"
                value={displayValue(chip.serialPublic)}
                copyValue={chip.serialPublic}
                onCopy={copyToClipboard}
                copiedField={copiedField}
                fieldName="serial"
                mono
              />
              <DetailRow
                label="Lote"
                value={displayValue(chip.batchId)}
                copyValue={chip.batchId || undefined}
                onCopy={copyToClipboard}
                copiedField={copiedField}
                fieldName="batch"
              />
            </div>
          </section>

          {/* C. Lifecycle */}
          <section>
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-4">
              <Activity className="h-3.5 w-3.5" /> Ciclo de Vida
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Estado"
                value={chip.status}
                badge
              />
              <DetailRow
                label="Tipo"
                value={chip.isPhysical ? "Físico" : "Digital"}
                badge={chip.isPhysical ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}
              />
              <DetailRow
                label="URL Pública Permanente"
                value={publicUrl}
                copyValue={publicUrl}
                onCopy={copyToClipboard}
                copiedField={copiedField}
                fieldName="publicUrl"
                mono
              />
              <DetailRow
                label="Fecha de creación"
                value={formatDate(chip.createdAt)}
              />
              <DetailRow
                label="Fecha de activación"
                value={chip.activatedAt ? formatDate(chip.activatedAt) : "—"}
              />
              {chip.serviceEndDate && (
                <DetailRow
                  label="Vencimiento servicio"
                  value={formatDate(chip.serviceEndDate)}
                />
              )}
            </div>
          </section>

          {/* D. Commercial Relationship */}
          <section>
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4">
              <ShoppingCart className="h-3.5 w-3.5" /> Relación Comercial
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Orden relacionada"
                value={chip.order?.orderNumber || "—"}
              />
              <DetailRow
                label="Cliente"
                value={chip.customer?.name || chip.customer?.email || "—"}
              />
              {chip.pointOfSale && (
                <DetailRow
                  label="Punto de venta"
                  value={chip.pointOfSale.name}
                />
              )}
              {chip.consignedAt && (
                <DetailRow
                  label="Consignado desde"
                  value={formatDateTime(chip.consignedAt)}
                />
              )}
              {chip.owner?.email && (
                <DetailRow
                  label="Propietario"
                  value={chip.owner.email}
                />
              )}
              {chip.profile && (
                <DetailRow
                  label="Perfil vinculado"
                  value={`${chip.profile.firstName} ${chip.profile.lastName}`}
                />
              )}
            </div>
          </section>

          {/* E. Technical Actions */}
          <section>
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
              <Wrench className="h-3.5 w-3.5" /> Acciones Técnicas
            </h3>
            <div className="space-y-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-[11px] font-bold"
              >
                <span>Abrir página pública del chip</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

// ─── Detail Row Sub-component ────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (value: string, fieldName: string) => void;
  copiedField?: string | null;
  fieldName?: string;
  mono?: boolean;
  badge?: string | boolean;
}

function DetailRow({
  label,
  value,
  copyValue,
  onCopy,
  copiedField,
  fieldName,
  mono,
  badge,
}: DetailRowProps) {
  const isCopied = copiedField === fieldName;

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex-shrink-0 mr-4">
        {label}
      </span>
      <div className="flex items-center gap-2 text-right">
        {badge ? (
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
              typeof badge === "string"
                ? badge
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {value}
          </span>
        ) : (
          <span
            className={`text-xs font-bold text-slate-900 dark:text-white break-all max-w-[200px] ${
              mono ? "font-mono" : ""
            }`}
          >
            {value}
          </span>
        )}
        {copyValue && onCopy && fieldName && (
          <button
            onClick={() => onCopy(copyValue, fieldName)}
            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
              isCopied
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
            aria-label={`Copiar ${label.toLowerCase()}`}
            title={`Copiar ${label.toLowerCase()}`}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
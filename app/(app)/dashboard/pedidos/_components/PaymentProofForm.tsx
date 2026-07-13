"use client";

import { Upload, Loader2 } from "lucide-react";
import { Truck } from "lucide-react";

interface Order {
  id: string;
  manualPaymentReference: string | null;
  paymentProofUrl: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingNotes: string | null;
  canCancel: boolean;
}

interface PaymentProofFormProps {
  order: Order;
  uploadingFor: string | null;
  paymentRefDraft: Record<string, string>;
  paymentProofDraft: Record<string, string>;
  onRefChange: (orderId: string, value: string) => void;
  onProofUrlChange: (orderId: string, value: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => void;
  onSubmitReference: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onShippingChange: {
    address: (val: string) => void;
    city: (val: string) => void;
    notes: (val: string) => void;
  };
  /** Element injected in place of payment instructions (Yappy / bank) */
  paymentInstructions: React.ReactNode;
}

/**
 * Payment proof upload / reference form for manual orders.
 * Handlers remain in the parent page – this component only receives props & callbacks.
 */
export function PaymentProofForm({
  order,
  uploadingFor,
  paymentRefDraft,
  paymentProofDraft,
  onRefChange,
  onProofUrlChange,
  onUpload,
  onSubmitReference,
  onCancel,
  onShippingChange,
  paymentInstructions,
}: PaymentProofFormProps) {
  const fileInputId = `payment-proof-file-${order.id}`;

  return (
    <div className="p-6 sm:p-8 rounded-[2rem] bg-slate-50 border border-slate-200 flex flex-col items-center gap-8 text-center shadow-[0_20px_60px_-45px_rgba(15,23,42,0.22)]">
      {/* Payment methods */}
      {paymentInstructions}

      {/* Shipping info */}
      <div className="w-full space-y-4 px-0 py-2 border-y border-slate-200/80 pt-6 text-left">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
          <Truck className="h-3.5 w-3.5" /> Información de Envío
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Ciudad / Área</p>
            <input
              type="text"
              placeholder="Ej: David, Chiriquí"
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#DA1A21]/15 focus:border-[#DA1A21]/30 transition-all outline-none"
              defaultValue={order.shippingCity || ""}
              onChange={(e) => onShippingChange.city(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Dirección Detallada</p>
            <input
              type="text"
              placeholder="Calle, Edificio/Piso, # de Casa"
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#DA1A21]/15 focus:border-[#DA1A21]/30 transition-all outline-none"
              defaultValue={order.shippingAddress || ""}
              onChange={(e) => onShippingChange.address(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Referencias de entrega (Opcional)</p>
          <textarea
            placeholder="Ej: Portón blanco, frente al parque..."
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#DA1A21]/15 focus:border-[#DA1A21]/30 transition-all outline-none min-h-[90px] resize-none"
            defaultValue={order.shippingNotes || ""}
            onChange={(e) => onShippingChange.notes(e.target.value)}
          />
        </div>
      </div>

      {/* Reference / proof fields */}
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em]">
          Referencia / comprobante de pago
        </p>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Referencia Yappy / transferencia"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#DA1A21]/15 focus:border-[#DA1A21]/30 outline-none"
            value={paymentRefDraft[order.id] ?? order.manualPaymentReference ?? ""}
            onChange={(e) => onRefChange(order.id, e.target.value)}
            aria-label="Referencia de pago Yappy o transferencia"
          />
          <input
            type="text"
            placeholder="URL comprobante (opcional)"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#DA1A21]/15 focus:border-[#DA1A21]/30 outline-none"
            value={paymentProofDraft[order.id] ?? order.paymentProofUrl ?? ""}
            onChange={(e) => onProofUrlChange(order.id, e.target.value)}
            aria-label="URL del comprobante de pago"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <input
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onUpload(e, order.id)}
            disabled={uploadingFor === order.id}
            aria-label="Seleccionar archivo de comprobante"
          />
          <label
            htmlFor={fileInputId}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const input = document.getElementById(fileInputId) as HTMLInputElement | null;
                input?.click();
              }
            }}
            className="bg-[#DA1A21] text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#DA1A21]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            aria-label="Seleccionar archivo de comprobante"
            aria-disabled={uploadingFor === order.id}
          >
            {uploadingFor === order.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploadingFor === order.id ? "Subiendo..." : "Subir Comprobante"}
          </label>
          <button
            onClick={() => onSubmitReference(order.id)}
            disabled={uploadingFor === order.id}
            className="px-8 py-4 bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all min-w-[170px] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            aria-label="Enviar referencia de pago"
          >
            Enviar Referencia
          </button>
          <button
            onClick={() => onCancel(order.id)}
            disabled={!order.canCancel}
            className="px-8 py-4 bg-red-50 text-red-700 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all min-w-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            aria-label="Cancelar pedido"
          >
            Cancelar
          </button>
        </div>
        <p className="text-[10px] font-semibold text-slate-500">
          Formatos permitidos: JPG, PNG o WEBP
        </p>
        <div className="w-full max-w-md text-left space-y-2">
          <p className="text-[10px] font-semibold text-slate-500">
            Si el botón no abre, selecciona el archivo aquí
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onUpload(e, order.id)}
            disabled={uploadingFor === order.id}
            className="block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
            aria-label="Seleccionar archivo de comprobante (fallback)"
          />
        </div>
      </div>
    </div>
  );
}

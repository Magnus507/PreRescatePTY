"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Upload, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

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
  onRefChange: (orderId: string, value: string) => void;
  onSubmitReference: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  paymentInstructions: React.ReactNode;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function PaymentProofForm({
  order,
  uploadingFor,
  paymentRefDraft,
  onRefChange,
  onSubmitReference,
  onCancel,
  paymentInstructions,
}: PaymentProofFormProps) {
  const fileInputId = `payment-proof-file-${order.id}`;
  const [directUploading, setDirectUploading] = useState(false);
  const isUploading = uploadingFor === order.id || directUploading;

  const handleDirectUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Solo se permiten comprobantes JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      toast.error("El comprobante debe pesar como máximo 5MB.");
      event.target.value = "";
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublicKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabasePublicKey) {
      toast.error("El almacenamiento de comprobantes no está disponible.");
      event.target.value = "";
      return;
    }

    setDirectUploading(true);
    try {
      const signedRes = await fetch(`/api/orders/${order.id}/payment-proof/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, size: file.size }),
      });
      const signedData = await signedRes.json().catch(() => ({}));
      if (!signedRes.ok || !signedData?.path || !signedData?.token) {
        throw new Error(signedData?.error || "No se pudo preparar la carga del comprobante");
      }

      const supabase = createClient(supabaseUrl, supabasePublicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .uploadToSignedUrl(signedData.path, signedData.token, file, {
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "No se pudo subir el comprobante");
      }

      const registerRes = await fetch(`/api/orders/${order.id}/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentProofPath: signedData.path,
          manualPaymentReference: paymentRefDraft[order.id]?.trim() || undefined,
        }),
      });
      const registerData = await registerRes.json().catch(() => ({}));
      if (!registerRes.ok) {
        throw new Error(registerData?.error || "El archivo subió, pero no se pudo asociar al pedido");
      }

      toast.success("Comprobante enviado. Tu pago está bajo revisión.");
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir el comprobante";
      console.error("PAYMENT_PROOF_DIRECT_UPLOAD_ERROR", error);
      toast.error(message);
    } finally {
      setDirectUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-[2rem] bg-slate-50 border border-slate-200 flex flex-col items-center gap-8 text-center shadow-[0_20px_60px_-45px_rgba(15,23,42,0.22)]">
      {paymentInstructions}

      <div className="w-full space-y-4 px-0 py-2 border-y border-slate-200/80 pt-6 text-left">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" /> Destino registrado
          </h4>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            Guardado con el pedido
          </span>
        </div>
        <p className="text-[10px] font-semibold text-slate-500">
          Estos datos son la dirección de entrega confirmada al crear el pedido. Subir un comprobante no modifica tu perfil ni cambia el destino.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ciudad / Área</p>
            <p className="mt-2 text-xs font-bold text-slate-900">{order.shippingCity || "Sin ciudad registrada"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Dirección exacta</p>
            <p className="mt-2 text-xs font-bold text-slate-900">{order.shippingAddress || "Sin dirección registrada"}</p>
          </div>
        </div>
        {order.shippingNotes && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Referencias de entrega</p>
            <p className="mt-2 text-xs font-bold text-slate-900">{order.shippingNotes}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em]">
          Referencia / comprobante de pago
        </p>
        <input
          type="text"
          placeholder="Referencia Yappy / transferencia (opcional si subes imagen)"
          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#DA1A21]/15 focus:border-[#DA1A21]/30 outline-none"
          value={paymentRefDraft[order.id] ?? order.manualPaymentReference ?? ""}
          onChange={(e) => onRefChange(order.id, e.target.value)}
          aria-label="Referencia de pago Yappy o transferencia"
        />
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <input
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleDirectUpload}
            disabled={isUploading}
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
            className="bg-[#DA1A21] text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#DA1A21]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA1A21]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            aria-label="Seleccionar archivo de comprobante"
            aria-disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "Subiendo..." : "Subir Comprobante"}
          </label>
          <button
            type="button"
            onClick={() => onSubmitReference(order.id)}
            disabled={isUploading}
            className="px-8 py-4 bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all min-w-[170px] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            aria-label="Enviar referencia de pago"
          >
            Enviar Referencia
          </button>
          <button
            type="button"
            onClick={() => onCancel(order.id)}
            disabled={!order.canCancel || isUploading}
            className="px-8 py-4 bg-red-50 text-red-700 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all min-w-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:opacity-50"
            aria-label="Cancelar pedido"
          >
            Cancelar
          </button>
        </div>
        <p className="text-[10px] font-semibold text-slate-500">
          Formatos permitidos: JPG, PNG o WEBP · máximo 5MB. El archivo se carga directamente al almacenamiento privado del pedido.
        </p>
        <div className="w-full max-w-md text-left space-y-2">
          <p className="text-[10px] font-semibold text-slate-500">Si el botón no abre, selecciona el archivo aquí</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleDirectUpload}
            disabled={isUploading}
            className="block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
            aria-label="Seleccionar archivo de comprobante (fallback)"
          />
        </div>
      </div>
    </div>
  );
}
